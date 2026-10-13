import crypto from "node:crypto";

export interface MapNode {
  id: string;
  x: number;
  y: number;
  label: string;
  ip?: string;
  hash?: string;
  hint?: string;
  details?: string[];
  connections: string[];
}

interface Generated {
  targetIp: string;
  targetHash: string;
  clues: Record<string, unknown>;
  flag: string;
}

export interface RoomDef {
  tier: number;
  title: string;
  objective: string;
  briefing: string;
  difficulty: "easy" | "medium" | "hard";
  durationSec: number;
  points: number;
  generate(): Generated;
  nodes(seed: { targetIp: string | null; targetHash: string | null; clues: any }): MapNode[];
}

const rand = (min: number, max: number) => crypto.randomInt(min, max + 1);
const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];
const hex = (bytes: number) => crypto.randomBytes(bytes).toString("hex");
const randomIp = () => `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const CITIES = [
  { name: "lahore", lat: 31.5497, lon: 74.3436 },
  { name: "karachi", lat: 24.8607, lon: 67.0011 },
  { name: "islamabad", lat: 33.6844, lon: 73.0479 },
  { name: "peshawar", lat: 34.0151, lon: 71.5249 },
  { name: "gaza", lat: 31.5017, lon: 34.4668 },
  { name: "istanbul", lat: 41.0082, lon: 28.9784 },
  { name: "cairo", lat: 30.0444, lon: 31.2357 },
  { name: "dubai", lat: 25.2048, lon: 55.2708 },
  { name: "london", lat: 51.5072, lon: -0.1276 },
  { name: "tokyo", lat: 35.6762, lon: 139.6503 },
];

const toDms = (deg: number, pos: string, neg: string) => {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  return `${d}° ${m}' ${s}" ${deg >= 0 ? pos : neg}`;
};

const WORDLIST = [
  "sunshine", "dragon", "letmein", "pakistan1", "shadow", "football",
  "monkey", "qwerty123", "password1", "falcon", "cricket", "welcome",
];

// Room definitions — add new rooms here. Rooms unlock tier by tier.
export const ROOMS: Record<string, RoomDef> = {
  "tier1-recon": {
    tier: 1,
    title: "Basic Reconnaissance",
    objective: "Find the port running the exposed admin panel",
    briefing:
      "Aap ko ek simulated target mila hai. Map par nodes click karke scan results dekhein, " +
      "aur woh port dhoondein jis par admin panel chal raha hai.\n\nFlag format: OSINT{ip:port}",
    difficulty: "easy",
    durationSec: 3600,
    points: 100,
    generate() {
      const targetIp = randomIp();
      const adminPort = rand(8000, 9999);
      const ports = shuffle([
        { port: 22, service: "ssh OpenSSH 8.9" },
        { port: 80, service: "http nginx 1.24" },
        { port: 443, service: "https nginx 1.24" },
        { port: 3306, service: "mysql (filtered)" },
        { port: adminPort, service: "http admin-panel v2.1" },
      ]);
      return { targetIp, targetHash: hex(16), clues: { ports }, flag: `OSINT{${targetIp}:${adminPort}}` };
    },
    nodes({ targetIp, targetHash, clues }) {
      return [
        { id: "n1", x: 70, y: 150, label: "Target", ip: targetIp!, details: ["Status: host is up (0.012s latency)"], connections: ["n2"] },
        {
          id: "n2", x: 200, y: 80, label: "Port Scan", hash: targetHash!,
          details: ["PORT     STATE  SERVICE", ...(clues.ports as any[]).map((p) => `${String(p.port).padEnd(8)} open   ${p.service}`)],
          connections: ["n3"],
        },
        { id: "n3", x: 320, y: 170, label: "Notes", hint: "Admin panels often hide on high, non-standard ports.", connections: [] },
      ];
    },
  },

  "tier2-web": {
    tier: 2,
    title: "Web Enumeration",
    objective: "Find the hidden endpoint",
    briefing:
      "Web application mein ek hidden endpoint hai. HTTP response ko ghaur se dekhein — " +
      "developer ne debug info chhor di hai.\n\nFlag format: OSINT{/path}",
    difficulty: "easy",
    durationSec: 3600,
    points: 200,
    generate() {
      const path = `/internal-${hex(3)}`;
      return {
        targetIp: randomIp(),
        targetHash: hex(16),
        clues: { encoded: Buffer.from(path).toString("base64"), etag: hex(8) },
        flag: `OSINT{${path}}`,
      };
    },
    nodes({ targetIp, targetHash, clues }) {
      return [
        { id: "n1", x: 70, y: 100, label: "Web Server", ip: targetIp!, details: ["GET / HTTP/1.1", "Host: portal.target.lab"], connections: ["n2"] },
        { id: "n2", x: 200, y: 180, label: "robots.txt", hash: targetHash!, details: ["User-agent: *", "Disallow: /admin", "Disallow: /backup"], connections: ["n3"] },
        {
          id: "n3", x: 320, y: 100, label: "Response Headers",
          details: [
            "HTTP/1.1 200 OK",
            "Server: nginx/1.24.0",
            "X-Powered-By: Express",
            `ETag: W/"${clues.etag}"`,
            `X-Debug-Route: ${clues.encoded}`,
            "Cache-Control: no-store",
          ],
          hint: "Look closer at headers — one value is encoded (Base64).",
          connections: [],
        },
      ];
    },
  },

  "tier3-geo": {
    tier: 3,
    title: "Image Geolocation",
    objective: "Find the city where the photo was taken",
    briefing:
      "Ek leaked photo ka metadata (EXIF) mila hai. GPS coordinates se city pehchanein.\n\n" +
      "Flag format: OSINT{city} (English mein, e.g. OSINT{paris})",
    difficulty: "medium",
    durationSec: 3600,
    points: 300,
    generate() {
      const city = pick(CITIES);
      const jitter = () => (rand(-200, 200) / 10000);
      return {
        targetIp: randomIp(),
        targetHash: hex(16),
        clues: { lat: toDms(city.lat + jitter(), "N", "S"), lon: toDms(city.lon + jitter(), "E", "W"), file: `IMG_${rand(1000, 9999)}.jpg` },
        flag: `OSINT{${city.name}}`,
      };
    },
    nodes({ targetIp, targetHash, clues }) {
      return [
        { id: "n1", x: 70, y: 160, label: "Leak Source", ip: targetIp!, details: ["Anonymous file share", `File: ${clues.file}`], connections: ["n2"] },
        {
          id: "n2", x: 200, y: 90, label: "EXIF Data", hash: targetHash!,
          details: ["Make: Samsung", "Model: SM-A546E", "DateTimeOriginal: 2026:03:14 17:42:09", `GPSLatitude: ${clues.lat}`, `GPSLongitude: ${clues.lon}`],
          connections: ["n3"],
        },
        { id: "n3", x: 320, y: 170, label: "Notes", hint: "Convert the coordinates and search them on any map service.", connections: [] },
      ];
    },
  },

  "tier4-creds": {
    tier: 4,
    title: "Credential Leak Analysis",
    objective: "Recover the leaked password from its hash",
    briefing:
      "Ek breach dump mein admin ka password hash mila hai, aur saath mein ek chhoti wordlist. " +
      "Hash type pehchanein aur sahi password dhoondein.\n\nFlag format: OSINT{password}",
    difficulty: "hard",
    durationSec: 3600,
    points: 400,
    generate() {
      const words = shuffle(WORDLIST).slice(0, 8);
      const password = pick(words);
      return {
        targetIp: randomIp(),
        targetHash: crypto.createHash("sha256").update(password).digest("hex"),
        clues: { words },
        flag: `OSINT{${password}}`,
      };
    },
    nodes({ targetIp, targetHash, clues }) {
      return [
        { id: "n1", x: 70, y: 100, label: "Breach Dump", ip: targetIp!, details: ["user: admin", "hash_len: 64 hex chars", "salt: none"], connections: ["n2"] },
        { id: "n2", x: 200, y: 180, label: "Admin Hash", hash: targetHash!, details: [targetHash!], connections: ["n3"] },
        { id: "n3", x: 320, y: 100, label: "Wordlist", details: clues.words as string[], hint: "64 hex characters is typical of SHA-256.", connections: [] },
      ];
    },
  },
};

export const MAX_TIER = Math.max(...Object.values(ROOMS).map((r) => r.tier));

export const roomSummary = (roomId: string, room: RoomDef) => ({
  roomId,
  tier: room.tier,
  title: room.title,
  objective: room.objective,
  difficulty: room.difficulty,
  points: room.points,
  durationSec: room.durationSec,
});

/** A room is unlocked when every lower tier has been completed. */
export const isUnlocked = (room: RoomDef, completedTiers: number[]) =>
  Object.values(ROOMS).every((r) => r.tier >= room.tier || completedTiers.includes(r.tier));
