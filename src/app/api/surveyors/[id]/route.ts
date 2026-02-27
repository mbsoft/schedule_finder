import { NextResponse } from 'next/server';
import { getSurveyor, updateSurveyor } from '@/lib/storage/data-access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const surveyor = await getSurveyor(id);
  if (!surveyor) {
    return NextResponse.json({ detail: 'Surveyor not found' }, { status: 404 });
  }
  return NextResponse.json(surveyor);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();
  const result = await updateSurveyor(id, updates);
  if (!result) {
    return NextResponse.json({ detail: 'Surveyor not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}
