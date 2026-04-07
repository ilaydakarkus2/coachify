import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await prisma.$connect();
    const count = await prisma.user.count();

    return NextResponse.json({
      success: true,
      message: 'Supabase bağlantısı başarılı!',
      userCount: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Bağlantı hatası',
      error: error.message,
    }, { status: 500 });
  }
}
