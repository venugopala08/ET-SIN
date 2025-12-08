// FILE: app/admin/complaints/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, Trash2, ListChecks } from 'lucide-react' // <-- Added Trash2
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" // <-- Added Alert Dialog

interface Complaint {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  status: 'submitted' | 'resolved';
  created_at: string;
  name: string;
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/complaints');
      if (!response.ok) throw new Error('Failed to fetch complaints');
      const data = await response.json();
      setComplaints(data.complaints || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaints();
  }, [toast]);

  const handleMarkResolved = async (id: number) => {
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({ title: "Status Updated", description: "Complaint marked as resolved." })
      fetchComplaints();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  // --- NEW DELETE FUNCTION ---
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete complaint');

      toast({ title: "Deleted", description: "Complaint removed successfully." })
      fetchComplaints(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Manage Complaints
          </CardTitle>
          <CardDescription>Review and resolve user-submitted complaints</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
              ) : complaints.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No complaints found.</TableCell></TableRow>
              ) : (
                complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>{complaint.name}</TableCell>
                    <TableCell>{complaint.subject}</TableCell>
                    <TableCell className="max-w-xs truncate" title={complaint.description}>
                      {complaint.description}
                    </TableCell>
                    <TableCell>{formatDate(complaint.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={complaint.status === 'resolved' ? 'default' : 'secondary'}>
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {complaint.status === 'submitted' && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkResolved(complaint.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* --- DELETE BUTTON --- */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the complaint about "{complaint.subject}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(complaint.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}