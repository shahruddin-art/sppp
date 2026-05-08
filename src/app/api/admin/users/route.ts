import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, getSessionFromRequest } from '@/lib/auth';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get admin session from request
function getAdminSession(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/users - List all users (Admin only)
export async function GET(request: Request) {
  try {
    const session = getAdminSession(request);
    if (!session) {
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
    const session = getAdminSession(request);
    if (!session) {
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara' },
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
