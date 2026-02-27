import { NextResponse } from 'next/server';
import { deleteScheduleEntry } from '@/lib/storage/data-access';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = await deleteScheduleEntry(id);
  if (!success) {
    return NextResponse.json({ detail: 'Entry not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
