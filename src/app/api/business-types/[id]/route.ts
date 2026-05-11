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

// PUT /api/business-types/[id] - Update a business type (Admin only)
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
    const { name, isActive, sortOrder } = body;

    // Check if exists
    const existing = await db.businessType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Jenis perniagaan tidak dijumpai' }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await db.businessType.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return NextResponse.json({ error: 'Jenis perniagaan ini sudah wujud' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const updated = await db.businessType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('BusinessType PUT error:', error);
    return NextResponse.json({ error: 'Gagal mengemas kini jenis perniagaan' }, { status: 500 });
  }
}

// DELETE /api/business-types/[id] - Delete a business type (Admin only)
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
    const existing = await db.businessType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Jenis perniagaan tidak dijumpai' }, { status: 404 });
    }

    // Check if any applications use this business type
    const usageCount = await db.application.count({
      where: { businessType: existing.name },
    });

    if (usageCount > 0) {
      // Soft delete - just deactivate instead
      await db.businessType.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: `Jenis perniagaan "${existing.name}" sedang digunakan oleh ${usageCount} permohonan. Ia telah dinyahaktifkan dan tidak akan muncul dalam dropdown.`,
        deactivated: true,
      });
    }

    await db.businessType.delete({ where: { id } });
    return NextResponse.json({ message: 'Jenis perniagaan berjaya dipadam' });
  } catch (error) {
    console.error('BusinessType DELETE error:', error);
    return NextResponse.json({ error: 'Gagal memadam jenis perniagaan' }, { status: 500 });
  }
}
