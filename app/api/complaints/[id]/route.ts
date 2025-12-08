import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const complaintId = params.id;

    const { rows } = await db.query(
      `UPDATE complaints
       SET status = 'resolved'
       WHERE id = $1
       RETURNING *`,
      [complaintId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error('API Error updating complaint:', error);
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const complaintId = params.id;

    const { rowCount } = await db.query(
      `DELETE FROM complaints WHERE id = $1`,
      [complaintId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error deleting complaint:', error);
    return NextResponse.json({ error: 'Failed to delete complaint' }, { status: 500 });
  }
}