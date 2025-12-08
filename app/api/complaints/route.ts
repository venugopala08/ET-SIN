import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT c.id, c.subject, c.description, c.status, c.created_at, u.name as user_name, u.email as user_email
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `;
    const { rows } = await db.query(query);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error fetching complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { subject, description, type, rrno, userId } = await request.json();

    // Check for all required fields including rrno
    if (!subject || !description || !rrno || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Default 'type' if not provided
    const complaintType = type || 'General';

    // Insert into database, including rrno
    const { rows } = await db.query(
      `INSERT INTO complaints (subject, description, type, rrno, user_id, status)
       VALUES ($1, $2, $3, $4, $5, 'submitted')
       RETURNING *`,
      [subject, description, complaintType, rrno, userId]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('API Error creating complaint:', error);
    return NextResponse.json({ error: `Failed to create complaint: ${error}` }, { status: 500 });
  }
}