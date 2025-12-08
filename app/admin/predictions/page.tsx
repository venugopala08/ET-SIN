// FILE: app/admin/predictions/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface DataRecord {
  id: number;
  rrno: string;
  village: string;
  record_date: string;
  Consumption: number;
  Voltage: number;
  is_anomaly: boolean;
  confidence: number;
  anomaly_reason: string | null;
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

export default function PredictionsPage() {
  const [data, setData] = useState<DataRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const { toast } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  const fetchData = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/predictions?page=${page}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
      setData(result.records || []);
      setTotalPages(result.totalPages || 0);
      setCurrentPage(page);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, toast])

  const handleRunPrediction = async () => {
    setPredicting(true);
    try {
      const response = await fetch('/api/predictions', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Prediction failed');

      toast({
        title: "Prediction Complete",
        description: `Model processed ${result.total_records} records. ${result.anomalies_found} anomalies found.`,
      })
      
      if (currentPage === 1) fetchData(1);
      else setCurrentPage(1);

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPredicting(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  }
  
  const { startPage, endPage } = buildPagination(currentPage, totalPages);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Run Predictions</CardTitle>
            <CardDescription>View data and run the ML model to detect anomalies.</CardDescription>
          </div>
          <Button onClick={handleRunPrediction} disabled={predicting}>
            {predicting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Running Model...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" /> Run Prediction Model
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RR No.</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Consumption</TableHead>
                <TableHead>Voltage</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">Loading data...</TableCell></TableRow>
              ) : data.length === 0 ? (
                 <TableRow><TableCell colSpan={7} className="text-center h-24">No data found.</TableCell></TableRow>
              ) : (
                data.map((record) => (
                  <TableRow key={record.id} className={record.is_anomaly ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <TableCell>{record.rrno}</TableCell>
                    <TableCell>{record.village || "Unknown"}</TableCell>
                    <TableCell>{formatDate(record.record_date)}</TableCell>
                    <TableCell>{record.Consumption !== null ? record.Consumption : 0}</TableCell>
                    <TableCell>{record.Voltage}</TableCell>
                    <TableCell>
                        {record.anomaly_reason ? (
                            <Badge variant="outline" className="border-red-200 text-red-700 bg-red-100">{record.anomaly_reason}</Badge>
                        ) : "-"}
                    </TableCell>

                    {/* ✅ UPDATED STATUS BADGE */}
                    <TableCell>
                      {record.is_anomaly ? (
                        <Badge variant="destructive" className="flex items-center w-fit gap-1 bg-yellow-500 hover:bg-yellow-600">
                          <AlertCircle className="h-3 w-3" /> Suspicious
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 flex items-center w-fit gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Normal
                        </Badge>
                      )}
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <Pagination className="mt-4">
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
        </CardContent>
      </Card>
    </div>
  )
}
