import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function FlagSubmit({ roomId, onCorrect }) {
  const { t } = useTranslation();
  const [flag, setFlag] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!flag.trim() || submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const { data } = await api.post('/flags/submit', { roomId, flag });
      if (data.correct) {
        setStatus('correct');
        onCorrect?.(data);
        setFlag('');
      } else {
        setStatus('incorrect');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <input
        type="text"
        value={flag}
        onChange={(e) => setFlag(e.target.value)}
        placeholder={t('rooms.flagPlaceholder')}
        className="w-full px-3 py-2 bg-slate-900 rounded border border-slate-600 focus:border-blue-500 outline-none"
        autoComplete="off"
        spellCheck="false"
      />
      <button
        type="submit"
        disabled={submitting || !flag.trim()}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-semibold"
      >
        {t('rooms.submitFlag')}
      </button>
      {status === 'correct' && <div className="text-green-400">{t('rooms.correct')}</div>}
      {status === 'incorrect' && <div className="text-red-400">{t('rooms.incorrect')}</div>}
      {status === 'error' && <div className="text-red-400">{t('errors.tryAgain')}</div>}
    </form>
  );
}