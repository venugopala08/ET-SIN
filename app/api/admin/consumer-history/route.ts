// FILE: app/api/admin/consumer-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rrno = searchParams.get('rrno');

    if (!rrno) {
      return NextResponse.json({ error: 'RRNO is required' }, { status: 400 });
    }

    // Fetch last 12 months of consumption for this user
    const query = `
      SELECT record_date, "Consumption"
      FROM data_records
      WHERE rrno = $1
      ORDER BY record_date ASC
      LIMIT 12
    `;
    
    const { rows } = await db.query(query, [rrno]);

    return NextResponse.json({ history: rows });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}