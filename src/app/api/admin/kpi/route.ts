import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get admin session from request
function getAdminSession(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/kpi - List all KPI configs (Admin only)
export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const configs = await db.kpiConfig.findMany({
      orderBy: { stepName: 'asc' },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Admin KPI GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPI configs' }, { status: 500 });
  }
}

// POST /api/admin/kpi - Create or update KPI config (Admin only)
export async function POST(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { stepName, slaDays, warningDays } = body;

    if (!stepName || slaDays === undefined || warningDays === undefined) {
      return NextResponse.json(
        { error: 'stepName, slaDays, dan warningDays diperlukan' },
        { status: 400 }
      );
    }

    // Upsert: create or update based on unique stepName
    const config = await db.kpiConfig.upsert({
      where: { stepName },
      update: {
        slaDays: parseFloat(slaDays),
        warningDays: parseFloat(warningDays),
      },
      create: {
        stepName,
        slaDays: parseFloat(slaDays),
        warningDays: parseFloat(warningDays),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Admin KPI POST error:', error);
    return NextResponse.json({ error: 'Failed to save KPI config' }, { status: 500 });
  }
}
