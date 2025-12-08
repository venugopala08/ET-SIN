// FILE: app/api/admin/geo-data/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// --- UPDATE THIS LIST ---
// I added Aversa and other nearby villages.
// Make sure the key (e.g., "Aversa") MATCHES the spelling in your CSV exactly.
const villageCoordinates: { [key: string]: [number, number] } = {
  "Ankola": [74.3040, 14.6620],
  "Aversa": [74.2830, 14.6300],   // <-- Added Aversa coordinates
  "Belambar": [74.3910, 14.7560],
  "Hankon": [74.3290, 14.7850],
  "Harwada": [74.2600, 14.6200],  // Added nearby
  "Hattikeri": [74.3800, 14.7000] // Added nearby
};

export async function GET() {
  try {
    // Query: Group by village (Case insensitive grouping is safer)
    const query = `
      SELECT
        village,
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE is_anomaly = true) AS total_anomalies
      FROM data_records
      WHERE village IS NOT NULL
      GROUP BY village;
    `;
    
    const { rows } = await db.query(query);

    const geoData = rows.map(row => {
      // Ensure specific matching (trim spaces, handle casing)
      const villageName = row.village.trim(); 
      const coords = villageCoordinates[villageName];
      
      const totalRecords = parseInt(row.total_records, 10);
      const totalAnomalies = parseInt(row.total_anomalies, 10);
      const theftPct = totalRecords > 0 ? (totalAnomalies / totalRecords) : 0;

      // Debug log to see what villages are being found
      if (!coords) {
        console.log(`Warning: No coordinates found for village '${villageName}'. Defaulting to Ankola.`);
      }

      return {
        type: "Feature",
        properties: {
          name: villageName,
          users: totalRecords,
          anomalies: totalAnomalies,
          theftPct: theftPct,
        },
        geometry: {
          type: "Point",
          // Default to Ankola if coordinates are missing
          coordinates: coords || [74.3040, 14.6620] 
        }
      };
    });

    return NextResponse.json({ type: "FeatureCollection", features: geoData });

  } catch (error) {
    console.error('API Error fetching geo data:', error);
    return NextResponse.json({ error: 'Failed to fetch geo data' }, { status: 500 });
  }
}