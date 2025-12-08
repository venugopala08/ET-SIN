// FILE: app/api/admin/dashboard-stats/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // 1. Fetch Stats for the Cards (No change)
    const userStatsQuery = db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM data_records WHERE is_anomaly = true) AS total_anomalies,
        (SELECT COUNT(*) FROM data_records WHERE is_anomaly = false) AS total_normal,
        (SELECT AVG(confidence) FROM data_records WHERE is_anomaly = true) AS avg_confidence
    `);
    
    // 2. Fetch Data for Monthly Activity Trends (FIXED)
    // - Removed "WHERE record_date >= NOW()" so it finds your 2017-2025 data.
    // - Orders by DESC to get the LATEST available data points.
    const monthlyChartQuery = db.query(`
      SELECT
        TO_CHAR(record_date, 'YYYY-MM') AS month_year,
        SUM(CASE WHEN is_anomaly = true THEN 1 ELSE 0 END) AS anomalies,
        SUM(CASE WHEN is_anomaly = false THEN 1 ELSE 0 END) AS normal
      FROM data_records
      GROUP BY month_year
      ORDER BY month_year DESC
      LIMIT 6
    `);
    
    // 3. Fetch Data for Pie Chart (No change)
    const pieChartQuery = db.query(`
      SELECT 
        anomaly_reason, 
        COUNT(*) AS value 
      FROM data_records 
      WHERE is_anomaly = true AND anomaly_reason IS NOT NULL 
      GROUP BY anomaly_reason
    `);

    // Run ALL queries in parallel
    const [
      userStatsResult, 
      monthlyChartResult,
      pieChartResult
    ] = await Promise.all([
      userStatsQuery,
      monthlyChartQuery,
      pieChartQuery
    ]);

    const stats = userStatsResult.rows[0];
    
    // --- FIX: FORMAT LABELS & ORDER ---
    // 1. Reverse() so the chart reads Left-to-Right (Oldest -> Newest)
    // 2. Format as "Jan 2017" so it is clearly Month + Year
    const formattedChartData = monthlyChartResult.rows.reverse().map(row => ({
      month: new Date(row.month_year + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      anomalies: parseInt(row.anomalies, 10),
      normal: parseInt(row.normal, 10),
    }));

    const pieChartData = pieChartResult.rows.map(row => ({
      name: row.anomaly_reason,
      value: parseInt(row.value, 10)
    }));

    return NextResponse.json({
      stats: {
        totalUsers: stats.total_users || 0,
        totalAnomalies: stats.total_anomalies || 0,
        totalNormal: stats.total_normal || 0,
        detectionAccuracy: stats.avg_confidence ? (parseFloat(stats.avg_confidence) * 100).toFixed(1) : "0.0"
      },
      monthlyData: formattedChartData,
      pieChartData: pieChartData,
    });

  } catch (error) {
    console.error('API Error fetching admin dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}