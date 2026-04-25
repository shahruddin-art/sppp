import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest, hashPassword } from '@/lib/auth';

// GET /api/admin/users/[id] - Get single user detail (Admin only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        zone: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, role, zone, email, phone, isActive, password } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (zone !== undefined) updateData.zone = zone || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = hashPassword(password);

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        zone: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin user PUT error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Deactivate or permanently delete user (Admin only)
// Use ?permanent=true to permanently delete
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 });
    }

    // Prevent deleting own account
    if (permanent && existing.id === session.userId) {
      return NextResponse.json({ error: 'Anda tidak boleh memadam akaun sendiri' }, { status: 400 });
    }

    if (permanent) {
      // Check if user has any assigned workflow steps before deleting
      const stepCount = await db.workflowStep.count({
        where: { assignedToId: id },
      });
      const ptAppCount = await db.application.count({ where: { ptStaffId: id } });
      const ppkpAppCount = await db.application.count({ where: { ppkpStaffId: id } });
      const pplAppCount = await db.application.count({ where: { pplStaffId: id } });
      const plbAppCount = await db.application.count({ where: { plbStaffId: id } });

      if (stepCount > 0 || ptAppCount > 0 || ppkpAppCount > 0 || pplAppCount > 0 || plbAppCount > 0) {
        // Unassign from all references first, then delete
        await db.workflowStep.updateMany({
          where: { assignedToId: id },
          data: { assignedToId: null },
        });
        await db.application.updateMany({
          where: { ptStaffId: id },
          data: { ptStaffId: null },
        });
        await db.application.updateMany({
          where: { ppkpStaffId: id },
          data: { ppkpStaffId: null },
        });
        await db.application.updateMany({
          where: { pplStaffId: id },
          data: { pplStaffId: null },
        });
        await db.application.updateMany({
          where: { plbStaffId: id },
          data: { plbStaffId: null },
        });
      }

      await db.user.delete({ where: { id } });
      return NextResponse.json({ message: 'Pengguna berjaya dipadam secara kekal', deleted: true });
    } else {
      // Soft delete (deactivate)
      const user = await db.user.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          zone: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(user);
    }
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
