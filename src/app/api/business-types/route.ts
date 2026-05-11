import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAdminSession(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET /api/business-types - List all business types (public for dropdowns)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const businessTypes = await db.businessType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(businessTypes);
  } catch (error) {
    console.error('BusinessType GET error:', error);
    return NextResponse.json({ error: 'Gagal memuatkan jenis perniagaan' }, { status: 500 });
  }
}

// POST /api/business-types - Create a new business type (Admin only)
export async function POST(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak. Hanya admin sahaja.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama jenis perniagaan diperlukan' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.businessType.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'Jenis perniagaan ini sudah wujud' }, { status: 409 });
    }

    const businessType = await db.businessType.create({
      data: {
        name: name.trim(),
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      },
    });

    return NextResponse.json(businessType, { status: 201 });
  } catch (error) {
    console.error('BusinessType POST error:', error);
    return NextResponse.json({ error: 'Gagal menambah jenis perniagaan' }, { status: 500 });
  }
}
