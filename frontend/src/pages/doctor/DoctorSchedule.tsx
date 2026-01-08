import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Clock, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesService, type CreateScheduleData, type Schedule } from "@/services/schedules.service";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DoctorSchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Get current user ID from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const doctorId = user.id;

  const [newSchedule, setNewSchedule] = useState<Partial<CreateScheduleData>>({
    doctorId: doctorId,
    date: "",
    startTime: "08:00",
    endTime: "16:00",
    notes: ""
  });

  const { data: allSchedules, isLoading } = useQuery({
    queryKey: ['schedules', 'doctor', doctorId],
    queryFn: () => schedulesService.getAll({ doctorId }),
    enabled: !!doctorId,
  });

  const schedules = allSchedules?.data || [];
  const sortedSchedules = [...schedules].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const createScheduleMutation = useMutation({
    mutationFn: (data: CreateScheduleData) => schedulesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['calendar'] });
      toast({
        title: "Sukces",
        description: "Zmiana grafiku została zapisana"
      });
      setIsAddDialogOpen(false);
      setNewSchedule({
        doctorId: doctorId,
        date: "",
        startTime: "08:00",
        endTime: "16:00",
        notes: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się utworzyć zmiany",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => schedulesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['calendar'] });
      toast({
        title: "Sukces",
        description: "Zmiana została usunięta"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się usunąć zmiany",
        variant: "destructive",
      });
    },
  });

  const handleCreateSchedule = () => {
    if (!newSchedule.date || !newSchedule.startTime || !newSchedule.endTime) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    // Validate that end time is after start time (unless it's a day off: 00:00-00:00)
    if (newSchedule.startTime !== "00:00" && newSchedule.startTime >= newSchedule.endTime) {
      toast({
        title: "Błąd",
        description: "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
        variant: "destructive",
      });
      return;
    }

    createScheduleMutation.mutate(newSchedule as CreateScheduleData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Czy na pewno chcesz usunąć tę zmianę?')) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const isDayOff = (schedule: Schedule) => {
    return schedule.start_time === '00:00:00' && schedule.end_time === '00:00:00';
  };

  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDate(schedule.date)}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(schedule.id)}
            disabled={deleteScheduleMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isDayOff(schedule) ? (
            <Badge variant="outline" className="text-muted-foreground">
              Dzień wolny
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium font-mono text-lg">
                {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
              </span>
            </div>
          )}

          {schedule.notes && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground font-medium mb-1">Notatki:</p>
              <p className="text-sm">{schedule.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Utworzono: {new Date(schedule.created_at).toLocaleString('pl-PL')}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout role="doctor">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Zmiany grafiku</h1>
            <p className="text-muted-foreground">
              Zarządzaj jednorazowymi zmianami godzin pracy
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj zmianę
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj zmianę grafiku</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Godzina rozpoczęcia *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Godzina zakończenia *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    Wskazówka: Aby zaznaczyć dzień wolny, ustaw godziny 00:00 - 00:00
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notatki (opcjonalne)</Label>
                  <Textarea
                    id="notes"
                    value={newSchedule.notes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                    placeholder="Powód zmiany, dodatkowe informacje..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleCreateSchedule} disabled={createScheduleMutation.isPending}>
                  {createScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmianę
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedSchedules.length > 0 ? (
          <div className="space-y-4">
            {sortedSchedules.map((schedule: Schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nie masz jeszcze żadnych zmian grafiku
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Dodaj zmianę używając przycisku powyżej
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
