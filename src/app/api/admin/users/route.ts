import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest, hashPassword } from '@/lib/auth';

// GET /api/admin/users - List all users (Admin only)
export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const users = await db.user.findMany({
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
      orderBy: [{ role: 'asc' }, { zone: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user (Admin only)
export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akan ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, role, zone, email, phone } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Username, kata laluan, nama, dan peranan diperlukan' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: 'Username sudah wujud' },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);

    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
        zone: zone || null,
        email: email || null,
        phone: phone || null,
      },
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
