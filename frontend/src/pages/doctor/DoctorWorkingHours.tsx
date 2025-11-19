import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Loader2, AlertCircle, Edit, Save, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workingHoursService, type WorkingHours } from "@/services/working-hours.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayEditState {
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export default function DoctorWorkingHours() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const doctorId = user.id;

  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);
  const [editState, setEditState] = useState<DayEditState>({
    isActive: false,
    startTime: "09:00",
    endTime: "17:00"
  });

  const dayNames: Record<DayOfWeek, string> = {
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela"
  };

  // Fetch working hours for current doctor
  const { data: workingHours, isLoading } = useQuery({
    queryKey: ['working-hours', 'doctor', doctorId],
    queryFn: () => workingHoursService.getByDoctorId(doctorId),
    enabled: !!doctorId,
  });

  // Create working hours mutation
  const createMutation = useMutation({
    mutationFn: (data: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }) =>
      workingHoursService.create({ doctorUserId: doctorId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      queryClient.refetchQueries({ queryKey: ['calendar'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały zapisane" });
      setEditingDay(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zapisać godzin pracy",
        variant: "destructive",
      });
    },
  });

  // Update working hours mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, isActive, startTime, endTime }: { id: number; isActive?: boolean; startTime?: string; endTime?: string }) =>
      workingHoursService.update(id, { isActive, startTime, endTime }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      queryClient.refetchQueries({ queryKey: ['calendar'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały zaktualizowane" });
      setEditingDay(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować godzin pracy",
        variant: "destructive",
      });
    },
  });

  // Delete working hours mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => workingHoursService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      queryClient.refetchQueries({ queryKey: ['calendar'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały usunięte" });
      setEditingDay(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się usunąć godzin pracy",
        variant: "destructive",
      });
    },
  });

  const handleEditDay = (day: DayOfWeek) => {
    const hoursForDay = workingHours?.[day] || [];
    const activeHours = hoursForDay.find(h => h.is_active);

    if (activeHours) {
      setEditState({
        isActive: true,
        startTime: activeHours.start_time.substring(0, 5),
        endTime: activeHours.end_time.substring(0, 5)
      });
    } else {
      setEditState({
        isActive: false,
        startTime: "09:00",
        endTime: "17:00"
      });
    }

    setEditingDay(day);
  };

  const handleSave = () => {
    if (!editingDay) return;

    const hoursForDay = workingHours?.[editingDay] || [];
    const existingHours = hoursForDay.find(h => h.is_active) || hoursForDay[0];

    if (editState.isActive) {
      // Validate times
      if (editState.startTime >= editState.endTime) {
        toast({
          title: "Błąd",
          description: "Godzina zakończenia musi być późniejsza niż rozpoczęcia",
          variant: "destructive",
        });
        return;
      }

      if (existingHours) {
        // Update existing
        updateMutation.mutate({
          id: existingHours.id,
          isActive: true,
          startTime: editState.startTime,
          endTime: editState.endTime
        });
      } else {
        // Create new
        createMutation.mutate({
          dayOfWeek: editingDay,
          startTime: editState.startTime,
          endTime: editState.endTime
        });
      }
    } else {
      // Set as day off
      if (existingHours) {
        updateMutation.mutate({
          id: existingHours.id,
          isActive: false
        });
      } else {
        // If no existing hours, just close edit mode
        setEditingDay(null);
      }
    }
  };

  const handleCancel = () => {
    setEditingDay(null);
  };

  return (
    <AppLayout role="doctor">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Moje godziny pracy</h1>
          <p className="text-muted-foreground">
            Domyślny tygodniowy harmonogram pracy
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informacja</AlertTitle>
          <AlertDescription>
            Te godziny są Twoim domyślnym harmonogramem pracy w tygodniu.
            Aby zmienić godziny dla konkretnych dni (np. urlop), przejdź do sekcji "Zmiany grafiku" w menu.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : workingHours ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(dayNames) as DayOfWeek[]).map((day) => {
              const hoursForDay = workingHours[day] || [];
              const activeHours = hoursForDay.find(h => h.is_active);
              const isEditing = editingDay === day;

              return (
                <Card key={day}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{dayNames[day]}</CardTitle>
                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <Badge variant={activeHours ? "default" : "secondary"}>
                            {activeHours ? "Pracuję" : "Dzień wolny"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDay(day)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`active-${day}`}>Pracuję w ten dzień</Label>
                          <Switch
                            id={`active-${day}`}
                            checked={editState.isActive}
                            onCheckedChange={(checked) => setEditState({ ...editState, isActive: checked })}
                          />
                        </div>

                        {editState.isActive && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`start-${day}`}>Od</Label>
                              <Input
                                id={`start-${day}`}
                                type="time"
                                value={editState.startTime}
                                onChange={(e) => setEditState({ ...editState, startTime: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`end-${day}`}>Do</Label>
                              <Input
                                id={`end-${day}`}
                                type="time"
                                value={editState.endTime}
                                onChange={(e) => setEditState({ ...editState, endTime: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={handleCancel}>
                            <X className="mr-2 h-4 w-4" />
                            Anuluj
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {(createMutation.isPending || updateMutation.isPending) && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <Save className="mr-2 h-4 w-4" />
                            Zapisz
                          </Button>
                        </div>
                      </div>
                    ) : activeHours ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {activeHours.start_time.substring(0, 5)} - {activeHours.end_time.substring(0, 5)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Dzień wolny
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Brak ustawionych godzin pracy. Kliknij "Edytuj" na dowolnym dniu aby ustawić godziny.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
