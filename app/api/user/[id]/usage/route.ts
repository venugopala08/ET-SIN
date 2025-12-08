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

    // 1. Get the user's RRNO first
    const userQuery = await db.query('SELECT rrno FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const rrno = userQuery.rows[0].rrno;

    // 2. Run the LATEST record and 7-DAY chart queries IN PARALLEL
    const [latestRecordQuery, chartDataQuery] = await Promise.all([
      db.query(
        `SELECT *, TO_CHAR(record_date, 'YYYY-MM-DD') as date
         FROM data_records
         WHERE rrno = $1
         ORDER BY record_date DESC
         LIMIT 1`,
        [rrno]
      ),
      db.query(
        `SELECT "Consumption" as consumption, TO_CHAR(record_date, 'YYYY-MM-DD') as date
         FROM data_records
         WHERE rrno = $1
         ORDER BY record_date DESC
         LIMIT 7`,
        [rrno]
      )
    ]);

    // 3. Process the results
    const latestRecord = latestRecordQuery.rows[0] || {};
    // Reverse to show oldest-to-newest on the chart
    const chartData = chartDataQuery.rows.reverse();

    // 4. Combine into the 'result' object
    const result = {
      rrno: rrno,
      status: latestRecord.is_anomaly ? 'suspicious' : 'normal',
      confidence: latestRecord.confidence || 0.95,
      lastReading: {
        date: latestRecord.date,
        consumption: latestRecord.Consumption,
        voltage: latestRecord.Voltage,
        current: latestRecord.Current,
        billing: (latestRecord.Consumption * 10).toFixed(2), // Est. billing
        powerFactor: latestRecord['Power Factor'],
      },
      anomalyType: latestRecord.is_anomaly ? 'ML Detected' : null,
      riskLevel: latestRecord.is_anomaly ? 'medium' : 'low',
      recommendations: latestRecord.is_anomaly
        ? ["Unusual activity detected.", "Please check your recent usage.", "If you suspect an error, file a complaint."]
        : ["Usage is within normal range", "Continue regular monitoring"],
      chartData: chartData,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error fetching usage data:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}