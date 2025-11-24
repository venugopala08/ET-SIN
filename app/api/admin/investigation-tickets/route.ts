// FILE: app/api/admin/investigation-tickets/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// POST function to create a new ticket
export async function POST(request: Request) {
  try {
    const { village_name, notes } = await request.json();

    if (!village_name) {
      return NextResponse.json({ error: 'Village name is required' }, { status: 400 });
    }

    // Check if a ticket for this village is already pending
    const existing = await db.query(
      "SELECT * FROM investigation_tickets WHERE village_name = $1 AND status = 'Pending'",
      [village_name]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A ticket for this village is already pending' }, { status: 409 });
    }

    // Create the new ticket
    const query = `
      INSERT INTO investigation_tickets (village_name, status, notes)
      VALUES ($1, 'Pending', $2)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [village_name, notes]);

    return NextResponse.json({ success: true, ticket: rows[0] }, { status: 201 });

  } catch (error) {
    console.error('API Error creating ticket:', error);
    return NextResponse.json({ error: 'Failed to create investigation ticket' }, { status: 500 });
  }
}