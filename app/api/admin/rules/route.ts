import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET function
export async function GET() {
  try {
    const { rows } = await db.query('SELECT * FROM rule_settings WHERE id = 1');
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Settings row not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error('API Error fetching rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

// POST function
export async function POST(request: Request) {
  try {
    const rules = await request.json();

    const {
      spike_multiplier,
      voltage_min,
      voltage_max,
      power_factor_min,
      enabled
    } = rules;

    const query = `
      INSERT INTO rule_settings (
        id, spike_multiplier, voltage_min, voltage_max, 
        power_factor_min, enabled
      )
      VALUES (1, $1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        spike_multiplier = $1,
        voltage_min = $2,
        voltage_max = $3,
        power_factor_min = $4,
        enabled = $5
      RETURNING *
    `;
    
    const values = [
      spike_multiplier, voltage_min, voltage_max, 
      power_factor_min, enabled
    ];
    
    const { rows } = await db.query(query, values);

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error('API Error updating rules:', error);
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 });
  }
}