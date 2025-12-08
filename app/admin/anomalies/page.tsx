// FILE: app/admin/anomalies/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Filter, FileText, Eye, CheckCircle2, Activity, StickyNote, Zap } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

type Anomaly = {
  id: number
  rrno: string
  name?: string
  village?: string
  address?: string
  record_date: string
  Consumption: number
  Voltage: number
  status: "theft" | "suspicious" | "normal"
  confidence: number
  anomaly_reason: string | null
  notes?: string[]
}

interface HistoryPoint {
  record_date: string;
  Consumption: number;
}

function buildPagination(currentPage: number, totalPages: number) {
  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(totalPages, maxPagesToShow);
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - maxPagesToShow + 1);
  }
  return { startPage, endPage };
}

export default function AnomaliesPage() {
  const { toast } = useToast()
  const [list, setList] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Anomaly | null>(null)
  const [note, setNote] = useState("")
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  // New State for History
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchAnomalies = async (page: number) => {
    setLoading(true);
    setSelected(null); 
    try {
      const res = await fetch(`/api/admin/anomalies?page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch anomalies");
      const data = await res.json()
      setList(data.anomalies || [])
      setTotalPages(data.totalPages || 0);
      setTotalRecords(data.totalRecords || 0);
      setCurrentPage(page);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Fetch History for Chart
  const fetchHistory = async (rrno: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/consumer-history?rrno=${rrno}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    fetchAnomalies(currentPage);
  }, [currentPage, toast])

  // When selected changes, fetch history
  useEffect(() => {
    if (selected?.rrno) {
      fetchHistory(selected.rrno);
    }
  }, [selected]);

  const filteredList = useMemo(
    () => list.filter((a) => filter === "all" || a.status === filter),
    [list, filter]
  )

  const statusBadge = (s: Anomaly["status"]) =>
    s === "theft" ? <Badge variant="destructive">Confirmed Theft</Badge> : // Changed from 'Theft'
    s === "suspicious" ? <Badge className="bg-yellow-100 text-yellow-800">Flagged Suspicious</Badge> : // Changed
    <Badge className="bg-green-100 text-green-800">Normal</Badge>

  const addNote = async () => {
    if (!selected || !note.trim()) return
    toast({ title: "Note added (simulated)", description: note });
    setNote("");
  }

  const markFalsePositive = async () => {
    if (!selected) return
    try {
      const res = await fetch("/api/admin/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", id: selected.id, status: "normal" }),
      })
      if (!res.ok) throw new Error("Failed to update status");
      setSelected(null)
      toast({ title: "Marked as false positive" })
      fetchAnomalies(currentPage);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const exportListCsv = () => toast({ title: "CSV Export (Simulated)" });
  const exportPdf = () => toast({ title: "PDF Export (Simulated)" });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
  
  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short' });
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  }

  const { startPage, endPage } = buildPagination(currentPage, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anomaly Reports</h1>
          <p className="text-muted-foreground">
            Investigating {totalRecords} total anomalies. Page {currentPage} of {totalPages}.
          </p>
        </div>
        <Button variant="outline" onClick={exportListCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
          <CardDescription>Filter by status</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "suspicious" ? "default" : "outline"} onClick={() => setFilter("suspicious")}>Suspicious</Button>
          <Button variant={filter === "theft" ? "default" : "outline"} onClick={() => setFilter("theft")}>Theft</Button>
        </CardContent>
      </Card>

      <div className="overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RRNO</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Village</TableHead>
              <TableHead>Consumption</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24">Loading...</TableCell></TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24">No anomalies found.</TableCell></TableRow>
            ) : (
              filteredList.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.rrno}</TableCell>
                  <TableCell>{formatDate(a.record_date)}</TableCell>
                  <TableCell>{a.village || 'Unknown'}</TableCell>
                  <TableCell>{a.Consumption}</TableCell>
                  <TableCell><Badge variant="outline">{a.anomaly_reason || 'N/A'}</Badge></TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelected(a)}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} /></PaginationItem>
            {Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i).map(page => (
              <PaginationItem key={page}>
                <PaginationLink isActive={page === currentPage} onClick={() => handlePageChange(page)}>{page}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={() => handlePageChange(currentPage + 1)} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Detail Modal - NOW USING REAL DATA */}
      {selected && (
        <Card id="anomaly-detail" className="mt-6 border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Anomaly Detail - ID: {selected.id}
            </CardTitle>
            <CardDescription>RRNO: {selected.rrno} • {selected.village || 'Unknown'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="text-sm space-y-1">
                  <div>Name: <span className="font-semibold">{selected.name || "Unknown User"}</span></div>
                  <div>RRNO: <span className="font-mono">{selected.rrno}</span></div>
                  <div>Address: {selected.address || "Unknown"}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Incident Status</h4>
                <div className="flex items-center gap-2">
                  {statusBadge(selected.status)}
                  <Badge variant="secondary">Confidence: {(selected.confidence * 100).toFixed(1)}%</Badge>
                </div>
              </div>
            </div>

            {/* REAL HISTORY CHART */}
            <div>
              <h4 className="font-medium mb-2">Consumption History (Real Data)</h4>
              {loadingHistory ? (
                <div className="h-[260px] w-full flex items-center justify-center bg-muted/20 rounded">Loading History...</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="record_date" tickFormatter={formatMonth} />
                    <YAxis />
                    <Tooltip labelFormatter={formatDate} />
                    <Line type="monotone" dataKey="Consumption" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* REAL METRICS (Replaced Fake SHAP) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded p-4 bg-muted/20">
                <h4 className="font-medium mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Key Metrics</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Voltage:</span>
                    <span className={selected.Voltage < 200 ? "text-red-500 font-bold" : "font-mono"}>{selected.Voltage} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consumption:</span>
                    <span className="font-mono">{selected.Consumption} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Bill:</span>
                    <span className="font-mono">₹{(selected.Consumption * 10).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border rounded p-4 bg-muted/20">
                <h4 className="font-medium mb-3 flex items-center gap-2"><Zap className="h-4 w-4" /> Analysis</h4>
                <div>
                  <div className="text-sm font-semibold mb-1">Primary Reason:</div>
                  <Badge variant="outline" className="mb-3 text-base">{selected.anomaly_reason || 'ML Detected Pattern'}</Badge>
                  
                  <div className="text-sm font-semibold mb-1">Recommendation:</div>
                  <p className="text-sm text-muted-foreground">
                    {selected.anomaly_reason === 'Low Voltage' ? 'Check transformer and line integrity.' : 
                     selected.anomaly_reason === 'Consumption Spike' ? 'Inspect meter for tampering or bypass.' :
                     'Conduct site visit to verify load.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Button variant="outline" onClick={exportListCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
              <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
              <Button variant="destructive" onClick={markFalsePositive}><CheckCircle2 className="h-4 w-4 mr-2" /> Mark False Positive</Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2"><StickyNote className="h-4 w-4" /> Notes</h4>
              <div className="grid gap-2 md:grid-cols-4">
                <div className="md:col-span-3"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note..." /></div>
                <div className="flex items-start"><Button onClick={addNote}>Add Note</Button></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}