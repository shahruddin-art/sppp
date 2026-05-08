'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, FileCheck } from 'lucide-react';
import { DOCUMENT_CHECKLIST, APPLICATION_TYPES } from '@/lib/constants';

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

interface DocumentChecklistProps {
  application: Application;
}

// Circled numbers: ①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮
const CIRCLED_NUMBERS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];

export default function DocumentChecklist({ application }: DocumentChecklistProps) {
  const checklistItems = DOCUMENT_CHECKLIST[application.applicationType] || DOCUMENT_CHECKLIST.PERMOHONAN_BARU;
  const applicationTypeLabel = (APPLICATION_TYPES as any)[application.applicationType]?.label || application.applicationType;

  const handlePrint = () => {
    const fileNumber = application.fileNumber || application.referenceNo;
    const checklistHTML = checklistItems.map((item, i) =>
      `<div style="display:flex;align-items:flex-start;margin-bottom:6px;line-height:1.5;">
        <span style="font-family:Arial,sans-serif;font-size:12pt;margin-right:8px;white-space:nowrap;">${CIRCLED_NUMBERS[i] || (i + 1)}</span>
        <span style="font-family:Arial,sans-serif;font-size:12pt;">${item}</span>
      </div>`
    ).join('');

    const ptStaffName = application.ptStaff?.name || '';
    const today = new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Senarai Semak Dokumen</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 15mm 20mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
    }
    .page-container {
      width: 100%;
      max-width: 170mm;
      margin: 0 auto;
    }
    .file-number {
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 16pt;
    }
    .checklist-section {
      margin-bottom: 14pt;
    }
    .checklist-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .checklist-item .num {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      margin-right: 8px;
      white-space: nowrap;
    }
    .checklist-item .text {
      font-family: Arial, sans-serif;
      font-size: 12pt;
    }
    .reference-section {
      margin-top: 16pt;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.8;
    }
    .reference-section p {
      margin-bottom: 2pt;
    }
    .reference-section .label {
      font-weight: bold;
    }
    .reference-section .value {
      text-decoration: underline;
    }
    .closing-section {
      margin-top: 20pt;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.8;
    }
    .signature-section {
      margin-top: 24pt;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.8;
    }
    .signature-section .name {
      font-weight: bold;
    }
    .signature-section .position {
    }
    .signature-section .dept {
    }
    .signature-section .org {
    }
    .signature-section .date {
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="file-number">${fileNumber}</div>

    <div class="checklist-section">
      ${checklistItems.map((item, i) => `<div class="checklist-item"><span class="num">${CIRCLED_NUMBERS[i] || (i + 1)}</span><span class="text">${item}</span></div>`).join('')}
    </div>

    <div class="reference-section">
      <p>KPT(L),</p>
      <p>Bil. ( 1 ) hingga ( ${checklistItems.length} ) adalah dirujuk.</p>
      <p>Untuk semakan dan kelulusan lesen bersyarat bagi aktiviti:-</p>
      <p class="label" style="margin-top:4pt;">${application.businessType || applicationTypeLabel}</p>
      <p style="margin-top:6pt;">Nama Syarikat:- <span class="value">${application.applicantName}</span></p>
      <p>Di alamat:- <span class="value">${application.applicantAddress || '-'}</span></p>
    </div>

    <div class="closing-section">
      <p>Dikemukakan untuk tindakan tuan selanjutnya. Terima kasih.</p>
    </div>

    <div class="signature-section">
      <p class="name">${ptStaffName || '___________________________'}</p>
      <p class="position">Pembantu Tadbir</p>
      <p class="dept">Jabatan Pelesenan</p>
      <p class="org">Majlis Bandaraya Ipoh</p>
      <p class="date">${today}</p>
    </div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <Card className="border-sky-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-sky-700">
          <FileCheck className="h-4 w-4" />
          Senarai Semak Dokumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Checklist items with circled numbers */}
        <div className="space-y-1.5">
          {checklistItems.map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-base leading-6 shrink-0 select-none">{CIRCLED_NUMBERS[index] || (index + 1)}</span>
              <span className="leading-6">{item}</span>
            </div>
          ))}
        </div>

        {/* Application info summary */}
        <div className="mt-3 pt-3 border-t border-dashed text-xs text-muted-foreground space-y-1">
          <p>Bil. ( 1 ) hingga ( {checklistItems.length} ) adalah dirujuk.</p>
          <p>Untuk semakan dan kelulusan lesen bersyarat bagi aktiviti:-</p>
          <p className="font-semibold text-foreground">{application.businessType || applicationTypeLabel}</p>
          <p className="mt-1">Nama Syarikat:- <span className="font-semibold text-foreground">{application.applicantName}</span></p>
          {application.applicantAddress && (
            <p>Di alamat:- <span className="text-foreground">{application.applicantAddress}</span></p>
          )}
        </div>

        {/* Print button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
