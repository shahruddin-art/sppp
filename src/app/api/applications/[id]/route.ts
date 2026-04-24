import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WORKFLOW_STEPS, APPLICATION_TYPES } from '@/lib/constants';

// GET /api/applications/[id] - Get application detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await db.application.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
        ppkpStaff: true,
        pplStaff: true,
        plbStaff: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Add computed fields
    const currentStepData = application.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
    const overdueSteps = application.steps.filter(s =>
      s.status === 'OVERDUE' || (s.slaDeadline && new Date(s.slaDeadline) < new Date() && s.status !== 'COMPLETED')
    );

    let remainingDays: number | null = null;
    if (currentStepData?.slaDeadline) {
      const diff = new Date(currentStepData.slaDeadline).getTime() - Date.now();
      remainingDays = Math.round(diff / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    const enriched = {
      ...application,
      currentStepStatus: currentStepData?.status || null,
      currentStepName: currentStepData ? (WORKFLOW_STEPS as any)[currentStepData.step]?.label || currentStepData.step : null,
      isOverdue: overdueSteps.length > 0,
      remainingDays,
      applicationTypeLabel: (APPLICATION_TYPES as any)[application.applicationType]?.label || application.applicationType,
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Application GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
