// FILE: app/api/admin/geo-data/route.ts

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// These are the coordinates for your villages.
// I've added Aversa based on your description.
const villageCoordinates: { [key: string]: [number, number] } = {
  "Ankola": [74.3040, 14.6620],
  "Belambar": [74.3910, 14.7560],
  "Hankon": [74.3290, 14.7850],
  "Aversa": [74.3430, 14.7070], // Added Aversa
  // Add other villages from your dataset here
};

export async function GET() {
  try {
    // --- THIS IS THE NEW, CORRECTED QUERY ---
    // It now groups by the 'village' column in the data_records table itself,
    // instead of trying to join with the 'users' table.
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

    // Merge query results with our hard-coded coordinates
    const geoData = rows.map(row => {
      const villageName = row.village; // e.g., "Aversa"
      const coords = villageCoordinates[villageName];
      
      const totalRecords = parseInt(row.total_records, 10);
      const totalAnomalies = parseInt(row.total_anomalies, 10);
      const theftPct = totalRecords > 0 ? (totalAnomalies / totalRecords) : 0;

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
          // Default to Ankola if a village in your data isn't in our hard-coded list
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