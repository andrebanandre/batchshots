import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';
import { checkProStatus } from '../../utils/check-pro-status';

export async function GET() {

  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ isPro: false });
  }

  try {
    const isPro = await checkProStatus(userId);
    return NextResponse.json({ isPro });
  } catch (error) {
    console.error('Error checking pro status:', error);
    return NextResponse.json({ isPro: false });
  }
} 