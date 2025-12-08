import { NextResponse } from 'next/server';
import db from '@/lib/db';

function groupDataByWeek(data: any[], userDetails: any) {
  const reports = new Map();

  data.forEach((record) => {
    const date = new Date(record.record_date);
    const year = date.getUTCFullYear();
    const week = Math.floor(date.getUTCDay() / 7) + 1; // Corrected getUTCDay
    const month = date.getUTCMonth() + 1;
    const weekKey = `${year}-M${String(month).padStart(2, '0')}-W${week}`;

    if (!reports.has(weekKey)) {
      reports.set(weekKey, {
        id: weekKey,
        rrno: userDetails.rrno,
        name: userDetails.name,
        address: userDetails.address,
        village: userDetails.village || 'Ankola',
        date_range: `Month ${month}, Week ${week}, ${year}`,
        consumption_data: [],
        anomaly_status: 'normal',
        total_consumption: 0,
        avg_consumption: 0,
        billing_amount: 0,
        confidence_score: 1.0,
        created_at: date.toISOString(),
      });
    }

    const report = reports.get(weekKey);
    
    report.consumption_data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      consumption: record.Consumption,
      voltage: record.Voltage,
    });
    
    report.total_consumption += record.Consumption;
    report.billing_amount += (record.Consumption * 10);
    
    if (record.is_anomaly) {
      report.anomaly_status = 'suspicious';
      if (record.confidence < report.confidence_score) {
        report.confidence_score = record.confidence;
      }
    }
  });

  reports.forEach(report => {
    if (report.consumption_data.length > 0) {
      report.avg_consumption = report.total_consumption / report.consumption_data.length;
    }
  });

  return Array.from(reports.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = params.id;

    const userQuery = await db.query(
      'SELECT rrno, name, address FROM users WHERE id = $1',
      [userId]
    );
    if (userQuery.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userDetails = userQuery.rows[0];

    const dataQuery = await db.query(
      `SELECT "Consumption", "Voltage", "record_date", "is_anomaly", "confidence"
       FROM data_records
       WHERE rrno = $1
       ORDER BY record_date DESC`,
      [userDetails.rrno]
    );

    const reports = groupDataByWeek(dataQuery.rows, userDetails);

    return NextResponse.json(reports);

  } catch (error) {
    console.error('API Error fetching user reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}