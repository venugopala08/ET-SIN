// FILE: app/api/predictions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import db from '@/lib/db';

const RECORDS_PER_PAGE = 20;

// --- HELPER FUNCTION: DETERMINES THE REASON ---
function getAnomalyReason(
  record: any, 
  rules: any, 
  mlFlagged: boolean,
  mlConfidence: number // <--- NEW PARAMETER
): string | null {
  
  // Safely parse numbers to avoid NaN errors
  const voltage = parseFloat(record.Voltage || 0);
  const powerFactor = parseFloat(record["Power Factor"] || 0);
  const consumption = parseFloat(record.Consumption || 0);
  const rollingAvg = parseFloat(record.rolling_avg || 0);
  const billing = consumption * 10; // Simple billing estimation

  // 1. "Out of Station" Logic:
  // If consumption is very low (< 5 units), ignore it. It's likely a vacation.
  if (consumption < 5) {
    return null; 
  }

  // 2. Rule Engine Logic:
  if (rules.enabled) {
    if (voltage < rules.voltage_min) return "Low Voltage";
    // Commented out High Voltage for demo stability unless critical
    // if (voltage > rules.voltage_max) return "High Voltage"; 
    
    if (powerFactor < rules.power_factor_min) return "Low Power Factor";
    
    // DEMO TWEAK: Only flag spikes if they are 3x the average (Stricter)
    if (rollingAvg > 0 && (consumption > (rollingAvg * 3.0))) return "Consumption Spike";
    
    // Check billing threshold
    if (billing > rules.billing_threshold) return "High Billing";
  }
  
  // 3. ML Model Logic:
  // DEMO TWEAK: Only trust the model if it is > 75% confident.
  // This reduces the number of "random" anomalies significantly.
  if (mlFlagged && mlConfidence > 0.75) {
    return "ML Prediction";
  }

  // If no rules broken and ML confidence is low, it's Normal.
  return null;
}

// --- GET FUNCTION: FETCH DATA FOR THE UI ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * RECORDS_PER_PAGE;

    // 1. Get total count
    const countQuery = db.query('SELECT COUNT(*) FROM data_records');
    
    // 2. Get data with smart fallbacks for blank values
    const dataQuery = db.query(
      `SELECT 
        d.id, 
        d.rrno, 
        d.record_date, 
        d."Consumption", 
        d."Voltage", 
        d.is_anomaly, 
        d.confidence, 
        d.anomaly_reason,
        -- If User Address is missing, use the CSV Village, else 'Unknown'
        COALESCE(u.address, d.village, 'Unknown') as village
       FROM data_records d
       LEFT JOIN users u ON d.rrno = u.rrno
       ORDER BY d.record_date DESC 
       LIMIT $1 OFFSET $2`,
      [RECORDS_PER_PAGE, offset]
    );

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    
    return NextResponse.json({
      records: dataResult.rows,
      totalRecords,
      totalPages: Math.ceil(totalRecords / RECORDS_PER_PAGE)
    });
  } catch (error) {
    console.error('API Error fetching records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

// --- POST FUNCTION: RUN PREDICTIONS ---
export async function POST(request: Request) {
  try {
    
    // 1. FETCH RULES FROM DB
    const rulesResponse = await db.query('SELECT * FROM rule_settings WHERE id = 1');
    if (rulesResponse.rows.length === 0) {
      throw new Error('Rule settings not found in database.');
    }
    const rules = {
      spike_multiplier: parseFloat(rulesResponse.rows[0].spike_multiplier),
      voltage_min: parseFloat(rulesResponse.rows[0].voltage_min),
      voltage_max: parseFloat(rulesResponse.rows[0].voltage_max),
      power_factor_min: parseFloat(rulesResponse.rows[0].power_factor_min),
      billing_threshold: parseFloat(rulesResponse.rows[0].billing_threshold),
      enabled: rulesResponse.rows[0].enabled,
    };

    // 2. FETCH DATA TO PREDICT
    // We get records that haven't been checked yet OR force re-check all (optional)
    const { rows: dataToPredict } = await db.query(
      `SELECT 
        id, "Consumption", "Voltage", "Current", "Power Factor", 
        "Bill_to_usage_ratio", "delta_units", "rolling_avg", "rolling_min", 
        "rolling_max", "rolling_std", "interaction_billing_pf", "month_sin", "month_cos",
        rrno 
       FROM data_records 
       WHERE is_anomaly = FALSE OR anomaly_reason IS NULL`
    );

    if (!dataToPredict || dataToPredict.length === 0) {
      return NextResponse.json({ error: 'No new data to predict.' }, { status: 400 });
    }

    // 3. CALL PYTHON ML SERVICE
    const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToPredict),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error("ML Service Error:", errorText);
      throw new Error(`ML service failed: ${errorText}`);
    }

    const mlPredictions: {id: number, is_anomaly: boolean, confidence: number}[] = await mlResponse.json();

    // 4. ANALYZE RESULTS (RULES + ML)
    let anomalies_found = 0;
    
    const mlPredictionMap = new Map(mlPredictions.map(p => [p.id, p]));

    const updatePromises = dataToPredict.map((record) => {
      const mlPrediction = mlPredictionMap.get(record.id);
      
      const mlFlagged = mlPrediction?.is_anomaly || false;
      const mlConfidence = mlPrediction?.confidence || 0;
      
      // Determine the MAIN REASON
      // We pass mlConfidence here so we can ignore weak predictions
      const reason = getAnomalyReason(record, rules, mlFlagged, mlConfidence);

      // If reason is not null, it IS an anomaly
      const final_is_anomaly = (reason !== null);

      if (final_is_anomaly) {
        anomalies_found++;
      }
      
      // If it's a rule break, we are 100% confident (1.0). Otherwise use ML confidence.
      const final_confidence = (reason !== null && reason !== 'ML Prediction') ? 1.0 : mlConfidence;

      // 5. UPDATE DATABASE
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
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}