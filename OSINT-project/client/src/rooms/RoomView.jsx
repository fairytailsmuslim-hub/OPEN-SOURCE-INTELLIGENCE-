import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Timer from './Timer';
import FlagSubmit from './FlagSubmit';
import OSINTMap from '../map/OSINTMap';

export default function RoomView({ roomId }) {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get(`/rooms/${roomId}`)
      .then((res) => mounted && setRoom(res.data))
      .catch((err) => mounted && setError(err.response?.data?.error || 'NETWORK'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [roomId]);

  if (loading) return <div className="p-8 text-center">{t('auth.loggingIn')}</div>;
  if (error) return <div className="p-8 text-red-500">{t('errors.network')}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {t('rooms.tier')} {room.tier} — {room.title}
        </h1>
        <Timer
          expiresAt={room.expiresAt}
          onExpire={() => setExpired(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <OSINTMap nodes={room.mapNodes} />
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl mb-3">{room.objective}</h2>
          <p className="text-slate-300 whitespace-pre-line">{room.briefing}</p>
          {!expired && <FlagSubmit roomId={roomId} onCorrect={room.onCorrect} />}
          {expired && (
            <div className="mt-4 p-3 bg-red-900 rounded">
              {t('rooms.timeRemaining')}: 00:00 — Session expired
            </div>
          )}
        </div>
      </div>
    </div>
  );
}