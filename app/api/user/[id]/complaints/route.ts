import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;

    const { rows } = await db.query(
      `SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    
    return NextResponse.json(rows);

  } catch (error) {
    console.error('API Error fetching user complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}