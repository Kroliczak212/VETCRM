import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, Calendar, Clock, User, PawPrint, Stethoscope, Loader2, ArrowRight, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsService, type RescheduleRequest } from "@/services/appointments.service";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const RescheduleRequests = () => {
  const queryClient = useQueryClient();
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ['reschedule-requests', 'pending'],
    queryFn: () => appointmentsService.getRescheduleRequests('pending'),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => appointmentsService.approveReschedule(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Prośba o zmianę terminu została zaakceptowana");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się zaakceptować prośby");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason?: string }) =>
      appointmentsService.rejectReschedule(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      toast.success("Prośba o zmianę terminu została odrzucona");
      setRejectionDialogOpen(false);
      setRejectionReason("");
      setSelectedRequestId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się odrzucić prośby");
    },
  });

  const handleApprove = (requestId: number) => {
    approveMutation.mutate(requestId);
  };

  const handleOpenRejectDialog = (requestId: number) => {
    setSelectedRequestId(requestId);
    setRejectionDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedRequestId) {
      rejectMutation.mutate({
        requestId: selectedRequestId,
        reason: rejectionReason || undefined,
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, "dd MMM yyyy", { locale: pl }),
        time: format(date, "HH:mm", { locale: pl }),
        full: format(date, "dd MMM yyyy, HH:mm", { locale: pl }),
      };
    } catch {
      return { date: dateString, time: "", full: dateString };
    }
  };

  const formatRequestDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy, HH:mm", { locale: pl });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending") {
      return <Badge className="bg-yellow-500/20 text-yellow-700">Oczekująca</Badge>;
    }
    if (status === "approved") {
      return <Badge className="bg-green-500/20 text-green-700">Zaakceptowana</Badge>;
    }
    if (status === "rejected") {
      return <Badge className="bg-red-500/20 text-red-700">Odrzucona</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const pendingRequests = requests || [];

  return (
    <AppLayout role="receptionist">
      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Prośby o Zmianę Terminu</h1>
          <p className="text-muted-foreground">
            Zarządzaj prośbami klientów o zmianę terminu wizyt
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Oczekujące prośby
            </CardTitle>
            <CardDescription>
              Prośby wymagające Twojej akceptacji lub odrzucenia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">Brak prośb o zmianę terminu</h3>
                <p className="text-muted-foreground">
                  Wszystkie prośby zostały obsłużone lub nie ma żadnych nowych prośb.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klient</TableHead>
                      <TableHead>Pupil</TableHead>
                      <TableHead>Lekarz</TableHead>
                      <TableHead>Obecny termin</TableHead>
                      <TableHead>Nowy termin</TableHead>
                      <TableHead>Data prośby</TableHead>
                      <TableHead>Notatka</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request: RescheduleRequest) => {
                      const oldDateTime = formatDateTime(request.old_scheduled_at);
                      const newDateTime = formatDateTime(request.new_scheduled_at);
                      const requestedAt = formatRequestDate(request.requested_at);
                      const isProcessing = approveMutation.isPending || rejectMutation.isPending;

                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{request.client_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {request.client_phone}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PawPrint className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{request.pet_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {request.species}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{request.doctor_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {oldDateTime.date}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {oldDateTime.time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-primary" />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                  <Calendar className="h-3 w-3" />
                                  {newDateTime.date}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-primary">
                                  <Clock className="h-3 w-3" />
                                  {newDateTime.time}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{requestedAt}</span>
                          </TableCell>
                          <TableCell>
                            {request.client_note ? (
                              <div className="flex items-center gap-1 text-sm max-w-[200px]">
                                <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate" title={request.client_note}>
                                  {request.client_note}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Brak</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(request.id)}
                                disabled={isProcessing}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Akceptuj
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenRejectDialog(request.id)}
                                disabled={isProcessing}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Odrzuć
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć prośbę o zmianę terminu</DialogTitle>
            <DialogDescription>
              Możesz dodać powód odrzucenia, który zostanie przekazany klientowi.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Powód odrzucenia (opcjonalny)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Np. Brak dostępnych terminów w wybranym dniu..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectionDialogOpen(false);
                setRejectionReason("");
                setSelectedRequestId(null);
              }}
              disabled={rejectMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Odrzuć prośbę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default RescheduleRequests;
