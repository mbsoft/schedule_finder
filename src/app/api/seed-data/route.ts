import { NextResponse } from 'next/server';
import { seedData } from '@/lib/business/seed-data';

export async function POST() {
  await seedData();
  return NextResponse.json({ success: true, message: 'Data seeded successfully' });
}
