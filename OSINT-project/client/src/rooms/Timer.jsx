import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Timer({ expiresAt, onExpire }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  );

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onExpire?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire, remaining]);

  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');

  const danger = remaining < 300;

  return (
    <div className={`px-4 py-2 rounded font-mono text-xl ${danger ? 'bg-red-900' : 'bg-slate-700'}`}>
      {t('rooms.timeRemaining')}: {h}:{m}:{s}
    </div>
  );
}