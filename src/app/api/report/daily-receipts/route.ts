import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

// GET /api/report/daily-receipts - Daily application receipt report
export async function GET(request: Request) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const zone = searchParams.get('zone');

    // Default: last 30 days if no dates provided
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Build where clause
    const where: any = {
      createdAt: { gte: start, lt: end },
    };

    // Zone filtering based on role
    if (user.role === 'PT' && user.zone) {
      where.zone = user.zone;
    } else if (zone && zone !== 'all') {
      where.zone = zone;
    }

    // Fetch applications with steps
    const applications = await db.application.findMany({
      where,
      include: {
        steps: { orderBy: { createdAt: 'asc' } },
        ptStaff: { select: { name: true } },
        ppkpStaff: { select: { name: true } },
        pplStaff: { select: { name: true } },
        plbStaff: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData: Record<string, {
      date: string;
      applications: typeof applications;
      count: number;
      byType: Record<string, number>;
      byZone: Record<string, number>;
      byStatus: Record<string, number>;
    }> = {};

    for (const app of applications) {
      const dateKey = new Date(app.createdAt).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          applications: [],
          count: 0,
          byType: {},
          byZone: {},
          byStatus: {},
        };
      }
      dailyData[dateKey].applications.push(app);
      dailyData[dateKey].count++;
      dailyData[dateKey].byType[app.applicationType] = (dailyData[dateKey].byType[app.applicationType] || 0) + 1;
      dailyData[dateKey].byZone[app.zone] = (dailyData[dateKey].byZone[app.zone] || 0) + 1;
      dailyData[dateKey].byStatus[app.status] = (dailyData[dateKey].byStatus[app.status] || 0) + 1;
    }

    // Fill in missing dates (days with 0 applications)
    const allDates: string[] = [];
    const current = new Date(start);
    while (current < end) {
      const dateKey = current.toISOString().split('T')[0];
      allDates.push(dateKey);
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          applications: [],
          count: 0,
          byType: {},
          byZone: {},
          byStatus: {},
        };
      }
      current.setDate(current.getDate() + 1);
    }

    // Sort by date descending
    const sortedDays = allDates
      .map(d => dailyData[d])
      .sort((a, b) => b.date.localeCompare(a.date));

    // Summary totals
    const summary = {
      totalApplications: applications.length,
      totalDays: allDates.length,
      byType: {} as Record<string, number>,
      byZone: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    for (const app of applications) {
      summary.byType[app.applicationType] = (summary.byType[app.applicationType] || 0) + 1;
      summary.byZone[app.zone] = (summary.byZone[app.zone] || 0) + 1;
      summary.byStatus[app.status] = (summary.byStatus[app.status] || 0) + 1;
    }

    return NextResponse.json({
      startDate: start.toISOString().split('T')[0],
      endDate: (endDate || now.toISOString().split('T')[0]),
      days: sortedDays,
      summary,
    });
  } catch (error) {
    console.error('Daily receipts report error:', error);
    return NextResponse.json({ error: 'Gagal menjana laporan harian' }, { status: 500 });
  }
}
