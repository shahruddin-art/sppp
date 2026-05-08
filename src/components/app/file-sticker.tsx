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
  const noKomposit = fileNum;
  const jenisLesen = (app.businessType || (APPLICATION_TYPES as any)[app.applicationType]?.label || '').toUpperCase();
  const namaPerniagaan = (app.businessName || app.applicantName).toUpperCase();
  const namaPelesen = app.applicantName.toUpperCase();
  const noPendaftaran = app.applicantIc.toUpperCase();
  const noTelefon = (app.applicantPhone || '-').toUpperCase();
  const alamat = (app.applicantAddress || '-').toUpperCase();
  const tarikh = new Date(app.createdAt).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const noAkaun = (app.accountNo || '-').toUpperCase();

  return `
    <table class="sticker-table">
      <colgroup>
        <col style="width:30%">
        <col style="width:70%">
      </colgroup>
      <tr>
        <td colspan="2" style="padding:0; border:1px solid #000;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td class="file-number-small">${fileNum}</td>
              <td class="file-number-small">${fileNum}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="file-number-large">${fileNum}</td>
      </tr>
      <tr>
        <td class="label">NO. KOMPOSIT</td>
        <td class="value">${noKomposit}</td>
      </tr>
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
        <td class="value">${namaPelesen} ${noPendaftaran} ${noTelefon}</td>
      </tr>
      <tr>
        <td class="label">ALAMAT PERNIAGAAN</td>
        <td class="value">${alamat}</td>
      </tr>
      <tr>
        <td class="label">TARIKH</td>
        <td class="value">${tarikh} NO.AKAUN : ${noAkaun}</td>
      </tr>
    </table>
  `;
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
      gap: 0;
    }
    .sticker-box {
      width: 100%;
      height: 33.33%;
      min-height: 90mm;
      padding: 2mm 3mm;
      page-break-inside: avoid;
    }
    .sticker-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      text-transform: uppercase;
      height: 100%;
    }
    .sticker-table td {
      border: 1px solid #000;
      padding: 3px 6px;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sticker-table .label {
      font-weight: bold;
      white-space: nowrap;
    }
    .sticker-table .value {
    }
    .sticker-table .file-number-small {
      font-family: Arial, sans-serif;
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      border: 1px solid #000;
      padding: 2px 4px;
      width: 50%;
    }
    .sticker-table .file-number-large {
      font-family: Arial, sans-serif;
      font-size: 46pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      padding: 1mm 2mm 2mm 2mm;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="sticker-box">${stickerHTML}</div>
    <div class="sticker-box">${stickerHTML}</div>
    <div class="sticker-box">${stickerHTML}</div>
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
