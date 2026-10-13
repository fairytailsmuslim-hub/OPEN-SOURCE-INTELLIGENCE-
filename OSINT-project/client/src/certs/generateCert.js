import jsPDF from 'jspdf';

export function generateCertificate({ name, tier, score, date, certId }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 210, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.text('Certificate of Completion', 148, 60, { align: 'center' });

  doc.setFontSize(18);
  doc.text(name, 148, 95, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`Tier ${tier} — Score: ${score}`, 148, 115, { align: 'center' });
  doc.text(`Date: ${date}`, 148, 130, { align: 'center' });
  doc.text(`Cert ID: ${certId}`, 148, 145, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Verify at: https://yourdomain.com/verify', 148, 180, { align: 'center' });

  doc.save(`cert-${certId}.pdf`);
}