import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateReferenceNo, getPPKPRole, getPPLRole, APPLICATION_TYPES, WORKFLOW_STEPS } from '@/lib/constants';

// GET /api/applications - List all applications with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (zone) where.zone = zone;
    if (type) where.applicationType = type;
    if (search) {
      where.OR = [
        { applicantName: { contains: search } },
        { referenceNo: { contains: search } },
        { fileNumber: { contains: search } },
        { applicantIc: { contains: search } },
      ];
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
      orderBy: { createdAt: 'desc' },
    });

    // Add computed fields for each application
    const enriched = applications.map(app => {
      const currentStepData = app.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
      const overdueSteps = app.steps.filter(s =>
        s.status === 'OVERDUE' || (s.slaDeadline && new Date(s.slaDeadline) < new Date() && s.status !== 'COMPLETED')
      );

      let remainingDays: number | null = null;
      if (currentStepData?.slaDeadline) {
        const diff = new Date(currentStepData.slaDeadline).getTime() - Date.now();
        remainingDays = Math.round(diff / (1000 * 60 * 60 * 24) * 10) / 10;
      }

      return {
        ...app,
        currentStepStatus: currentStepData?.status || null,
        currentStepName: currentStepData ? (WORKFLOW_STEPS as any)[currentStepData.step]?.label || currentStepData.step : null,
        isOverdue: overdueSteps.length > 0,
        remainingDays,
        applicationTypeLabel: (APPLICATION_TYPES as any)[app.applicationType]?.label || app.applicationType,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Applications GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

// POST /api/applications - Create new application
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantName, applicantIc, applicantPhone, applicantAddress, applicationType, zone } = body;

    // Validate required fields
    if (!applicantName || !applicantIc || !applicationType || !zone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const referenceNo = generateReferenceNo();

    // Find PT staff for this zone
    const ptStaff = await db.user.findFirst({ where: { role: 'PT', zone, isActive: true } });
    const ppkpRole = getPPKPRole(applicationType);
    const ppkpStaff = await db.user.findFirst({ where: { role: ppkpRole, isActive: true } });
    const pplRole = getPPLRole(ppkpRole);
    const pplStaff = await db.user.findFirst({ where: { role: pplRole, isActive: true } });
    const plbStaff = await db.user.findFirst({ where: { role: 'PLB', isActive: true } });
    const kaunterStaff = await db.user.findFirst({ where: { role: 'KAUNTER', isActive: true } });

    const now = new Date();
    const ptSlaDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const application = await db.application.create({
      data: {
        referenceNo,
        applicantName,
        applicantIc,
        applicantPhone: applicantPhone || null,
        applicantAddress: applicantAddress || null,
        applicationType,
        zone,
        status: 'PENDING_PT',
        currentStep: 'PT_FILE_OPENING',
        ptStaffId: ptStaff?.id || null,
        ppkpStaffId: ppkpStaff?.id || null,
        pplStaffId: pplStaff?.id || null,
        plbStaffId: plbStaff?.id || null,
      },
    });

    // Create workflow steps
    await db.workflowStep.createMany({
      data: [
        {
          applicationId: application.id,
          step: 'KAUNTER_RECEIPT',
          status: 'COMPLETED',
          assignedToId: kaunterStaff?.id || null,
          startedAt: now,
          completedAt: now,
          slaDays: 0,
          slaDeadline: now,
          comments: 'Permohonan diterima di kaunter',
        },
        {
          applicationId: application.id,
          step: 'PT_FILE_OPENING',
          status: 'PENDING',
          assignedToId: ptStaff?.id || null,
          startedAt: now,
          slaDays: 3,
          slaDeadline: ptSlaDeadline,
        },
        {
          applicationId: application.id,
          step: 'PT_FILE_REGISTRATION',
          status: 'PENDING',
          assignedToId: ptStaff?.id || null,
          slaDays: 0,
        },
        {
          applicationId: application.id,
          step: 'PPKP_PROCESSING',
          status: 'PENDING',
          assignedToId: ppkpStaff?.id || null,
          slaDays: 4,
        },
        {
          applicationId: application.id,
          step: 'PPL_REVIEW',
          status: 'PENDING',
          assignedToId: pplStaff?.id || null,
          slaDays: 3,
        },
        {
          applicationId: application.id,
          step: 'PLB_DECISION',
          status: 'PENDING',
          assignedToId: plbStaff?.id || null,
          slaDays: 0,
        },
      ],
    });

    // Fetch with relations
    const result = await db.application.findUnique({
      where: { id: application.id },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
        ppkpStaff: true,
        pplStaff: true,
        plbStaff: true,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Application POST error:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
