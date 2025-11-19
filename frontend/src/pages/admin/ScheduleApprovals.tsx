import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Loader2, CheckCircle2, XCircle, AlertCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesService, type Schedule, type ApproveScheduleData } from "@/services/schedules.service";

export default function ScheduleApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewingSchedule, setReviewingSchedule] = useState<Schedule | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');

  const { data: allSchedules, isLoading } = useQuery({
    queryKey: ['schedules', 'all'],
    queryFn: () => schedulesService.getAll({}),
  });

  const schedules = allSchedules?.data || [];
  const pendingSchedules = schedules.filter((s: Schedule) => s.status === 'pending');
  const approvedSchedules = schedules.filter((s: Schedule) => s.status === 'approved');
  const rejectedSchedules = schedules.filter((s: Schedule) => s.status === 'rejected');

  const approveScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApproveScheduleData }) =>
      schedulesService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: "Sukces",
        description: `Wniosek został ${variables.data.status === 'approved' ? 'zatwierdzony' : 'odrzucony'}`
      });
      setReviewingSchedule(null);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się przetworzyć wniosku",
        variant: "destructive",
      });
    },
  });

  const handleReview = (schedule: Schedule, action: 'approved' | 'rejected') => {
    setReviewingSchedule(schedule);
    setApprovalAction(action);
    setApprovalNotes("");
  };

  const handleConfirmReview = () => {
    if (!reviewingSchedule) return;
    approveScheduleMutation.mutate({
      id: reviewingSchedule.id,
      data: { status: approvalAction, notes: approvalNotes || undefined }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  };

  const getStatusBadge = (status: Schedule['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Oczekuje</Badge>;
      case 'approved': return <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Zatwierdzony</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Odrzucony</Badge>;
    }
  };

  const ScheduleCard = ({ schedule, showActions = false }: { schedule: Schedule; showActions?: boolean }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              {schedule.doctor_name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(schedule.date)}
            </div>
          </div>
          {getStatusBadge(schedule.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
            </span>
          </div>
          {schedule.notes && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground font-medium mb-1">Uzasadnienie lekarza:</p>
              <p className="text-sm">{schedule.notes}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Złożono: {new Date(schedule.created_at).toLocaleString('pl-PL')}
          </div>
          {showActions && schedule.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => handleReview(schedule, 'approved')} disabled={approveScheduleMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Zatwierdź
              </Button>
              <Button className="flex-1" variant="destructive" onClick={() => handleReview(schedule, 'rejected')} disabled={approveScheduleMutation.isPending}>
                <XCircle className="mr-2 h-4 w-4" />Odrzuć
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Wnioski o zmiany grafiku</h1>
          <p className="text-muted-foreground">Przeglądaj i zatwierdzaj wnioski lekarzy o zmianę godzin pracy</p>
        </div>
        <Dialog open={!!reviewingSchedule} onOpenChange={(open) => !open && setReviewingSchedule(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{approvalAction === 'approved' ? 'Zatwierdź wniosek' : 'Odrzuć wniosek'}</DialogTitle>
            </DialogHeader>
            {reviewingSchedule && (
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Lekarz</Label><p className="text-sm font-medium">{reviewingSchedule.doctor_name}</p></div>
                <div className="space-y-2"><Label>Data</Label><p className="text-sm font-medium">{formatDate(reviewingSchedule.date)}</p></div>
                <div className="space-y-2"><Label>Godziny</Label><p className="text-sm font-medium">{reviewingSchedule.start_time.substring(0, 5)} - {reviewingSchedule.end_time.substring(0, 5)}</p></div>
                {reviewingSchedule.notes && (
                  <div className="space-y-2"><Label>Uzasadnienie lekarza</Label><p className="text-sm p-3 rounded-lg bg-muted">{reviewingSchedule.notes}</p></div>
                )}
                <div className="space-y-2">
                  <Label>Notatka (opcjonalna)</Label>
                  <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder={approvalAction === 'approved' ? "Dodatkowa notatka..." : "Powód odrzucenia..."} rows={3} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewingSchedule(null)}>Anuluj</Button>
              <Button onClick={handleConfirmReview} disabled={approveScheduleMutation.isPending} variant={approvalAction === 'rejected' ? 'destructive' : 'default'}>
                {approveScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {approvalAction === 'approved' ? 'Zatwierdź' : 'Odrzuć'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Do rozpatrzenia ({pendingSchedules.length})</TabsTrigger>
              <TabsTrigger value="approved">Zatwierdzone ({approvedSchedules.length})</TabsTrigger>
              <TabsTrigger value="rejected">Odrzucone ({rejectedSchedules.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-4 mt-6">
              {pendingSchedules.length > 0 ? (
                pendingSchedules.map((schedule: Schedule) => <ScheduleCard key={schedule.id} schedule={schedule} showActions={true} />)
              ) : (
                <Card><CardContent className="py-12"><div className="text-center"><CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Brak oczekujących wniosków</p></div></CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="approved" className="space-y-4 mt-6">
              {approvedSchedules.length > 0 ? (
                approvedSchedules.map((schedule: Schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)
              ) : (
                <Card><CardContent className="py-12"><p className="text-center text-muted-foreground">Brak zatwierdzonych wniosków</p></CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="rejected" className="space-y-4 mt-6">
              {rejectedSchedules.length > 0 ? (
                rejectedSchedules.map((schedule: Schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)
              ) : (
                <Card><CardContent className="py-12"><p className="text-center text-muted-foreground">Brak odrzuconych wniosków</p></CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
