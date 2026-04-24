import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const staff = await db.staff.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { zone: 'asc' }],
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}
