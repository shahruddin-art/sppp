import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { db } from '@/lib/db';
import { requireAuth, canListApplications } from '@/lib/rbac';
import { getApplicationTypeMap } from '@/lib/app-type-cache';

// GET /api/applications/[id]/sticker - Generate sticker fail PDF
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

    const fileNumber = application.fileNumber || application.referenceNo;
    const appTypeMap = await getApplicationTypeMap();
    const applicationTypeLabel = appTypeMap[application.applicationType]?.label || application.applicationType;
    const jenisLesen = (application.businessType || applicationTypeLabel).toUpperCase();
    const namaPerniagaan = application.applicantName.toUpperCase();
    const namaPelesen = application.applicantName.toUpperCase();
    const noIc = application.applicantIc.toUpperCase();
    const telefon = (application.applicantPhone || '').toUpperCase();
    const alamat = (application.applicantAddress || '').toUpperCase();
    const noAkaun = (application.noAkaun || '').toUpperCase();

    // Format date as DD/MM/YYYY
    const createdDate = new Date(application.createdAt);
    const tarikh = `${createdDate.getDate().toString().padStart(2, '0')}/${(createdDate.getMonth() + 1).toString().padStart(2, '0')}/${createdDate.getFullYear()}`;

    // Create PDF document - A4 size
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    // Sticker layout
    const stickerMarginX = 10 * 2.83465; // 10mm margin each side
    const stickerWidth = pageWidth - 2 * stickerMarginX; // ~480pt (~170mm)
    const stickerGap = 6;
    const startY = pageHeight - 15;

    // Table constants
    const tblRowHeight = 14;
    const labelFontSize = 7.5;
    const valueFontSize = 8;
    const labelColWidth = 85;

    // Top boxes height (file number at 14pt)
    const topBoxHeight = 16;
    const topBoxGap = 4;

    // Center file number size (target 46pt, will shrink if needed)
    const targetCenterFontSize = 46;
    const centerGap = 4;

    const rowCount = 5;

    function drawSticker(startX: number, topY: number): number {
      // Calculate tight content height
      const contentHeight =
        topBoxHeight + topBoxGap +           // top boxes
        targetCenterFontSize + centerGap +    // center big number
        rowCount * tblRowHeight;              // table rows
      const stickerHeight = contentHeight;

      // Draw outer border - tight around content
      page.drawRectangle({
        x: startX,
        y: topY - stickerHeight,
        width: stickerWidth,
        height: stickerHeight,
        borderWidth: 1.5,
        borderColor: rgb(0, 0, 0),
        color: rgb(1, 1, 1),
      });

      let y = topY;
      const innerX = startX;
      const innerWidth = stickerWidth;

      // ── Top: Two boxes with file number at ~14pt bold ──
      const boxWidth = innerWidth / 2 - 2;
      const leftBoxX = innerX;
      const rightBoxX = innerX + innerWidth / 2 + 2;
      const topFileNum = fileNumber.toUpperCase();

      // Left box
      page.drawRectangle({
        x: leftBoxX,
        y: y - topBoxHeight,
        width: boxWidth,
        height: topBoxHeight,
        borderWidth: 0.6,
        borderColor: rgb(0, 0, 0),
        color: rgb(1, 1, 1),
      });
      // 14pt font for top file number
      let topFontSize = 14;
      let topTextW = boldFont.widthOfTextAtSize(topFileNum, topFontSize);
      while (topTextW > boxWidth - 6 && topFontSize > 6) {
        topFontSize -= 0.5;
        topTextW = boldFont.widthOfTextAtSize(topFileNum, topFontSize);
      }
      page.drawText(topFileNum, {
        x: leftBoxX + (boxWidth - topTextW) / 2,
        y: y - topBoxHeight + (topBoxHeight - topFontSize) / 2 + 1,
        size: topFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Right box
      page.drawRectangle({
        x: rightBoxX,
        y: y - topBoxHeight,
        width: boxWidth,
        height: topBoxHeight,
        borderWidth: 0.6,
        borderColor: rgb(0, 0, 0),
        color: rgb(1, 1, 1),
      });
      page.drawText(topFileNum, {
        x: rightBoxX + (boxWidth - topTextW) / 2,
        y: y - topBoxHeight + (topBoxHeight - topFontSize) / 2 + 1,
        size: topFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      y -= topBoxHeight + topBoxGap;

      // ── Center: Large file number at 46pt bold ──
      const centerText = fileNumber.toUpperCase();
      let centerFontSize = targetCenterFontSize;
      let centerTextW = boldFont.widthOfTextAtSize(centerText, centerFontSize);
      while (centerTextW > innerWidth - 6 && centerFontSize > 16) {
        centerFontSize -= 1;
        centerTextW = boldFont.widthOfTextAtSize(centerText, centerFontSize);
      }
      page.drawText(centerText, {
        x: innerX + (innerWidth - centerTextW) / 2,
        y: y - centerFontSize + 2,
        size: centerFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= centerFontSize + centerGap;

      // ── Table rows ──
      function drawRow(label: string, value: string, rowY: number, extraCol?: { value: string; width: number }[]): number {
        // Top horizontal line
        page.drawLine({
          start: { x: innerX, y: rowY },
          end: { x: innerX + innerWidth, y: rowY },
          thickness: 0.4,
          color: rgb(0, 0, 0),
        });

        // Label
        page.drawText(label, {
          x: innerX + 3,
          y: rowY - tblRowHeight + 3,
          size: labelFontSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        // Vertical line after label
        page.drawLine({
          start: { x: innerX + labelColWidth, y: rowY },
          end: { x: innerX + labelColWidth, y: rowY - tblRowHeight },
          thickness: 0.4,
          color: rgb(0, 0, 0),
        });

        const valueX = innerX + labelColWidth + 3;
        const maxValWidth = innerWidth - labelColWidth - 6;

        if (extraCol && extraCol.length > 0) {
          const firstSectionWidth = maxValWidth - extraCol.reduce((sum, c) => sum + c.width, 0);
          let dv = value;
          while (regularFont.widthOfTextAtSize(dv, valueFontSize) > firstSectionWidth - 6 && dv.length > 3) {
            dv = dv.slice(0, -1);
          }
          page.drawText(dv, {
            x: valueX,
            y: rowY - tblRowHeight + 3,
            size: valueFontSize,
            font: regularFont,
            color: rgb(0, 0, 0),
          });

          let colX = innerX + labelColWidth + firstSectionWidth;
          for (const col of extraCol) {
            page.drawLine({
              start: { x: colX, y: rowY },
              end: { x: colX, y: rowY - tblRowHeight },
              thickness: 0.4,
              color: rgb(0, 0, 0),
            });
            let cv = col.value;
            while (regularFont.widthOfTextAtSize(cv, valueFontSize) > col.width - 6 && cv.length > 3) {
              cv = cv.slice(0, -1);
            }
            page.drawText(cv, {
              x: colX + 3,
              y: rowY - tblRowHeight + 3,
              size: valueFontSize,
              font: regularFont,
              color: rgb(0, 0, 0),
            });
            colX += col.width;
          }
        } else {
          let dv = value;
          while (regularFont.widthOfTextAtSize(dv, valueFontSize) > maxValWidth - 3 && dv.length > 3) {
            dv = dv.slice(0, -1);
          }
          page.drawText(dv, {
            x: valueX,
            y: rowY - tblRowHeight + 3,
            size: valueFontSize,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        }

        return rowY - tblRowHeight;
      }

      // JENIS LESEN
      y = drawRow('JENIS LESEN', jenisLesen, y);

      // NAMA PERNIAGAAN
      y = drawRow('NAMA PERNIAGAAN', namaPerniagaan, y);

      // NAMA PELESEN | NO. IC/ROC | TELEFON
      const nameWidth = 140;
      const icWidth = 100;
      const phoneWidth = innerWidth - labelColWidth - nameWidth - icWidth;
      y = drawRow('NAMA PELESEN', namaPelesen, y, [
        { value: noIc, width: icWidth },
        { value: telefon, width: phoneWidth },
      ]);

      // ALAMAT PERNIAGAAN
      y = drawRow('ALAMAT PERNIAGAAN', alamat, y);

      // TARIKH | NO. AKAUN
      const tarikhWidth = 180;
      const akaunWidth = innerWidth - labelColWidth - tarikhWidth;
      y = drawRow('TARIKH', tarikh, y, [
        { value: `NO.AKAUN: ${noAkaun}`, width: akaunWidth },
      ]);

      // Bottom line
      page.drawLine({
        start: { x: innerX, y: y },
        end: { x: innerX + innerWidth, y: y },
        thickness: 0.4,
        color: rgb(0, 0, 0),
      });

      return topY - stickerHeight;
    }

    // Draw 3 stickers on the page
    let currentY = startY;
    for (let i = 0; i < 3; i++) {
      currentY = drawSticker(stickerMarginX, currentY);
      currentY -= stickerGap;
    }

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sticker-${fileNumber.replace(/[/\\]/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Sticker PDF error:', error);
    return NextResponse.json({ error: 'Gagal menjana PDF sticker fail' }, { status: 500 });
  }
}
