import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();

    // Get all applications with their steps and staff
    const applications = await db.application.findMany({
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: true,
        ppkpStaff: true,
        pplStaff: true,
        poStaff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const app of applications) {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    }

    // Count by zone
    const zoneCounts: Record<string, number> = {};
    for (const app of applications) {
      zoneCounts[app.zone] = (zoneCounts[app.zone] || 0) + 1;
    }

    // Count by application type
    const typeCounts: Record<string, number> = {};
    for (const app of applications) {
      typeCounts[app.applicationType] = (typeCounts[app.applicationType] || 0) + 1;
    }

    // Calculate SLA compliance
    let totalSteps = 0;
    let withinSLA = 0;
    let overdueSteps = 0;
    let completedOnTime = 0;

    for (const app of applications) {
      for (const step of app.steps) {
        if (step.slaDays > 0) {
          totalSteps++;
          if (step.status === 'COMPLETED' && step.completedAt && step.slaDeadline) {
            if (new Date(step.completedAt) <= new Date(step.slaDeadline)) {
              completedOnTime++;
              withinSLA++;
            }
          } else if (step.status === 'OVERDUE' || (step.status === 'IN_PROGRESS' && step.slaDeadline && new Date(step.slaDeadline) < now)) {
            overdueSteps++;
          } else if (step.status === 'IN_PROGRESS' && step.slaDeadline && new Date(step.slaDeadline) >= now) {
            withinSLA++;
          } else if (step.status === 'PENDING' && step.slaDeadline && new Date(step.slaDeadline) >= now) {
            withinSLA++;
          } else if (step.status === 'PENDING' && step.slaDeadline && new Date(step.slaDeadline) < now) {
            overdueSteps++;
          }
        }
      }
    }

    const slaComplianceRate = totalSteps > 0 ? Math.round((withinSLA / totalSteps) * 100) : 100;

    // Calculate average processing time (completed applications only)
    const completedApps = applications.filter(a => a.status === 'COMPLETED');
    let totalProcessingDays = 0;
    let completedWithSteps = 0;

    for (const app of completedApps) {
      const firstStep = app.steps[0];
      const lastStep = app.steps[app.steps.length - 1];
      if (firstStep?.startedAt && lastStep?.completedAt) {
        const days = (new Date(lastStep.completedAt).getTime() - new Date(firstStep.startedAt).getTime()) / (1000 * 60 * 60 * 24);
        totalProcessingDays += days;
        completedWithSteps++;
      }
    }

    const avgProcessingDays = completedWithSteps > 0 ? Math.round((totalProcessingDays / completedWithSteps) * 10) / 10 : 0;

    // Active applications (not completed)
    const activeApps = applications.filter(a => a.status !== 'COMPLETED' && a.status !== 'REJECTED');

    // Applications with overdue steps
    const overdueAppIds = new Set<string>();
    for (const app of applications) {
      for (const step of app.steps) {
        if (step.status === 'OVERDUE' || (step.slaDeadline && new Date(step.slaDeadline) < now && (step.status === 'IN_PROGRESS' || step.status === 'PENDING'))) {
          overdueAppIds.add(app.id);
        }
      }
    }

    // SLA performance by step type
    const stepPerformance: Record<string, { total: number; onTime: number; overdue: number; avgDays: number }> = {};
    for (const app of applications) {
      for (const step of app.steps) {
        if (step.slaDays > 0) {
          if (!stepPerformance[step.step]) {
            stepPerformance[step.step] = { total: 0, onTime: 0, overdue: 0, avgDays: 0 };
          }
          stepPerformance[step.step].total++;
          if (step.status === 'COMPLETED' && step.completedAt && step.startedAt) {
            const days = (new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / (1000 * 60 * 60 * 24);
            stepPerformance[step.step].avgDays += days;
            if (new Date(step.completedAt) <= new Date(step.slaDeadline!)) {
              stepPerformance[step.step].onTime++;
            } else {
              stepPerformance[step.step].overdue++;
            }
          } else if (step.status === 'OVERDUE' || (step.slaDeadline && new Date(step.slaDeadline) < now && step.status !== 'COMPLETED')) {
            stepPerformance[step.step].overdue++;
          } else {
            stepPerformance[step.step].onTime++;
          }
        }
      }
    }

    // Calculate averages
    for (const key of Object.keys(stepPerformance)) {
      const sp = stepPerformance[key];
      const completed = sp.total - (sp.total - sp.onTime - sp.overdue);
      sp.avgDays = completed > 0 ? Math.round((sp.avgDays / Math.max(sp.onTime + sp.overdue, 1)) * 10) / 10 : 0;
    }

    // Recent activity (last 5 step completions)
    const recentActivities: Array<{ appName: string; step: string; completedAt: Date; staffName: string }> = [];
    for (const app of applications) {
      for (const step of app.steps) {
        if (step.completedAt) {
          const staffName = step.assignedToId ? 'Staf' : 'Sistem';
          recentActivities.push({
            appName: app.applicantName,
            step: step.step,
            completedAt: step.completedAt,
            staffName,
          });
        }
      }
    }
    recentActivities.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const recentActivity = recentActivities.slice(0, 10);

    return NextResponse.json({
      summary: {
        totalApplications: applications.length,
        activeApplications: activeApps.length,
        completedApplications: completedApps.length,
        overdueApplications: overdueAppIds.size,
        slaComplianceRate,
        avgProcessingDays,
      },
      statusCounts,
      zoneCounts,
      typeCounts,
      stepPerformance,
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
