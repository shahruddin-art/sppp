import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateReferenceNo, getPPKPRole, getPPLRole, APPLICATION_TYPES, WORKFLOW_STEPS } from '@/lib/constants';
import { requireAuth, canCreateApplication, canListApplications, getApplicationFilterForRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// GET /api/applications - List all applications with filters
export async function GET(request: Request) {
  try {
    // ── Auth check ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    if (!canListApplications(user.role)) {
      return NextResponse.json({ error: 'Anda tidak mempunyai kebenaran untuk melihat senarai permohonan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    // Build role-based filter
    const roleFilter = getApplicationFilterForRole(user);

    const where: any = { ...roleFilter };
    if (status) where.status = status;
    // Enforce zone filter: PT users can only see their zone, ignore client-side zone param for other zones
    if (zone && user.role !== 'PT') where.zone = zone;
    if (type) where.applicationType = type;
    if (search) {
      where.OR = [
        { applicantName: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { fileNumber: { contains: search, mode: 'insensitive' } },
        { applicantIc: { contains: search, mode: 'insensitive' } },
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

// POST /api/applications - Create new application (KAUNTER only)
export async function POST(request: Request) {
  try {
    // ── Auth check: Only KAUNTER can create applications ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    if (!canCreateApplication(user.role)) {
      return NextResponse.json(
        { error: 'Hanya pengguna Kaunter boleh mendaftar permohonan baharu.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicantName, applicantIc, applicantPhone, applicantAddress, applicationType, businessType, zone } = body;

    // Validate required fields
    if (!applicantName || !applicantIc || !applicationType || !zone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate businessType for PERMOHONAN_BARU
    if (applicationType === 'PERMOHONAN_BARU' && !businessType) {
      return NextResponse.json({ error: 'Jenis Perniagaan diperlukan untuk Permohonan Baru' }, { status: 400 });
    }

    const referenceNo = generateReferenceNo();

    // Find PT staff for this zone
    const ptStaff = await db.user.findFirst({ where: { role: 'PT', zone, isActive: true } });
    const ppkpRole = getPPKPRole(applicationType);
    const ppkpStaff = await db.user.findFirst({ where: { role: ppkpRole, isActive: true } });
    const pplRole = getPPLRole(ppkpRole);
    const pplStaff = await db.user.findFirst({ where: { role: pplRole, isActive: true } });
    const plbStaff = await db.user.findFirst({ where: { role: 'PLB', isActive: true } });
    // Use the actual logged-in KAUNTER user (not the first KAUNTER found)
    const kaunterStaffId = user.id;

    const now = new Date();
    const ptSlaDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Use transaction for atomicity - application and steps must be created together
    const application = await db.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          referenceNo,
          applicantName,
          applicantIc,
          applicantPhone: applicantPhone || null,
          applicantAddress: applicantAddress || null,
          applicationType,
          businessType: businessType || null,
          zone,
          status: 'PENDING_PT',
          currentStep: 'PT_FILE_OPENING',
          ptStaffId: ptStaff?.id || null,
          ppkpStaffId: ppkpStaff?.id || null,
          pplStaffId: pplStaff?.id || null,
          plbStaffId: plbStaff?.id || null,
        },
      });

      // Create workflow steps — KAUNTER_RECEIPT uses the actual logged-in user
      await tx.workflowStep.createMany({
        data: [
          {
            applicationId: app.id,
            step: 'KAUNTER_RECEIPT',
            status: 'COMPLETED',
            assignedToId: kaunterStaffId,
            startedAt: now,
            completedAt: now,
            slaDays: 0,
            slaDeadline: now,
            comments: `Permohonan diterima di kaunter oleh ${user.name}`,
          },
          {
            applicationId: app.id,
            step: 'PT_FILE_OPENING',
            status: 'PENDING',
            assignedToId: ptStaff?.id || null,
            startedAt: now,
            slaDays: 3,
            slaDeadline: ptSlaDeadline,
          },
          {
            applicationId: app.id,
            step: 'PT_FILE_REGISTRATION',
            status: 'PENDING',
            assignedToId: ptStaff?.id || null,
            slaDays: 0,
          },
          {
            applicationId: app.id,
            step: 'PPKP_PROCESSING',
            status: 'PENDING',
            assignedToId: ppkpStaff?.id || null,
            slaDays: 4,
          },
          {
            applicationId: app.id,
            step: 'PPL_REVIEW',
            status: 'PENDING',
            assignedToId: pplStaff?.id || null,
            slaDays: 3,
          },
          {
            applicationId: app.id,
            step: 'PLB_DECISION',
            status: 'PENDING',
            assignedToId: plbStaff?.id || null,
            slaDays: 0,
          },
        ],
      });

      return app;
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
