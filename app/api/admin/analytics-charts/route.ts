// FILE: app/api/admin/analytics-charts/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Query 1: Monthly Consumption
    const consumptionQuery = db.query(`
      SELECT
        TO_CHAR(record_date, 'YYYY-MM') AS month_year,
        SUM("Consumption") AS kwh
      FROM data_records
      GROUP BY month_year
      ORDER BY month_year DESC
      LIMIT 12
    `);

    // Query 2: Suspicious Activity per Month
    const anomalyQuery = db.query(`
      SELECT
        TO_CHAR(record_date, 'YYYY-MM') AS month_year,
        COUNT(*) AS anomalies
      FROM data_records
      WHERE is_anomaly = true
      GROUP BY month_year
      ORDER BY month_year DESC
      LIMIT 12
    `);

    // Query 3: Seasonal Anomaly Rate (Stays the same)
    const seasonQuery = db.query(`
      SELECT
        CASE
          WHEN EXTRACT(MONTH FROM record_date) IN (12, 1, 2) THEN 'Winter'
          WHEN EXTRACT(MONTH FROM record_date) IN (3, 4, 5) THEN 'Spring'
          WHEN EXTRACT(MONTH FROM record_date) IN (6, 7, 8) THEN 'Summer'
          ELSE 'Monsoon'
        END AS season,
        COUNT(*) AS anomalies
      FROM data_records
      WHERE is_anomaly = true
      GROUP BY season
    `);

    // Query 4: Scatter Plot (Stays the same)
    const scatterQuery = db.query(`
      SELECT
        "Power Factor" as pf,
        "Consumption" * 10 AS billing
      FROM data_records
      WHERE "Power Factor" IS NOT NULL AND "Consumption" IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 100
    `);

    const [
      consumptionResult,
      anomalyResult,
      seasonResult,
      scatterResult
    ] = await Promise.all([
      consumptionQuery,
      anomalyQuery,
      seasonQuery,
      scatterQuery
    ]);

    // --- FIX: ADD YEAR TO LABELS ---
    const formatMonth = (row: { month_year: string }) => ({
      ...row,
      month: new Date(row.month_year + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    });

    // Note: We reverse() them so they go from Oldest -> Newest (Left to Right)
    const monthlyConsumption = consumptionResult.rows.map(formatMonth).reverse();
    const anomaliesPerMonth = anomalyResult.rows.map(formatMonth).reverse();

    const allSeasons = ['Winter', 'Spring', 'Summer', 'Monsoon'];
    const seasonMap = new Map(seasonResult.rows.map(r => [r.season, parseInt(r.anomalies, 10)]));
    
    const seasonHeat = allSeasons.map(season => ({
      season,
      anomalies: seasonMap.get(season) || 0 
    }));

    const pfBilling = scatterResult.rows.map(r => ({
        pf: parseFloat(r.pf),
        billing: parseFloat(r.billing)
    }));

    return NextResponse.json({
      monthlyConsumption,
      anomaliesPerMonth,
      seasonHeat,
      pfBilling
    });

  } catch (error) {
    console.error('API Error fetching admin analytics charts:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}