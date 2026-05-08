import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan kata laluan diperlukan' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau kata laluan tidak sah' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Akaun telah dinyahaktifkan' },
        { status: 401 }
      );
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Username atau kata laluan tidak sah' },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      zone: user.zone,
    });

    // Set cookie - use Secure flag in production (HTTPS)
    const maxAge = 60 * 60 * 24; // 24 hours
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    const cookieStr = `session=${token}; Path=/; Expires=${expires}; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;

    const response = NextResponse.json({
      token,  // Send token in response body for client-side storage
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        zone: user.zone,
        email: user.email,
        phone: user.phone,
      },
    });

    response.headers.set('Set-Cookie', cookieStr);

    console.log('[Login] Session token set for user:', user.username, 'role:', user.role);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ralat log masuk' },
      { status: 500 }
    );
  }
}
