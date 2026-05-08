import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Berhasil log keluar' });

    // Clear cookie by setting Max-Age=0
    const cookieStr = 'session=; Path=/; Max-Age=0; SameSite=Lax';
    response.headers.set('Set-Cookie', cookieStr);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Ralat log keluar' },
      { status: 500 }
    );
  }
}
