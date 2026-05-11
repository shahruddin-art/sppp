'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';

interface ChecklistPrintProps {
  application: {
    referenceNo: string;
    applicantName: string;
    applicantIc: string;
    applicantPhone: string | null;
    applicantAddress: string | null;
    applicationType: string;
    zone: string;
    fileNumber: string | null;
    createdAt: string;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const CHECKLIST_ITEMS = [
  'Borang permohonan telah dilengkapkan',
  'Salinan kad pengenalan / pendaftaran syarikat',
  'Salinan lesen sebelumnya (jika pembaharuan)',
  'Gambar premis / lokasi perniagaan',
  'Surat kebenaran pemilik premis',
  'Sijil pendaftaran syarikat / perkongsian',
  'Bayaran fi permohonan',
  'Dokumen sokongan lain (jika ada)',
];

export default function ChecklistPrint({
  application,
  variant = 'outline',
  size = 'sm',
  className = '',
}: ChecklistPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Senarai Semak - ${application.fileNumber || application.referenceNo}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          .checklist-container {
            max-width: 100%;
          }
          .file-number {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            font-family: Arial, Helvetica, sans-serif;
            margin-bottom: 16px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .info-table td {
            padding: 4px 8px;
            border: 1px solid #000;
            font-size: 12pt;
            font-family: Arial, Helvetica, sans-serif;
            vertical-align: top;
          }
          .info-table .label {
            width: 160px;
            font-weight: bold;
            white-space: nowrap;
          }
          .checklist-title {
            font-size: 12pt;
            font-weight: bold;
            font-family: Arial, Helvetica, sans-serif;
            margin-bottom: 8px;
            text-decoration: underline;
          }
          .checklist-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .checklist-table td {
            padding: 6px 8px;
            border: 1px solid #000;
            font-size: 12pt;
            font-family: Arial, Helvetica, sans-serif;
          }
          .checklist-number {
            width: 40px;
            text-align: center;
            font-weight: bold;
          }
          .number-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border: 1.5px solid #000;
            border-radius: 50%;
            font-size: 11pt;
          }
          .checklist-item {
            padding-left: 8px;
          }
          .signature-section {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 48px;
            padding-top: 4px;
            font-size: 11pt;
            font-family: Arial, Helvetica, sans-serif;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  }, [application.fileNumber, application.referenceNo]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handlePrint}
        title="Cetak senarai semak"
      >
        <ClipboardCheck className="h-4 w-4 mr-1.5" />
        Cetak Senarai Semak
      </Button>

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="checklist-container">
          {/* File number at top center */}
          <div className="file-number">
            {application.fileNumber || '-'}
          </div>

          {/* Application info table */}
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">NAMA PEMOHON</td>
                <td>{application.applicantName}</td>
              </tr>
              <tr>
                <td className="label">NO. KAD PENGENALAN / ROC</td>
                <td>{application.applicantIc}</td>
              </tr>
              <tr>
                <td className="label">NO. TELEFON</td>
                <td>{application.applicantPhone || '-'}</td>
              </tr>
              <tr>
                <td className="label">ALAMAT</td>
                <td>{application.applicantAddress || '-'}</td>
              </tr>
              <tr>
                <td className="label">JENIS PERMOHONAN</td>
                <td>{application.applicationType}</td>
              </tr>
              <tr>
                <td className="label">ZON</td>
                <td>{application.zone}</td>
              </tr>
              <tr>
                <td className="label">TARIKH PERMOHONAN</td>
                <td>{formatDate(application.createdAt)}</td>
              </tr>
            </tbody>
          </table>

          {/* Checklist */}
          <div className="checklist-title">SENARAI SEMAK DOKUMEN</div>
          <table className="checklist-table">
            <tbody>
              {CHECKLIST_ITEMS.map((item, index) => (
                <tr key={index}>
                  <td className="checklist-number">
                    <span className="number-circle">{index + 1}</span>
                  </td>
                  <td className="checklist-item">{item}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">Tandatangan Pemohon</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Tandatangan Kakitangan Kaunter</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
