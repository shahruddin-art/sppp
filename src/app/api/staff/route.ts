import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, canViewStaff } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    // ── Auth check ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    if (!canViewStaff(authResult.user.role)) {
      return NextResponse.json({ error: 'Anda tidak mempunyai kebenaran.' }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        zone: true,
        email: true,
        phone: true,
      },
      orderBy: [{ role: 'asc' }, { zone: 'asc' }],
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}
