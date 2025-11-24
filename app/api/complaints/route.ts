// FILE: app/api/complaints/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Your database connection

// GET function to fetch all complaints for the admin
export async function GET() {
  try {
    // --- THIS QUERY IS FIXED ---
    // Changed 'JOIN' to 'LEFT JOIN' to include complaints even if the user is missing.
    // Added COALESCE(u.name, 'Unknown User') to safely handle missing names.
    const { rows } = await db.query(`
      SELECT 
        c.id, 
        c.user_id, 
        c.subject, 
        c.description, 
        c.status, 
        c.created_at, 
        COALESCE(u.name, 'Unknown User') AS name 
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);
    
    return NextResponse.json({ complaints: rows });
  } catch (error) {
    console.error('API Error fetching all complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

// POST function for a user to create a new complaint
export async function POST(request: Request) {
  try {
    const { userId, subject, description } = await request.json();

    if (!userId || !subject || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.query(
      'INSERT INTO complaints (user_id, subject, description, status) VALUES ($1, $2, $3, $4)',
      [userId, subject, description, 'submitted']
    );
    
    return NextResponse.json({ message: 'Complaint submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error creating complaint:', error);
    return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 });
  }
}