'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';

interface StickerPrintProps {
  application: {
    referenceNo: string;
    applicantName: string;
    applicantIc: string;
    applicantPhone: string | null;
    applicantAddress: string | null;
    businessType: string | null;
    licenseeName: string | null;
    accountNumber: string | null;
    applicationType: string;
    zone: string;
    fileNumber: string | null;
    createdAt: string;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function StickerPrint({
  application,
  variant = 'outline',
  size = 'sm',
  className = '',
}: StickerPrintProps) {
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
        <title>Sticker Fail - ${application.fileNumber || application.referenceNo}</title>
        <style>
          @page {
            size: A4;
            margin: 0.4in 0.5in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
            color: #000;
            background: #fff;
            text-transform: uppercase;
          }
          .stickers-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sticker {
            border: 1.5px solid #000;
            padding: 0;
            page-break-inside: avoid;
          }
          .sticker-header {
            display: flex;
            border-bottom: 1.5px solid #000;
          }
          .sticker-header-box {
            flex: 1;
            padding: 3px 8px;
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            border-right: 1.5px solid #000;
          }
          .sticker-header-box:last-child {
            border-right: none;
          }
          .sticker-file-number {
            padding: 4px 8px;
            font-size: 48pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            border-bottom: 1.5px solid #000;
            letter-spacing: 1px;
          }
          .sticker-table {
            width: 100%;
            border-collapse: collapse;
          }
          .sticker-table tr {
            border-bottom: 0.5px solid #000;
          }
          .sticker-table tr:last-child {
            border-bottom: none;
          }
          .sticker-table td {
            padding: 2px 6px;
            font-size: 9.5pt;
            vertical-align: top;
            text-transform: uppercase;
          }
          .sticker-table .label-cell {
            width: 140px;
            font-weight: bold;
            white-space: nowrap;
            border-right: 0.5px solid #000;
          }
          .sticker-table .value-cell {
            flex: 1;
          }
          .sticker-table .side-cell {
            width: 180px;
            border-left: 0.5px solid #000;
            padding: 2px 6px;
          }
          .sticker-table .value-cell .sub-line {
            display: block;
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

  // Format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fileNumberDisplay = (application.fileNumber || '-').toUpperCase();
  const jenisLesen = (application.businessType || '-').toUpperCase();
  const namaPerniagaan = (application.applicantName || '-').toUpperCase();
  const namaPelesen = (application.licenseeName || '-').toUpperCase();
  const noPendaftaran = (application.applicantIc || '-').toUpperCase();
  const noTelefon = (application.applicantPhone || '-').toUpperCase();
  const alamatPerniagaan = (application.applicantAddress || '-').toUpperCase();
  const tarikh = formatDate(application.createdAt);
  const noAkaun = (application.accountNumber || '-').toUpperCase();

  const stickerData = {
    fileNumber: fileNumberDisplay,
    jenisLesen,
    namaPerniagaan,
    namaPelesen,
    noPendaftaran,
    noTelefon,
    alamatPerniagaan,
    tarikh,
    noAkaun,
  };

  // Generate one sticker HTML block
  const stickerHtml = (data: typeof stickerData) => `
    <div class="sticker">
      <div class="sticker-header">
        <div class="sticker-header-box">${data.fileNumber}</div>
        <div class="sticker-header-box">${data.fileNumber}</div>
      </div>
      <div class="sticker-file-number">${data.fileNumber}</div>
      <table class="sticker-table">
        <tr>
          <td class="label-cell">JENIS LESEN</td>
          <td class="value-cell">${data.jenisLesen}</td>
          <td class="side-cell"></td>
        </tr>
        <tr>
          <td class="label-cell">NAMA PERNIAGAAN</td>
          <td class="value-cell" colspan="2">${data.namaPerniagaan}</td>
        </tr>
        <tr>
          <td class="label-cell">NAMA PELESEN</td>
          <td class="value-cell">${data.namaPelesen}</td>
          <td class="side-cell">
            ${data.noPendaftaran}<br/>
            ${data.noTelefon}
          </td>
        </tr>
        <tr>
          <td class="label-cell">ALAMAT PERNIAGAAN</td>
          <td class="value-cell" colspan="2">${data.alamatPerniagaan}</td>
        </tr>
        <tr>
          <td class="label-cell">TARIKH</td>
          <td class="value-cell">${data.tarikh}</td>
          <td class="side-cell">NO.AKAUN : ${data.noAkaun}</td>
        </tr>
      </table>
    </div>
  `;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handlePrint}
        title="Cetak sticker fail"
      >
        <Tag className="h-4 w-4 mr-1.5" />
        Cetak Sticker
      </Button>

      {/* Hidden print content - 3 stickers per page */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="stickers-container">
          <div dangerouslySetInnerHTML={{ __html: stickerHtml(stickerData) }} />
          <div dangerouslySetInnerHTML={{ __html: stickerHtml(stickerData) }} />
          <div dangerouslySetInnerHTML={{ __html: stickerHtml(stickerData) }} />
        </div>
      </div>
    </>
  );
}
