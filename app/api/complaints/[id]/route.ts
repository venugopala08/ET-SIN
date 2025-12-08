// FILE: app/api/complaints/[id]/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// PATCH: Update status (e.g., Mark as Resolved)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    const complaintId = params.id;

    const query = `
      UPDATE complaints
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [status, complaintId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, complaint: rows[0] });
  } catch (error) {
    console.error('API Error updating complaint:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

// --- THIS IS NEW: DELETE FUNCTION ---
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const complaintId = params.id;

    // Delete the complaint from the database
    const query = 'DELETE FROM complaints WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [complaintId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('API Error deleting complaint:', error);
    return NextResponse.json({ error: 'Failed to delete complaint' }, { status: 500 });
  }
}