const crypto = require('crypto');
const DynamicSeed = require('../models/DynamicSeed');
const User = require('../models/User');
const { hashFlag, signAuditPayload } = require('../utils/crypto');
const { writeAudit } = require('../middleware/auditLogger');

// Room definitions — aap yahan apne rooms add karo
const ROOMS = {
  'tier1-recon': {
    tier: 1,
    title: 'Basic Reconnaissance',
    objective: 'Identify target infrastructure',
    briefing: 'Aap ko ek simulated target mila hai. Uske open ports aur services identify karein.',
    durationSec: 3600,
    flagSalt: 'recon_2024',
  },
  'tier2-web': {
    tier: 2,
    title: 'Web Enumeration',
    objective: 'Find the hidden endpoint',
    briefing: 'Web application mein ek hidden endpoint hai. Usay dhundhein.',
    durationSec: 3600,
    flagSalt: 'web_2024',
  },
};

/**
 * Room start — per-user dynamic seed generate karta hai.
 */
async function startRoom(req, res) {
  const { roomId } = req.params;
  const room = ROOMS[roomId];
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });

  const userId = req.user.id;

  // Agar already active seed hai to wahi do
  let seed = await DynamicSeed.findOne({ userId, roomId });
  if (seed && seed.expiresAt > new Date()) {
    return res.json(serializeRoom(room, seed, roomId));
  }

  // Naya seed generate karo
  const targetIP = `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
  const targetHash = crypto.randomBytes(16).toString('hex');
  const flagPlain = `${room.flagSalt}_${crypto.randomBytes(4).toString('hex')}`;
  const flagHash = hashFlag(userId, flagPlain);

  seed = await DynamicSeed.findOneAndUpdate(
    { userId, roomId },
    {
      userId, roomId, mode: 'simulated',
      targetIP, targetHash, flagHash,
      expiresAt: new Date(Date.now() + room.durationSec * 1000),
    },
    { upsert: true, new: true }
  );

  await writeAudit(req, 'ROOM_START', { roomId });
  return res.json(serializeRoom(room, seed, roomId));
}

/**
 * Flag submit — HMAC hash compare karta hai.
 */
async function submitFlag(req, res) {
  const { roomId, flag } = req.body;
  if (!roomId || !flag || typeof flag !== 'string' || flag.length > 200) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const userId = req.user.id;
  const seed = await DynamicSeed.findOne({ userId, roomId });
  if (!seed) return res.status(404).json({ error: 'ROOM_NOT_STARTED' });
  if (seed.expiresAt < new Date()) {
    return res.status(410).json({ error: 'ROOM_EXPIRED' });
  }

  const submittedHash = hashFlag(userId, flag);
  const correct = submittedHash === seed.flagHash;

  if (correct) {
    // Score update
    const Leaderboard = require('../models/Leaderboard');
    await Leaderboard.findOneAndUpdate(
      { userId },
      {
        $inc: { score: 100 },
        $set: { updatedAt: new Date() },
        $addToSet: { 'tierProgress.completed': ROOMS[roomId]?.tier },
      },
      { upsert: true }
    );
    // Seed consume karo
    await DynamicSeed.deleteOne({ _id: seed._id });
  }

  await writeAudit(req, 'FLAG_SUBMIT', {
    roomId,
    correct,
    flagHash: submittedHash,
  });

  return res.json({ correct });
}

function serializeRoom(room, seed, roomId) {
  return {
    roomId,
    tier: room.tier,
    title: room.title,
    objective: room.objective,
    briefing: room.briefing,
    expiresAt: seed.expiresAt,
    mapNodes: [
      { id: 'n1', x: 80, y: 100, label: 'Target', ip: seed.targetIP, connections: ['n2'] },
      { id: 'n2', x: 200, y: 150, label: 'Service', hash: seed.targetHash, connections: ['n3'] },
      { id: 'n3', x: 320, y: 100, label: 'Endpoint', hint: 'Look closer at headers', connections: [] },
    ],
  };
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = { startRoom, submitFlag, ROOMS };