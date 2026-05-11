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

// PUT /api/application-types/[id] - Update an application type (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak. Hanya admin sahaja.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, label, ppkpRoute, isActive, sortOrder } = body;

    // Check if exists
    const existing = await db.applicationType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Jenis permohonan tidak dijumpai' }, { status: 404 });
    }

    // Check for duplicate code if code is being changed
    if (code && code.trim().toUpperCase() !== existing.code) {
      const duplicate = await db.applicationType.findUnique({ where: { code: code.trim().toUpperCase() } });
      if (duplicate) {
        return NextResponse.json({ error: 'Kod jenis permohonan ini sudah wujud' }, { status: 409 });
      }
    }

    // Validate ppkpRoute
    if (ppkpRoute && !['PPKP_L', 'PPKP_P'].includes(ppkpRoute)) {
      return NextResponse.json({ error: 'Penghalaan PPKP tidak sah. Gunakan PPKP_L atau PPKP_P.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (code !== undefined) updateData.code = code.trim().toUpperCase().replace(/\s+/g, '_');
    if (label !== undefined) updateData.label = label.trim();
    if (ppkpRoute !== undefined) updateData.ppkpRoute = ppkpRoute;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    // If code changed, update all applications using old code
    if (code && code.trim().toUpperCase() !== existing.code) {
      await db.application.updateMany({
        where: { applicationType: existing.code },
        data: { applicationType: code.trim().toUpperCase().replace(/\s+/g, '_') },
      });
    }

    const updated = await db.applicationType.update({
      where: { id },
      data: updateData,
    });

    invalidateApplicationTypeCache();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('ApplicationType PUT error:', error);
    return NextResponse.json({ error: 'Gagal mengemas kini jenis permohonan' }, { status: 500 });
  }
}

// DELETE /api/application-types/[id] - Delete an application type (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Akan ditolak. Hanya admin sahaja.' }, { status: 403 });
    }

    const { id } = await params;

    // Check if exists
    const existing = await db.applicationType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Jenis permohonan tidak dijumpai' }, { status: 404 });
    }

    // Check if any applications use this type
    const usageCount = await db.application.count({
      where: { applicationType: existing.code },
    });

    if (usageCount > 0) {
      // Soft delete - just deactivate instead
      await db.applicationType.update({
        where: { id },
        data: { isActive: false },
      });
      invalidateApplicationTypeCache();
      return NextResponse.json({
        message: `Jenis permohonan "${existing.label}" sedang digunakan oleh ${usageCount} permohonan. Ia telah dinyahaktifkan dan tidak akan muncul dalam dropdown.`,
        deactivated: true,
      });
    }

    await db.applicationType.delete({ where: { id } });
    invalidateApplicationTypeCache();
    return NextResponse.json({ message: 'Jenis permohonan berjaya dipadam' });
  } catch (error) {
    console.error('ApplicationType DELETE error:', error);
    return NextResponse.json({ error: 'Gagal memadam jenis permohonan' }, { status: 500 });
  }
}
