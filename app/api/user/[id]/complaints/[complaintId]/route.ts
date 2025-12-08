import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; complaintId: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;
    const complaintId = params.complaintId;

    const deleteQuery = await db.query(
      `DELETE FROM complaints
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [complaintId, userId]
    );

    if (deleteQuery.rowCount === 0) {
      return NextResponse.json(
        { error: 'Complaint not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Complaint deleted successfully' });

  } catch (error) {
    console.error('API Error deleting complaint:', error);
    return NextResponse.json({ error: 'Failed to delete complaint' }, { status: 500 });
  }
}