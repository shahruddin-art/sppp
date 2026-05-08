import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { APPLICATION_TYPES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/reports/daily-received?date=YYYY-MM-DD
// Returns all applications received (created) on a specific date
export async function GET(request: Request) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Parameter tarikh diperlukan (format: YYYY-MM-DD)' }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json({ error: 'Format tarikh tidak sah. Gunakan YYYY-MM-DD' }, { status: 400 });
    }

    // Build date range for the given date (start of day to end of day)
    const startDate = new Date(dateParam + 'T00:00:00.000Z');
    const endDate = new Date(dateParam + 'T23:59:59.999Z');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Tarikh tidak sah' }, { status: 400 });
    }

    // Build role-based filter
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // PT users can only see their zone
    if (user.role === 'PT' && user.zone) {
      where.zone = user.zone;
    }

    const applications = await db.application.findMany({
      where,
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: { select: { id: true, name: true, role: true } },
        ppkpStaff: { select: { id: true, name: true, role: true } },
        pplStaff: { select: { id: true, name: true, role: true } },
        plbStaff: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Compute summary statistics
    const typeCounts: Record<string, number> = {};
    const zoneCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const app of applications) {
      // Type counts
      const typeLabel = (APPLICATION_TYPES as any)[app.applicationType]?.label || app.applicationType;
      typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;

      // Zone counts
      zoneCounts[app.zone] = (zoneCounts[app.zone] || 0) + 1;

      // Status counts
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    }

    // Format applications for response
    const formatted = applications.map(app => {
      const currentStepData = app.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
      return {
        id: app.id,
        referenceNo: app.referenceNo,
        applicantName: app.applicantName,
        applicantIc: app.applicantIc,
        applicantPhone: app.applicantPhone,
        applicationType: app.applicationType,
        applicationTypeLabel: (APPLICATION_TYPES as any)[app.applicationType]?.label || app.applicationType,
        businessType: app.businessType,
        zone: app.zone,
        status: app.status,
        fileNumber: app.fileNumber,
        currentStep: app.currentStep,
        plbDecision: app.plbDecision,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        ptStaffName: app.ptStaff?.name || null,
        ppkpStaffName: app.ppkpStaff?.name || null,
        currentStepName: currentStepData ? currentStepData.step : null,
        isOverdue: app.steps.some(s =>
          s.status === 'OVERDUE' || (s.slaDeadline && new Date(s.slaDeadline) < new Date() && s.status !== 'COMPLETED')
        ),
      };
    });

    return NextResponse.json({
      date: dateParam,
      totalApplications: applications.length,
      typeCounts,
      zoneCounts,
      statusCounts,
      applications: formatted,
    });
  } catch (error) {
    console.error('Daily received report error:', error);
    return NextResponse.json({ error: 'Gagal memuatkan laporan harian' }, { status: 500 });
  }
}
