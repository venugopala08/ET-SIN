import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;
    
    const userQuery = await db.query(
      'SELECT name, email, rrno, address, phone_number FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userQuery.rows[0]);
  } catch (error) {
    console.error('API Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;
    const { name, email, address, phone } = await request.json();

    const updateQuery = await db.query(
      `UPDATE users
       SET name = $1, email = $2, address = $3, phone_number = $4
       WHERE id = $5
       RETURNING id, name, email, rrno, address, phone_number`,
      [name, email, address, phone, userId]
    );

    if (updateQuery.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updateQuery.rows[0]);
  } catch (error) {
    console.error('API Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}