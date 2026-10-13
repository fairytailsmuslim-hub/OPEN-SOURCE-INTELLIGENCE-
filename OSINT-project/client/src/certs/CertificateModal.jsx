import React from 'react';
import { useTranslation } from 'react-i18next';
import { generateCertificate } from './generateCert';

export default function CertificateModal({ cert, onClose }) {
  const { t } = useTranslation();
  if (!cert) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{t('certificate.title')}</h2>
        <div className="space-y-2 text-slate-300 mb-6">
          <div><strong>Name:</strong> {cert.name}</div>
          <div><strong>Tier:</strong> {cert.tier}</div>
          <div><strong>Score:</strong> {cert.score}</div>
          <div><strong>Date:</strong> {new Date(cert.date).toLocaleDateString()}</div>
          <div><strong>Cert ID:</strong> {cert.certId}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateCertificate(cert)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            {t('certificate.download')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}