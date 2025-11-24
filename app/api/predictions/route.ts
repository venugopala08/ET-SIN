import { NextResponse, type NextRequest } from 'next/server';
import db from '@/lib/db';

const RECORDS_PER_PAGE = 20;

function getAnomalyReason(
  record: any,
  rules: any,
  mlFlagged: boolean
): string | null {

  if (rules.enabled) {
    const voltage = parseFloat(record.Voltage);
    const powerFactor = parseFloat(record["Power Factor"]);
    const consumption = parseFloat(record.Consumption);
    const rollingAvg = parseFloat(record.rolling_avg);

    // Check rules in order of priority
    if (voltage < rules.voltage_min) return "Low Voltage";
    if (voltage > rules.voltage_max) return "High Voltage";
    if (powerFactor < rules.power_factor_min) return "Low Power Factor";
    if (rollingAvg > 0 && (consumption > (rollingAvg * rules.spike_multiplier))) return "Consumption Spike";
  }

  // If no rules were broken, but the ML model flagged it
  if (mlFlagged) {
    return "ML Prediction";
  }

  // If nothing flagged it, it's not an anomaly
  return null;
}

// GET function
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * RECORDS_PER_PAGE;

    const countQuery = db.query('SELECT COUNT(*) FROM data_records');
    const dataQuery = db.query(
      `SELECT * FROM data_records 
       ORDER BY record_date DESC 
       LIMIT $1 OFFSET $2`,
      [RECORDS_PER_PAGE, offset]
    );

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const records = dataResult.rows;

    return NextResponse.json({
      records,
      totalRecords,
      totalPages: Math.ceil(totalRecords / RECORDS_PER_PAGE)
    });
  } catch (error) {
    console.error('API Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

// POST function
export async function POST(request: Request) {
  try {
    
    // 1. FETCH RULES
    const rulesResponse = await db.query('SELECT * FROM rule_settings WHERE id = 1');
    if (rulesResponse.rows.length === 0) {
      throw new Error('Rule settings not found in database.');
    }
    const rules = {
      spike_multiplier: parseFloat(rulesResponse.rows[0].spike_multiplier),
      voltage_min: parseFloat(rulesResponse.rows[0].voltage_min),
      voltage_max: parseFloat(rulesResponse.rows[0].voltage_max),
      power_factor_min: parseFloat(rulesResponse.rows[0].power_factor_min),
      enabled: rulesResponse.rows[0].enabled,
    };

    // 2. FETCH DATA
    const { rows: dataToPredict } = await db.query(
      `SELECT 
        id, "Consumption", "Voltage", "Current", "Power Factor", 
        "Bill_to_usage_ratio", "delta_units", "rolling_avg", "rolling_min", 
        "rolling_max", "rolling_std", "interaction_billing_pf", "month_sin", "month_cos"
       FROM data_records 
       WHERE is_anomaly = FALSE OR anomaly_reason IS NULL`
    );

    if (!dataToPredict || dataToPredict.length === 0) {
      return NextResponse.json({ error: 'No new data to predict.' }, { status: 400 });
    }

    // 3. CALL ML SERVICE
    const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToPredict),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      throw new Error(`ML service failed: ${errorText}`);
    }
    const mlPredictions: {id: number, is_anomaly: boolean, confidence: number}[] = await mlResponse.json();

    // 4. (No explicit Rule Engine step, it's combined in Step 5)

    // 5. COMBINE RESULTS & UPDATE DATABASE
    let anomalies_found = 0;
    const mlPredictionMap = new Map(mlPredictions.map(p => [p.id, p]));

    const updatePromises = dataToPredict.map((record) => {
      const mlPrediction = mlPredictionMap.get(record.id);
      const mlFlagged = mlPrediction?.is_anomaly || false;
      const mlConfidence = mlPrediction?.confidence || 0;
      
      const reason = getAnomalyReason(record, rules, mlFlagged);

      const final_is_anomaly = (reason !== null);
      
      if (final_is_anomaly) {
        anomalies_found++;
      }
      
      const final_confidence = (reason !== null && reason !== 'ML Prediction') ? 1.0 : mlConfidence;

      return db.query(
        `UPDATE data_records 
         SET is_anomaly = $1, confidence = $2, anomaly_reason = $3 
         WHERE id = $4`,
        [final_is_anomaly, final_confidence, reason, record.id]
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: 'Prediction successful',
      total_records: dataToPredict.length,
      anomalies_found: anomalies_found,
      rules_applied: rules.enabled,
    });

  } catch (error: any) {
    console.error('Prediction API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}