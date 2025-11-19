import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Calendar, Clock, User, PawPrint, Stethoscope, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsService } from "@/services/appointments.service";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const ProposedAppointments = () => {
  const queryClient = useQueryClient();

  // Fetch proposed appointments
  const { data: proposedData, isLoading } = useQuery({
    queryKey: ['appointments', 'proposed'],
    queryFn: () => appointmentsService.getAll({ status: 'proposed', limit: 100 }),
  });

  // Mutation to update appointment status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'confirmed' | 'cancelled' }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      const action = variables.status === 'confirmed' ? 'zaakceptowana' : 'odrzucona';
      toast.success(`Wizyta została ${action}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się zaktualizować statusu wizyty");
    },
  });

  const proposedAppointments = proposedData?.data || [];

  const handleAccept = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'confirmed' });
  };

  const handleReject = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'cancelled' });
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, "dd MMM yyyy", { locale: pl }),
        time: format(date, "HH:mm", { locale: pl }),
      };
    } catch {
      return { date: dateString, time: "" };
    }
  };

  return (
    <AppLayout role="receptionist">
      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Propozycje Wizyt</h1>
          <p className="text-muted-foreground">
            Zarządzaj wizytami proponowanymi przez klientów
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Oczekujące propozycje
            </CardTitle>
            <CardDescription>
              Wizyty ze statusem "Zaproponowana" wymagają Twojej akceptacji lub odrzucenia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : proposedAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">Brak propozycji wizyt</h3>
                <p className="text-muted-foreground">
                  Wszystkie wizyty zostały obsłużone lub nie ma żadnych nowych propozycji.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data i Godzina</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Pupil</TableHead>
                      <TableHead>Lekarz</TableHead>
                      <TableHead>Powód</TableHead>
                      <TableHead>Czas trwania</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposedAppointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.scheduled_at);
                      const isProcessing = updateStatusMutation.isPending;

                      return (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 font-medium">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {date}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {time}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{appointment.client_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.client_phone}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PawPrint className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{appointment.pet_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.species}
                                  {appointment.breed && ` • ${appointment.breed}`}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{appointment.doctor_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {appointment.reason ? (
                              <span className="text-sm">{appointment.reason}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Brak opisu</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {appointment.duration_minutes} min
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAccept(appointment.id)}
                                disabled={isProcessing}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Akceptuj
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(appointment.id)}
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
    </AppLayout>
  );
};

export default ProposedAppointments;
