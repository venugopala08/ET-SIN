// FILE: app/api/admin/anomalies/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import db from '@/lib/db';

const RECORDS_PER_PAGE = 15;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * RECORDS_PER_PAGE;

    // Query 1: Get total count
    const countQuery = db.query(
      `SELECT COUNT(*) FROM data_records WHERE is_anomaly = true`
    );
    
    // Query 2: Get anomalies
    // --- FIX IS HERE ---
    // We switched the order: COALESCE(d.village, u.address...)
    // This forces it to use the CSV village (e.g. Aversa) first.
    const dataQuery = db.query(
      `
      SELECT
        d.id, d.rrno, d.record_date, d."Consumption", d."Voltage",
        d.confidence, d.status, d.anomaly_reason,
        COALESCE((array_agg(u.name))[1], 'Unregistered Consumer') AS name,
        COALESCE(d.village, (array_agg(u.address))[1], 'Unknown Location') AS address, 
        COALESCE(d.village, (array_agg(u.address))[1], 'Unknown Village') AS village
      FROM data_records d
      LEFT JOIN users u ON d.rrno = u.rrno
      WHERE d.is_anomaly = true
      GROUP BY d.id, d.rrno, d.record_date, d."Consumption", d."Voltage", d.confidence, d.status, d.anomaly_reason, d.village
      ORDER BY d.record_date DESC 
      LIMIT $1 OFFSET $2
      `,
      [RECORDS_PER_PAGE, offset]
    );

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const anomalies = dataResult.rows;

    return NextResponse.json({
      anomalies,
      totalRecords,
      totalPages: Math.ceil(totalRecords / RECORDS_PER_PAGE)
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 });
  }
}

// POST function stays the same
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, note, status } = body;

    if (action === 'update-status') {
      const query = `UPDATE data_records SET status = $1, is_anomaly = $2 WHERE id = $3 RETURNING *;`;
      const values = [status, status !== 'normal', id];
      const { rows } = await db.query(query, values);
      return NextResponse.json({ success: true, anomaly: rows[0] });
    }

    if (action === 'add-note') {
       console.log(`Note added to anomaly ${id}: ${note}`);
       return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update anomaly' }, { status: 500 });
  }
}