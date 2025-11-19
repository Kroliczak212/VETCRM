import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Edit, Trash2, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService, type User } from "@/services/users.service";
import { workingHoursService, type CreateWorkingHoursData, type BulkCreateWorkingHoursData, type WorkingHours } from "@/services/working-hours.service";
import { Checkbox } from "@/components/ui/checkbox";

export default function WorkingHoursManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [editingHours, setEditingHours] = useState<WorkingHours | null>(null);

  const dayNames = {
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela"
  };

  const [newWorkingHours, setNewWorkingHours] = useState<Partial<CreateWorkingHoursData>>({
    doctorUserId: undefined,
    dayOfWeek: "monday",
    startTime: "08:00",
    endTime: "16:00"
  });

  const [bulkWorkingHours, setBulkWorkingHours] = useState<Partial<BulkCreateWorkingHoursData>>({
    doctorUserId: undefined,
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startTime: "08:00",
    endTime: "16:00"
  });

  // Fetch all doctors
  const { data: usersData } = useQuery({
    queryKey: ['users', 'doctors'],
    queryFn: () => usersService.getAll({ role: 'doctor', limit: 100 }),
  });

  const doctors = usersData?.data?.filter((u: User) => u.role_name === 'doctor') || [];

  // Fetch all working hours
  const { data: allWorkingHours, isLoading: hoursLoading } = useQuery({
    queryKey: ['working-hours', 'all'],
    queryFn: () => workingHoursService.getAll(),
  });

  // Fetch working hours for selected doctor
  const { data: doctorWorkingHours, isLoading: doctorHoursLoading } = useQuery({
    queryKey: ['working-hours', 'doctor', selectedDoctor],
    queryFn: () => workingHoursService.getByDoctorId(selectedDoctor!),
    enabled: !!selectedDoctor,
  });

  // Create working hours mutation
  const createWorkingHoursMutation = useMutation({
    mutationFn: (data: CreateWorkingHoursData) => workingHoursService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały dodane pomyślnie" });
      setIsAddDialogOpen(false);
      setNewWorkingHours({
        doctorUserId: undefined,
        dayOfWeek: "monday",
        startTime: "08:00",
        endTime: "16:00"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać godzin pracy",
        variant: "destructive",
      });
    },
  });

  // Bulk create working hours mutation
  const bulkCreateWorkingHoursMutation = useMutation({
    mutationFn: (data: BulkCreateWorkingHoursData) => workingHoursService.bulkCreate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({
        title: "Sukces",
        description: `Dodano ${data.created.length} godzin pracy dla wybranych dni`
      });
      setIsBulkDialogOpen(false);
      setBulkWorkingHours({
        doctorUserId: undefined,
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        startTime: "08:00",
        endTime: "16:00"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać godzin pracy",
        variant: "destructive",
      });
    },
  });

  // Update working hours mutation
  const updateWorkingHoursMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { startTime: string; endTime: string } }) =>
      workingHoursService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały zaktualizowane" });
      setIsEditDialogOpen(false);
      setEditingHours(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować godzin pracy",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      workingHoursService.update(id, { isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({
        title: "Sukces",
        description: `Godziny pracy zostały ${variables.isActive ? 'aktywowane' : 'dezaktywowane'}`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zmienić statusu",
        variant: "destructive",
      });
    },
  });

  // Delete working hours mutation
  const deleteWorkingHoursMutation = useMutation({
    mutationFn: (id: number) => workingHoursService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({ title: "Sukces", description: "Godziny pracy zostały usunięte" });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się usunąć godzin pracy",
        variant: "destructive",
      });
    },
  });

  const handleAddWorkingHours = () => {
    if (!newWorkingHours.doctorUserId || !newWorkingHours.dayOfWeek || !newWorkingHours.startTime || !newWorkingHours.endTime) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }
    createWorkingHoursMutation.mutate(newWorkingHours as CreateWorkingHoursData);
  };

  const handleBulkAdd = () => {
    if (!bulkWorkingHours.doctorUserId || !bulkWorkingHours.days?.length || !bulkWorkingHours.startTime || !bulkWorkingHours.endTime) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }
    bulkCreateWorkingHoursMutation.mutate(bulkWorkingHours as BulkCreateWorkingHoursData);
  };

  const handleEditWorkingHours = () => {
    if (!editingHours) return;

    const [startHour, startMinute] = editingHours.start_time.split(':');
    const [endHour, endMinute] = editingHours.end_time.split(':');

    updateWorkingHoursMutation.mutate({
      id: editingHours.id,
      data: {
        startTime: `${startHour}:${startMinute}`,
        endTime: `${endHour}:${endMinute}`
      }
    });
  };

  const handleDeleteWorkingHours = (id: number, day: string) => {
    if (confirm(`Czy na pewno chcesz usunąć godziny pracy dla ${day}?`)) {
      deleteWorkingHoursMutation.mutate(id);
    }
  };

  const handleToggleDayInBulk = (day: typeof bulkWorkingHours.days extends (infer T)[] ? T : never) => {
    const currentDays = bulkWorkingHours.days || [];
    if (currentDays.includes(day)) {
      setBulkWorkingHours({
        ...bulkWorkingHours,
        days: currentDays.filter(d => d !== day)
      });
    } else {
      setBulkWorkingHours({
        ...bulkWorkingHours,
        days: [...currentDays, day]
      });
    }
  };

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Zarządzanie godzinami pracy</h1>
            <p className="text-muted-foreground">Ustaw domyślne tygodniowe godziny pracy lekarzy</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Dodaj masowo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Dodaj godziny pracy dla wielu dni</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Lekarz *</Label>
                    <Select
                      value={bulkWorkingHours.doctorUserId?.toString()}
                      onValueChange={(value) => setBulkWorkingHours({ ...bulkWorkingHours, doctorUserId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz lekarza" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor: User) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.first_name} {doctor.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Dni tygodnia *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(dayNames) as Array<keyof typeof dayNames>).map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={`bulk-${day}`}
                            checked={bulkWorkingHours.days?.includes(day)}
                            onCheckedChange={() => handleToggleDayInBulk(day)}
                          />
                          <label
                            htmlFor={`bulk-${day}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {dayNames[day]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Godzina rozpoczęcia *</Label>
                      <Input
                        type="time"
                        value={bulkWorkingHours.startTime}
                        onChange={(e) => setBulkWorkingHours({ ...bulkWorkingHours, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Godzina zakończenia *</Label>
                      <Input
                        type="time"
                        value={bulkWorkingHours.endTime}
                        onChange={(e) => setBulkWorkingHours({ ...bulkWorkingHours, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleBulkAdd} disabled={bulkCreateWorkingHoursMutation.isPending}>
                    {bulkCreateWorkingHoursMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj godziny
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj godziny pracy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Dodaj godziny pracy</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Lekarz *</Label>
                    <Select
                      value={newWorkingHours.doctorUserId?.toString()}
                      onValueChange={(value) => setNewWorkingHours({ ...newWorkingHours, doctorUserId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz lekarza" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor: User) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.first_name} {doctor.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Dzień tygodnia *</Label>
                    <Select
                      value={newWorkingHours.dayOfWeek}
                      onValueChange={(value: any) => setNewWorkingHours({ ...newWorkingHours, dayOfWeek: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz dzień" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(dayNames) as Array<keyof typeof dayNames>).map((day) => (
                          <SelectItem key={day} value={day}>
                            {dayNames[day]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Godzina rozpoczęcia *</Label>
                      <Input
                        type="time"
                        value={newWorkingHours.startTime}
                        onChange={(e) => setNewWorkingHours({ ...newWorkingHours, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Godzina zakończenia *</Label>
                      <Input
                        type="time"
                        value={newWorkingHours.endTime}
                        onChange={(e) => setNewWorkingHours({ ...newWorkingHours, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleAddWorkingHours} disabled={createWorkingHoursMutation.isPending}>
                    {createWorkingHoursMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj godziny
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj godziny pracy</DialogTitle>
            </DialogHeader>
            {editingHours && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Dzień</Label>
                  <Input value={dayNames[editingHours.day_of_week as keyof typeof dayNames]} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Godzina rozpoczęcia</Label>
                    <Input
                      type="time"
                      value={editingHours.start_time.substring(0, 5)}
                      onChange={(e) => setEditingHours({ ...editingHours, start_time: e.target.value + ':00' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Godzina zakończenia</Label>
                    <Input
                      type="time"
                      value={editingHours.end_time.substring(0, 5)}
                      onChange={(e) => setEditingHours({ ...editingHours, end_time: e.target.value + ':00' })}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleEditWorkingHours} disabled={updateWorkingHoursMutation.isPending}>
                {updateWorkingHoursMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor selector */}
        <div className="mb-6">
          <Label>Wybierz lekarza, aby zobaczyć jego harmonogram</Label>
          <Select value={selectedDoctor?.toString() || ""} onValueChange={(value) => setSelectedDoctor(parseInt(value))}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Wybierz lekarza" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor: User) => (
                <SelectItem key={doctor.id} value={doctor.id.toString()}>
                  Dr. {doctor.first_name} {doctor.last_name}
                  {!doctor.is_active && " (nieaktywny)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Working hours display */}
        {selectedDoctor && (
          <div className="space-y-4">
            {doctorHoursLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : doctorWorkingHours ? (
              <div className="grid gap-4 md:grid-cols-2">
                {(Object.keys(dayNames) as Array<keyof typeof dayNames>).map((day) => {
                  const hoursForDay = doctorWorkingHours[day] || [];
                  return (
                    <Card key={day}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{dayNames[day]}</CardTitle>
                          <Badge variant={hoursForDay.length > 0 ? "default" : "secondary"}>
                            {hoursForDay.length} godzin
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {hoursForDay.length > 0 ? (
                          <div className="space-y-2">
                            {hoursForDay.map((hours: WorkingHours) => (
                              <div
                                key={hours.id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {hours.start_time.substring(0, 5)} - {hours.end_time.substring(0, 5)}
                                  </span>
                                  <Badge variant={hours.is_active ? "default" : "secondary"}>
                                    {hours.is_active ? "Aktywne" : "Nieaktywne"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      toggleActiveMutation.mutate({
                                        id: hours.id,
                                        isActive: !hours.is_active
                                      });
                                    }}
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    {hours.is_active ? "Dezaktywuj" : "Aktywuj"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingHours(hours);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteWorkingHours(hours.id, dayNames[day])}
                                    disabled={deleteWorkingHoursMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Brak godzin pracy
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {!selectedDoctor && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Wybierz lekarza, aby zobaczyć i zarządzać jego godzinami pracy
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
