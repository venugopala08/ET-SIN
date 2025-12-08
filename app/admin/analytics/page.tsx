// FILE: app/admin/analytics/page.tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ScatterChart, Scatter } from "recharts"
import { BarChartIcon as ChartBar, Calendar, Activity } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"

// Types matching the API response
interface MonthlyConsumption {
  month: string;
  kwh: number;
}
interface AnomaliesPerMonth {
  month: string;
  anomalies: number;
}
interface SeasonHeat {
  season: string;
  anomalies: number;
}
interface PfBilling {
  pf: number;
  billing: number;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<any>()
  const [village, setVillage] = useState("all")
  const [rrno, setRrno] = useState("all")
  const [season, setSeason] = useState("all")

  const [loading, setLoading] = useState(true);
  const [monthlyConsumption, setMonthlyConsumption] = useState<MonthlyConsumption[]>([]);
  const [anomaliesPerMonth, setAnomaliesPerMonth] = useState<AnomaliesPerMonth[]>([]);
  const [seasonHeat, setSeasonHeat] = useState<SeasonHeat[]>([]);
  const [pfBilling, setPfBilling] = useState<PfBilling[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/analytics-charts');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setMonthlyConsumption(data.monthlyConsumption || []);
        setAnomaliesPerMonth(data.anomaliesPerMonth || []);
        setSeasonHeat(data.seasonHeat || []);
        setPfBilling(data.pfBilling || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Process Heatmap Data (Updated Colors for "Suspicious" theme)
  const heatCells = useMemo(() => {
    const totalAnomalies = seasonHeat.reduce((acc, s) => acc + s.anomalies, 0);
    if (totalAnomalies === 0) {
      return seasonHeat.map(s => ({ ...s, rate: 0, color: "bg-gray-400" }));
    }
    
    return seasonHeat.map((s) => {
      const rate = s.anomalies / totalAnomalies;
      // Changed colors from Green/Red to Blue/Yellow/Orange
      return {
        ...s,
        rate,
        color: rate > 0.3 ? "bg-orange-500" : rate > 0.22 ? "bg-yellow-500" : "bg-blue-400",
      }
    });
  }, [seasonHeat])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Visualize trends, consumption patterns, and suspicious activities.</p>
        </div>
        
        {/* Filters (Visual Only for Demo) */}
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Date Range</Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
          <div>
            <Label>Village</Label>
            <Select value={village} onValueChange={setVillage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Ankola">Ankola</SelectItem>
                <SelectItem value="Aversa">Aversa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>RRNO</Label>
            <Select value={rrno} onValueChange={setRrno}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Season</Label>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Winter">Winter</SelectItem>
                <SelectItem value="Summer">Summer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Consumption
            </CardTitle>
            <CardDescription>Total kWh recorded by month (Last 12 Months)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyConsumption}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="kwh" stroke="#3b82f6" strokeWidth={2} name="Consumption (kWh)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            {/* UPDATED TITLE */}
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="h-5 w-5" />
              Suspicious Activity per Month
            </CardTitle>
            <CardDescription>Number of readings flagged for review</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={anomaliesPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  {/* UPDATED COLOR to Yellow/Orange */}
                  <Bar dataKey="anomalies" fill="#eab308" name="Flagged Readings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            {/* UPDATED TITLE */}
            <CardTitle>Season vs Flagging Rate</CardTitle>
            <CardDescription>Which seasons see the most suspicious behavior?</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {heatCells.map((c) => (
                  <div key={c.season} className="p-3 rounded-md border text-white bg-slate-900">
                    <div className={`w-full h-16 rounded ${c.color} opacity-90`} />
                    <div className="mt-2 text-sm text-center font-semibold">{c.season}</div>
                    <div className="text-xs text-center text-gray-400">{(c.rate * 100).toFixed(0)}% of flags</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Power Factor vs Billing
            </CardTitle>
            <CardDescription>Correlation check (Sample of 100 records)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="pf" name="Power Factor" domain={[0.5, 1]} label={{ value: 'Power Factor', position: 'bottom', offset: 0 }} />
                  <YAxis type="number" dataKey="billing" name="Billing (Est.)" label={{ value: 'Bill Amount', angle: -90, position: 'left' }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={pfBilling} fill="#a855f7" name="Consumer Record" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}