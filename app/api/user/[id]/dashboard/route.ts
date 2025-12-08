// FILE: app/api/user/[id]/dashboard/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  // Fix 1: Change the type of params to Promise
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Fix 2: Await the params before using them
    const params = await props.params;
    const userId = params.id;

    // 1. Get the user's RRNO and Name first
    const userQuery = await db.query('SELECT rrno, name FROM users WHERE id = $1', [
      userId,
    ]);
    
    if (userQuery.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const rrno = userQuery.rows[0].rrno;
    const userName = userQuery.rows[0].name;

    // 2. Run all other database queries IN PARALLEL for speed
    const [
      totalConsumptionQuery,
      avgVoltageQuery,
      pendingComplaintsQuery,
      chartDataQuery
    ] = await Promise.all([
      db.query(
        'SELECT SUM("Consumption") as total_consumption FROM data_records WHERE rrno = $1',
        [rrno]
      ),
      db.query(
        'SELECT AVG("Voltage") as avg_voltage FROM data_records WHERE rrno = $1',
        [rrno]
      ),
      db.query(
        'SELECT COUNT(*) as pending_complaints FROM complaints WHERE user_id = $1 AND status = $2',
        [userId, 'submitted']
      ),
      db.query(
        `SELECT TO_CHAR(record_date, 'YYYY-MM') as month, SUM("Consumption") as total
         FROM data_records
         WHERE rrno = $1
         GROUP BY month
         ORDER BY month DESC
         LIMIT 6`,
        [rrno]
      )
    ]);

    // 3. Process the results
    const totalConsumption = totalConsumptionQuery.rows[0]?.total_consumption || 0;
    const avgVoltage = avgVoltageQuery.rows[0]?.avg_voltage || 0;
    const pendingComplaints = pendingComplaintsQuery.rows[0]?.pending_complaints || 0;
    
    // Format chart data
    const chartData = chartDataQuery.rows.map((row: any) => ({
      ...row,
      total: parseFloat(row.total),
    }));

    // 4. Return all data at once
    return NextResponse.json({
      welcomeName: userName,
      totalConsumption: parseFloat(totalConsumption).toFixed(2),
      avgVoltage: parseFloat(avgVoltage).toFixed(2),
      pendingComplaints: parseInt(pendingComplaints),
      chartData: chartData.reverse(), // Reverse to show oldest-to-newest
    });

  } catch (error) {
    console.error('API Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}