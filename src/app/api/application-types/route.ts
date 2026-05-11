import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { invalidateApplicationTypeCache } from '@/lib/app-type-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAdminSession(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET /api/application-types - List all application types (public for dropdowns)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const applicationTypes = await db.applicationType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json(applicationTypes);
  } catch (error) {
    console.error('ApplicationType GET error:', error);
    return NextResponse.json({ error: 'Gagal memuatkan jenis permohonan' }, { status: 500 });
  }
}

// POST /api/application-types - Create a new application type (Admin only)
export async function POST(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak. Hanya admin sahaja.' }, { status: 403 });
    }

    const body = await request.json();
    const { code, label, ppkpRoute, sortOrder } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Kod jenis permohonan diperlukan' }, { status: 400 });
    }

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Label jenis permohonan diperlukan' }, { status: 400 });
    }

    const validPpkpRoutes = ['PPKP_L', 'PPKP_P'];
    const route = ppkpRoute || 'PPKP_L';
    if (!validPpkpRoutes.includes(route)) {
      return NextResponse.json({ error: 'Penghalaan PPKP tidak sah. Gunakan PPKP_L atau PPKP_P.' }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await db.applicationType.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Kod jenis permohonan ini sudah wujud' }, { status: 409 });
    }

    const applicationType = await db.applicationType.create({
      data: {
        code: code.trim().toUpperCase().replace(/\s+/g, '_'),
        label: label.trim(),
        ppkpRoute: route,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      },
    });

    invalidateApplicationTypeCache();

    return NextResponse.json(applicationType, { status: 201 });
  } catch (error) {
    console.error('ApplicationType POST error:', error);
    return NextResponse.json({ error: 'Gagal menambah jenis permohonan' }, { status: 500 });
  }
}
