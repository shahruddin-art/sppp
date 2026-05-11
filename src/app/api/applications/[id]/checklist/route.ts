import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { db } from '@/lib/db';
import { requireAuth, canListApplications } from '@/lib/rbac';
import { DOCUMENT_CHECKLIST } from '@/lib/constants';

// GET /api/applications/[id]/checklist - Generate checklist PDF
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    if (!canListApplications(authResult.user.role)) {
      return NextResponse.json({ error: 'Tiada kebenaran.' }, { status: 403 });
    }

    const { id } = await params;
    const application = await db.application.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 });
    }

    // Parse margin parameters from query string (in mm, default 15mm)
    const url = new URL(request.url);
    const marginMm = {
      top: Math.max(5, Math.min(50, parseFloat(url.searchParams.get('marginTop') || '15'))),
      bottom: Math.max(5, Math.min(50, parseFloat(url.searchParams.get('marginBottom') || '15'))),
      left: Math.max(5, Math.min(50, parseFloat(url.searchParams.get('marginLeft') || '20'))),
      right: Math.max(5, Math.min(50, parseFloat(url.searchParams.get('marginRight') || '20'))),
    };

    // Convert mm to PDF points (1mm = 2.83465pt)
    const mmToPt = (mm: number) => mm * 2.83465;
    const leftMargin = mmToPt(marginMm.left);
    const rightMargin = mmToPt(marginMm.right);
    const topMargin = mmToPt(marginMm.top);
    const bottomMargin = mmToPt(marginMm.bottom);

    // Create PDF document - A4 size
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    // Embed standard fonts (no fontkit needed)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const usableWidth = pageWidth - leftMargin - rightMargin;
    let y = pageHeight - topMargin; // Start from top with user margin

    // Helper to draw centered text
    function drawCenteredText(text: string, currentY: number, font: any, fontSize: number): number {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: pageWidth / 2 - textWidth / 2,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      return currentY - fontSize * 1.3;
    }

    // Helper to draw text with word wrap
    function drawWrappedText(
      text: string,
      x: number,
      currentY: number,
      font: any,
      fontSize: number,
      maxWidth: number,
      lineHeightMultiplier = 1.3
    ): number {
      const lineHeight = fontSize * lineHeightMultiplier;
      const words = text.split(' ');
      let line = '';
      let newY = currentY;

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && line) {
          page.drawText(line, { x, y: newY, size: fontSize, font, color: rgb(0, 0, 0) });
          newY -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x, y: newY, size: fontSize, font, color: rgb(0, 0, 0) });
        newY -= lineHeight;
      }
      return newY;
    }

    // Helper to draw circled number
    function drawCircledNumber(num: number, x: number, currentY: number): number {
      const numStr = String(num);
      const circleRadius = num >= 10 ? 9 : 7.5;
      const circleX = x + circleRadius;
      const circleY = currentY + 4;

      // Draw circle
      page.drawCircle({
        x: circleX,
        y: circleY,
        size: circleRadius,
        borderThickness: 0.8,
        borderColor: rgb(0, 0, 0),
      });

      // Draw number centered in circle
      const fontSize = num >= 10 ? 7 : 8.5;
      const numWidth = regularFont.widthOfTextAtSize(numStr, fontSize);
      page.drawText(numStr, {
        x: circleX - numWidth / 2,
        y: currentY + (num >= 10 ? 1 : 1.5),
        size: fontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });

      return circleRadius * 2 + 4; // Return width taken by the circle
    }

    // ── Header: Official file number (nombor fail rasmi) centered at top, 18pt bold ──
    // Use fileNumber (official) if available, otherwise fallback to referenceNo
    const fileNumber = application.fileNumber || application.referenceNo;
    y = drawCenteredText(fileNumber, y, boldFont, 18);
    y -= 10;

    // ── Checklist items with circled numbers, 12pt ──
    const textStartX = leftMargin + 22;
    const itemMaxWidth = usableWidth - 22;

    for (let i = 0; i < DOCUMENT_CHECKLIST.length; i++) {
      const item = DOCUMENT_CHECKLIST[i];
      const num = i + 1;

      // Draw circled number
      drawCircledNumber(num, leftMargin, y);

      // Draw item text with word wrap
      const lineHeight = 12 * 1.4;
      const words = item.split(' ');
      let line = '';
      let lineY = y;

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = regularFont.widthOfTextAtSize(testLine, 12);
        if (testWidth > itemMaxWidth && line) {
          page.drawText(line, { x: textStartX, y: lineY, size: 12, font: regularFont, color: rgb(0, 0, 0) });
          lineY -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: textStartX, y: lineY, size: 12, font: regularFont, color: rgb(0, 0, 0) });
        lineY -= lineHeight;
      }

      y = lineY + 2; // Small gap between items
    }

    y -= 8;

    // ── Body text section ──
    y = drawWrappedText('KPT(L),', leftMargin, y, boldFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText(`Bil. ( 1 ) hingga ( ${DOCUMENT_CHECKLIST.length} ) adalah dirujuk.`, leftMargin, y, regularFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText('Untuk semakan dan kelulusan lesen bersyarat bagi aktiviti:-', leftMargin, y, regularFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText(application.businessType || application.applicationType, leftMargin, y, boldFont, 12, usableWidth);
    y -= 2;

    y = drawWrappedText('Nama Syarikat:-', leftMargin, y, regularFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText(application.applicantName, leftMargin, y, boldFont, 12, usableWidth);
    y -= 2;

    if (application.applicantAddress) {
      y = drawWrappedText('Di alamat:-', leftMargin, y, regularFont, 12, usableWidth);
      y += 4;
      y = drawWrappedText(application.applicantAddress, leftMargin, y, boldFont, 12, usableWidth);
      y -= 2;
    }

    y = drawWrappedText('Dikemukakan untuk tindakan tuan selanjutnya. Terima kasih.', leftMargin, y, regularFont, 12, usableWidth);
    y -= 14;

    // ── Footer: Staff info and date ──
    const ptName = application.ptStaff?.name || '';
    if (ptName) {
      y = drawWrappedText(ptName, leftMargin, y, boldFont, 12, usableWidth);
      y += 4;
    }

    y = drawWrappedText('Pembantu Tadbir', leftMargin, y, regularFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText('Jabatan Pelesenan', leftMargin, y, regularFont, 12, usableWidth);
    y += 4;
    y = drawWrappedText('Majlis Bandaraya Ipoh', leftMargin, y, regularFont, 12, usableWidth);
    y -= 2;

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    drawWrappedText(dateStr, leftMargin, y, boldFont, 12, usableWidth);

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    // Return as PDF
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="checklist-${fileNumber.replace(/[/\\]/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Checklist PDF error:', error);
    return NextResponse.json({ error: 'Gagal menjana PDF checklist' }, { status: 500 });
  }
}
