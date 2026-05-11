import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WORKFLOW_STEPS, APPLICATION_TYPES, getPPKPRole, getPPLRole } from '@/lib/constants';
import { requireAuth, canListApplications } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// GET /api/applications/[id] - Get application detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth check ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    if (!canListApplications(authResult.user.role)) {
      return NextResponse.json({ error: 'Anda tidak mempunyai kebenaran.' }, { status: 403 });
    }

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

// PUT /api/applications/[id] - Update application (ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Pentadbir boleh mengemas kini permohonan.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      applicantName,
      applicantIc,
      applicantPhone,
      applicantAddress,
      applicationType,
      businessType,
      businessName,
      accountNo,
      zone,
      fileNumber,
      status,
      plbDecision,
      plbDecisionNotes,
    } = body;

    // Check application exists
    const existing = await db.application.findUnique({
      where: { id },
      include: { steps: { orderBy: { createdAt: 'asc' } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 });
    }

    // Build update data (only include fields that are provided)
    const updateData: Record<string, any> = {};
    if (applicantName !== undefined) updateData.applicantName = applicantName;
    if (applicantIc !== undefined) updateData.applicantIc = applicantIc;
    if (applicantPhone !== undefined) updateData.applicantPhone = applicantPhone || null;
    if (applicantAddress !== undefined) updateData.applicantAddress = applicantAddress || null;
    if (applicationType !== undefined) updateData.applicationType = applicationType;
    if (businessType !== undefined) updateData.businessType = businessType || null;
    if (businessName !== undefined) updateData.businessName = businessName || null;
    if (accountNo !== undefined) updateData.accountNo = accountNo || null;
    if (zone !== undefined) updateData.zone = zone;
    if (fileNumber !== undefined) updateData.fileNumber = fileNumber || null;
    if (status !== undefined) updateData.status = status;
    if (plbDecision !== undefined) updateData.plbDecision = plbDecision || null;
    if (plbDecisionNotes !== undefined) updateData.plbDecisionNotes = plbDecisionNotes || null;

    // ── Handle applicationType change: re-route PPKP/PPL staff ──
    const newApplicationType = applicationType || existing.applicationType;
    const typeChanged = applicationType && applicationType !== existing.applicationType;

    if (typeChanged) {
      const ppkpRole = getPPKPRole(newApplicationType);
      const pplRole = getPPLRole(ppkpRole);

      // Find the correct PPKP and PPL staff for the new type
      const ppkpStaff = await db.user.findFirst({ where: { role: ppkpRole, isActive: true } });
      const pplStaff = await db.user.findFirst({ where: { role: pplRole, isActive: true } });

      updateData.ppkpStaffId = ppkpStaff?.id || null;
      updateData.pplStaffId = pplStaff?.id || null;

      // Update workflow step assignments for PPKP and PPL
      // PPKP step
      const ppkpStep = existing.steps.find(s => s.step === 'PPKP_PROCESSING');
      if (ppkpStep) {
        await db.workflowStep.update({
          where: { id: ppkpStep.id },
          data: { assignedToId: ppkpStaff?.id || null },
        });
      }

      // PPL step
      const pplStep = existing.steps.find(s => s.step === 'PPL_REVIEW');
      if (pplStep) {
        await db.workflowStep.update({
          where: { id: pplStep.id },
          data: { assignedToId: pplStaff?.id || null },
        });
      }
    }

    // ── Handle zone change: re-assign PT staff ──
    const newZone = zone || existing.zone;
    const zoneChanged = zone && zone !== existing.zone;

    if (zoneChanged) {
      const ptStaff = await db.user.findFirst({ where: { role: 'PT', zone: newZone, isActive: true } });
      updateData.ptStaffId = ptStaff?.id || null;

      // Update PT step assignments
      const ptFileStep = existing.steps.find(s => s.step === 'PT_FILE_OPENING');
      if (ptFileStep) {
        await db.workflowStep.update({
          where: { id: ptFileStep.id },
          data: { assignedToId: ptStaff?.id || null },
        });
      }

      const ptRegStep = existing.steps.find(s => s.step === 'PT_FILE_REGISTRATION');
      if (ptRegStep) {
        await db.workflowStep.update({
          where: { id: ptRegStep.id },
          data: { assignedToId: ptStaff?.id || null },
        });
      }
    }

    const updated = await db.application.update({
      where: { id },
      data: updateData,
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: { select: { id: true, name: true, role: true } },
        ppkpStaff: { select: { id: true, name: true, role: true } },
        pplStaff: { select: { id: true, name: true, role: true } },
        plbStaff: { select: { id: true, name: true, role: true } },
      },
    });

    // Add computed fields for response
    const currentStepData = updated.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
    const overdueSteps = updated.steps.filter(s =>
      s.status === 'OVERDUE' || (s.slaDeadline && new Date(s.slaDeadline) < new Date() && s.status !== 'COMPLETED')
    );

    let remainingDays: number | null = null;
    if (currentStepData?.slaDeadline) {
      const diff = new Date(currentStepData.slaDeadline).getTime() - Date.now();
      remainingDays = Math.round(diff / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    const enriched = {
      ...updated,
      currentStepStatus: currentStepData?.status || null,
      currentStepName: currentStepData ? (WORKFLOW_STEPS as any)[currentStepData.step]?.label || currentStepData.step : null,
      isOverdue: overdueSteps.length > 0,
      remainingDays,
      applicationTypeLabel: (APPLICATION_TYPES as any)[updated.applicationType]?.label || updated.applicationType,
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Application PUT error:', error);
    return NextResponse.json({ error: 'Gagal mengemas kini permohonan' }, { status: 500 });
  }
}

// DELETE /api/applications/[id] - Delete application (ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Pentadbir boleh memadam permohonan.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check application exists
    const existing = await db.application.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 });
    }

    // Delete with cascade (WorkflowStep has onDelete: Cascade)
    await db.application.delete({ where: { id } });

    return NextResponse.json({ message: 'Permohonan berjaya dipadam' });
  } catch (error) {
    console.error('Application DELETE error:', error);
    return NextResponse.json({ error: 'Gagal memadam permohonan' }, { status: 500 });
  }
}
