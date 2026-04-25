import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, canPerformAction, canPerformActionOnZone, isActionStatusValid, WorkflowAction } from '@/lib/rbac';

// POST /api/applications/[id]/action - Process workflow action
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth check ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    const { id } = await params;
    const body = await request.json();
    const { action, fileNumber, comments, plbDecision, plbDecisionNotes } = body;

    // ── Validate action type ──
    const validActions: WorkflowAction[] = ['OPEN_FILE', 'REGISTER_FILE', 'PPKP_COMPLETE', 'PPL_REVIEW_COMPLETE', 'PLB_DECIDE'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Tindakan tidak sah' }, { status: 400 });
    }

    // ── Role authorization check ──
    if (!canPerformAction(user.role, action)) {
      return NextResponse.json(
        { error: `Peranan '${user.role}' tidak dibenarkan untuk melakukan tindakan '${action}'.` },
        { status: 403 }
      );
    }

    const application = await db.application.findUnique({
      where: { id },
      include: { steps: { orderBy: { createdAt: 'asc' } } },
    });

    if (!application) {
      return NextResponse.json({ error: 'Permohonan tidak dijumpai' }, { status: 404 });
    }

    // ── Validate application status matches the action ──
    if (!isActionStatusValid(action, application.status)) {
      return NextResponse.json(
        { error: `Tindakan '${action}' tidak sah untuk permohonan berstatus '${application.status}'.` },
        { status: 400 }
      );
    }

    // ── Zone check for PT actions ──
    if ((action === 'OPEN_FILE' || action === 'REGISTER_FILE') && !canPerformActionOnZone(user, application.zone)) {
      return NextResponse.json(
        { error: `Anda (Zon ${user.zone}) tidak dibenarkan untuk memproses permohonan di Zon ${application.zone}.` },
        { status: 403 }
      );
    }

    // ── Assignment check for PPKP/PPL/PLB ──
    if (action === 'PPKP_COMPLETE' && application.ppkpStaffId && application.ppkpStaffId !== user.id) {
      // Allow if same role but different user (in case of reassignment), but log warning
      // Strict check: only the assigned PPKP can complete
      const ppkpStaff = await db.user.findUnique({ where: { id: application.ppkpStaffId } });
      if (ppkpStaff && ppkpStaff.role === user.role && ppkpStaff.id !== user.id) {
        return NextResponse.json(
          { error: 'Permohonan ini ditugaskan kepada staf PPKP yang lain.' },
          { status: 403 }
        );
      }
    }

    if (action === 'PPL_REVIEW_COMPLETE' && application.pplStaffId && application.pplStaffId !== user.id) {
      const pplStaff = await db.user.findUnique({ where: { id: application.pplStaffId } });
      if (pplStaff && pplStaff.role === user.role && pplStaff.id !== user.id) {
        return NextResponse.json(
          { error: 'Permohonan ini ditugaskan kepada staf PPL yang lain.' },
          { status: 403 }
        );
      }
    }

    if (action === 'PLB_DECIDE' && application.plbStaffId && application.plbStaffId !== user.id) {
      const plbStaff = await db.user.findUnique({ where: { id: application.plbStaffId } });
      if (plbStaff && plbStaff.role === 'PLB' && plbStaff.id !== user.id) {
        return NextResponse.json(
          { error: 'Permohonan ini ditugaskan kepada Pengarah Pelesenan Bandaraya yang lain.' },
          { status: 403 }
        );
      }
    }

    // ── PT assignment check ──
    if ((action === 'OPEN_FILE' || action === 'REGISTER_FILE') && application.ptStaffId && application.ptStaffId !== user.id) {
      // Allow if the user is in the same zone but different assignment
      // (there could be multiple PT in a zone)
    }

    const now = new Date();

    switch (action) {
      case 'OPEN_FILE': {
        // PT opens the file
        const step = application.steps.find(s => s.step === 'PT_FILE_OPENING' && s.status !== 'COMPLETED');
        if (!step) {
          return NextResponse.json({ error: 'Langkah tidak sah' }, { status: 400 });
        }

        await db.workflowStep.update({
          where: { id: step.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            comments: comments || `Fail berjaya dibuka oleh ${user.name}`,
          },
        });

        // Start PT file registration step
        const regStep = application.steps.find(s => s.step === 'PT_FILE_REGISTRATION');
        if (regStep) {
          await db.workflowStep.update({
            where: { id: regStep.id },
            data: {
              status: 'IN_PROGRESS',
              startedAt: now,
            },
          });
        }

        await db.application.update({
          where: { id },
          data: { status: 'PT_PROCESSING', currentStep: 'PT_FILE_REGISTRATION', updatedAt: now },
        });
        break;
      }

      case 'REGISTER_FILE': {
        // PT registers file number
        if (!fileNumber) {
          return NextResponse.json({ error: 'Nombor fail diperlukan' }, { status: 400 });
        }

        const regStep = application.steps.find(s => s.step === 'PT_FILE_REGISTRATION' && s.status !== 'COMPLETED');
        if (!regStep) {
          return NextResponse.json({ error: 'Langkah tidak sah' }, { status: 400 });
        }

        await db.workflowStep.update({
          where: { id: regStep.id },
          data: {
            status: 'COMPLETED',
            startedAt: now,
            completedAt: now,
            comments: `No. Fail: ${fileNumber} (didaftarkan oleh ${user.name})`,
          },
        });

        // Start PPKP processing
        const ppkpStep = application.steps.find(s => s.step === 'PPKP_PROCESSING');
        const ppkpSlaDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
        if (ppkpStep) {
          await db.workflowStep.update({
            where: { id: ppkpStep.id },
            data: {
              status: 'IN_PROGRESS',
              startedAt: now,
              slaDeadline: ppkpSlaDeadline,
            },
          });
        }

        await db.application.update({
          where: { id },
          data: {
            status: 'PPKP_PROCESSING',
            currentStep: 'PPKP_PROCESSING',
            fileNumber,
            updatedAt: now,
          },
        });
        break;
      }

      case 'PPKP_COMPLETE': {
        // PPKP completes processing, sends to PPL
        const ppkpStep = application.steps.find(s => s.step === 'PPKP_PROCESSING' && s.status !== 'COMPLETED');
        if (!ppkpStep) {
          return NextResponse.json({ error: 'Langkah tidak sah' }, { status: 400 });
        }

        await db.workflowStep.update({
          where: { id: ppkpStep.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            comments: comments || `Pemprosesan PPKP selesai oleh ${user.name}`,
          },
        });

        // Start PPL review
        const pplStep = application.steps.find(s => s.step === 'PPL_REVIEW');
        const pplSlaDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (pplStep) {
          await db.workflowStep.update({
            where: { id: pplStep.id },
            data: {
              status: 'IN_PROGRESS',
              startedAt: now,
              slaDeadline: pplSlaDeadline,
            },
          });
        }

        await db.application.update({
          where: { id },
          data: { status: 'PPL_REVIEW', currentStep: 'PPL_REVIEW', updatedAt: now },
        });
        break;
      }

      case 'PPL_REVIEW_COMPLETE': {
        // PPL completes review, sends to PLB
        const pplStep = application.steps.find(s => s.step === 'PPL_REVIEW' && s.status !== 'COMPLETED');
        if (!pplStep) {
          return NextResponse.json({ error: 'Langkah tidak sah' }, { status: 400 });
        }

        await db.workflowStep.update({
          where: { id: pplStep.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            comments: comments || `Ulasan PPL diberikan oleh ${user.name}`,
          },
        });

        // Start PLB decision
        const plbStep = application.steps.find(s => s.step === 'PLB_DECISION');
        if (plbStep) {
          await db.workflowStep.update({
            where: { id: plbStep.id },
            data: {
              status: 'IN_PROGRESS',
              startedAt: now,
            },
          });
        }

        await db.application.update({
          where: { id },
          data: { status: 'PLB_DECISION', currentStep: 'PLB_DECISION', updatedAt: now },
        });
        break;
      }

      case 'PLB_DECIDE': {
        // PLB makes decision
        if (!plbDecision) {
          return NextResponse.json({ error: 'Keputusan diperlukan' }, { status: 400 });
        }

        const plbStep = application.steps.find(s => s.step === 'PLB_DECISION' && s.status !== 'COMPLETED');
        if (!plbStep) {
          return NextResponse.json({ error: 'Langkah tidak sah' }, { status: 400 });
        }

        await db.workflowStep.update({
          where: { id: plbStep.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            comments: plbDecisionNotes || `Keputusan: ${plbDecision} (oleh ${user.name})`,
          },
        });

        await db.application.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            currentStep: 'PLB_DECISION',
            plbDecision,
            plbDecisionNotes: plbDecisionNotes || null,
            updatedAt: now,
          },
        });
        break;
      }

      default:
        return NextResponse.json({ error: 'Tindakan tidak sah' }, { status: 400 });
    }

    // Return updated application
    const updated = await db.application.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
        ppkpStaff: true,
        pplStaff: true,
        plbStaff: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Action POST error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
