'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { APPLICATION_TYPES } from '@/lib/constants';

interface StaffInfo {
  id: string;
  name: string;
  role: string;
}

interface Application {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicantPhone: string | null;
  applicantAddress: string | null;
  applicationType: string;
  businessType: string | null;
  businessName: string | null;
  accountNo: string | null;
  zone: string;
  status: string;
  fileNumber: string | null;
  currentStep: string;
  plbDecision: string | null;
  plbDecisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  ptStaff: StaffInfo | null;
  ppkpStaff: StaffInfo | null;
  pplStaff: StaffInfo | null;
  plbStaff: StaffInfo | null;
}

interface FileStickerProps {
  application: Application;
}

function generateStickerHTML(app: Application): string {
  const fileNum = (app.fileNumber || app.referenceNo).toUpperCase();
  const jenisLesen = (app.businessType || (APPLICATION_TYPES as any)[app.applicationType]?.label || '').toUpperCase();
  const namaPerniagaan = (app.businessName || app.applicantName).toUpperCase();
  const namaPelesen = app.applicantName.toUpperCase();
  const noPendaftaran = app.applicantIc.toUpperCase();
  const noTelefon = (app.applicantPhone || '-').toUpperCase();
  const alamat = (app.applicantAddress || '-').toUpperCase();
  const tarikh = new Date(app.createdAt).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const noAkaun = (app.accountNo || '-').toUpperCase();

  // One sticker box
  const stickerBox = `
    <div class="sticker-box">
      <div class="sticker-top">
        <div class="file-number-small">${fileNum}</div>
        <div class="file-number-small">${fileNum}</div>
      </div>
      <div class="file-number-large">${fileNum}</div>
      <table class="sticker-table">
        <tr>
          <td class="label">JENIS LESEN</td>
          <td class="value">${jenisLesen}</td>
        </tr>
        <tr>
          <td class="label">NAMA PERNIAGAAN</td>
          <td class="value">${namaPerniagaan}</td>
        </tr>
        <tr>
          <td class="label">NAMA PELESEN</td>
          <td class="value multi-col">
            <span>${namaPelesen}</span>
            <span>${noPendaftaran}</span>
            <span>${noTelefon}</span>
          </td>
        </tr>
        <tr>
          <td class="label">ALAMAT PERNIAGAAN</td>
          <td class="value">${alamat}</td>
        </tr>
        <tr>
          <td class="label">TARIKH</td>
          <td class="value multi-col">
            <span>${tarikh}</span>
            <span>NO.AKAUN : ${noAkaun}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  return stickerBox;
}

export default function FileSticker({ application }: FileStickerProps) {
  const handlePrint = () => {
    const stickerHTML = generateStickerHTML(application);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Sticker Fail</title>
  <style>
    @page {
      size: A4;
      margin: 5mm 5mm 5mm 5mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
    }
    .page {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    .sticker-box {
      border: 2px solid #000;
      width: 100%;
      height: 33.33%;
      min-height: 90mm;
      padding: 4mm 5mm;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
    }
    .sticker-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2mm;
    }
    .file-number-small {
      font-family: Arial, sans-serif;
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .file-number-large {
      font-family: Arial, sans-serif;
      font-size: 46pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin: 2mm 0 4mm 0;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sticker-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      text-transform: uppercase;
      flex: 1;
    }
    .sticker-table tr {
      border: 1px solid #000;
    }
    .sticker-table td {
      border: 1px solid #000;
      padding: 3px 6px;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sticker-table .label {
      width: 30%;
      font-weight: bold;
      white-space: nowrap;
    }
    .sticker-table .value {
      width: 70%;
    }
    .sticker-table .value.multi-col {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .sticker-table .value.multi-col span {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="page">
    ${stickerHTML}
    ${stickerHTML}
    ${stickerHTML}
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
      <Printer className="h-4 w-4" />
      Cetak Sticker Fail
    </Button>
  );
}
