import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WORKFLOW_STEPS } from '@/lib/constants';
import { getApplicationTypeMap } from '@/lib/app-type-cache';
import { requireAuth, canViewPerformance } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // ── Auth check ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    if (!canViewPerformance(authResult.user.role)) {
      return NextResponse.json({ error: 'Anda tidak mempunyai kebenaran untuk melihat data prestasi.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    const now = new Date();
    const periodStart = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    const applications = await db.application.findMany({
      where: {
        createdAt: { gte: periodStart },
      },
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
        ppkpStaff: true,
        pplStaff: true,
        plbStaff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Performance by zone
    const zonePerformance: Record<string, { total: number; completed: number; overdue: number; avgDays: number; slaRate: number }> = {};
    for (const zone of ['A', 'B', 'C', 'D', 'E']) {
      const zoneApps = applications.filter(a => a.zone === zone);
      const completed = zoneApps.filter(a => a.status === 'COMPLETED').length;
      const overdue = zoneApps.filter(a => {
        return a.steps.some(s =>
          s.status === 'OVERDUE' || (s.slaDeadline && new Date(s.slaDeadline) < now && s.status !== 'COMPLETED')
        );
      }).length;

      let totalDays = 0;
      let daysCount = 0;
      let withinSla = 0;
      let slaTotal = 0;

      for (const app of zoneApps) {
        for (const step of app.steps) {
          if (step.slaDays > 0) {
            slaTotal++;
            if (step.status === 'COMPLETED' && step.completedAt && step.slaDeadline) {
              if (new Date(step.completedAt) <= new Date(step.slaDeadline)) {
                withinSla++;
              }
              if (step.startedAt) {
                totalDays += (new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / (1000 * 60 * 60 * 24);
                daysCount++;
              }
            } else if (step.slaDeadline && new Date(step.slaDeadline) >= now) {
              withinSla++;
            }
          }
        }
      }

      zonePerformance[zone] = {
        total: zoneApps.length,
        completed,
        overdue,
        avgDays: daysCount > 0 ? Math.round((totalDays / daysCount) * 10) / 10 : 0,
        slaRate: slaTotal > 0 ? Math.round((withinSla / slaTotal) * 100) : 100,
      };
    }

    // Performance by step type
    const stepPerformance: Record<string, { total: number; completedOnTime: number; completedLate: number; inProgress: number; overdue: number; avgDays: number }> = {};
    for (const app of applications) {
      for (const step of app.steps) {
        if (step.slaDays > 0) {
          if (!stepPerformance[step.step]) {
            stepPerformance[step.step] = { total: 0, completedOnTime: 0, completedLate: 0, inProgress: 0, overdue: 0, avgDays: 0 };
          }
          const sp = stepPerformance[step.step];
          sp.total++;

          if (step.status === 'COMPLETED' && step.completedAt && step.startedAt) {
            const days = (new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / (1000 * 60 * 60 * 24);
            sp.avgDays += days;
            if (step.slaDeadline && new Date(step.completedAt) <= new Date(step.slaDeadline)) {
              sp.completedOnTime++;
            } else {
              sp.completedLate++;
            }
          } else if (step.status === 'OVERDUE' || (step.slaDeadline && new Date(step.slaDeadline) < now)) {
            sp.overdue++;
          } else {
            sp.inProgress++;
          }
        }
      }
    }

    // Calculate averages
    for (const key of Object.keys(stepPerformance)) {
      const sp = stepPerformance[key];
      const completedCount = sp.completedOnTime + sp.completedLate;
      sp.avgDays = completedCount > 0 ? Math.round((sp.avgDays / completedCount) * 10) / 10 : 0;
    }

    // Performance by application type
    const appTypeMap = await getApplicationTypeMap();
    const typePerformance: Record<string, { total: number; completed: number; avgDays: number }> = {};
    for (const app of applications) {
      const typeLabel = appTypeMap[app.applicationType]?.label || app.applicationType;
      if (!typePerformance[typeLabel]) {
        typePerformance[typeLabel] = { total: 0, completed: 0, avgDays: 0 };
      }
      typePerformance[typeLabel].total++;
      if (app.status === 'COMPLETED') {
        typePerformance[typeLabel].completed++;
        const firstStep = app.steps[0];
        const lastStep = app.steps[app.steps.length - 1];
        if (firstStep?.startedAt && lastStep?.completedAt) {
          typePerformance[typeLabel].avgDays += (new Date(lastStep.completedAt).getTime() - new Date(firstStep.startedAt).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
    }

    for (const key of Object.keys(typePerformance)) {
      if (typePerformance[key].completed > 0) {
        typePerformance[key].avgDays = Math.round((typePerformance[key].avgDays / typePerformance[key].completed) * 10) / 10;
      }
    }

    // Daily throughput - applications processed per day in the period
    const dailyThroughput: Array<{ date: string; received: number; completed: number }> = [];
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = dayStart.toISOString().split('T')[0];

      const received = applications.filter(a => {
        const created = new Date(a.createdAt);
        return created >= dayStart && created < dayEnd;
      }).length;

      const completed = applications.filter(a => {
        const lastStep = a.steps[a.steps.length - 1];
        return lastStep?.completedAt && new Date(lastStep.completedAt) >= dayStart && new Date(lastStep.completedAt) < dayEnd;
      }).length;

      dailyThroughput.push({ date: dateStr, received, completed });
    }

    return NextResponse.json({
      period: parseInt(period),
      zonePerformance,
      stepPerformance,
      typePerformance,
      dailyThroughput,
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
