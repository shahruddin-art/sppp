import { NextResponse } from 'next/server';
import { getSessionFromRequest, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Sesi tidak sah. Sila log masuk semula.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Sila lengkapkan semua ruangan.' },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Kata laluan baru mestilah sekurang-kurangnya 6 aksara.' },
        { status: 400 }
      );
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Kata laluan baru dan pengesahan kata laluan tidak sepadan.' },
        { status: 400 }
      );
    }

    // Validate new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'Kata laluan baru mestilah berbeza daripada kata laluan semasa.' },
        { status: 400 }
      );
    }

    // Get user from database and verify current password
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Pengguna tidak dijumpai.' },
        { status: 404 }
      );
    }

    // Verify current password
    if (!verifyPassword(currentPassword, dbUser.password)) {
      return NextResponse.json(
        { error: 'Kata laluan semasa tidak betul.' },
        { status: 400 }
      );
    }

    // Update password
    const hashedNewPassword = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword, updatedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Kata laluan berjaya ditukar.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Ralat pelayan. Sila cuba lagi.' },
      { status: 500 }
    );
  }
}
