import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Plus, Search, Filter, Clock, User, PawPrint, Loader2, MapPin, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsService, type CreateAppointmentData, type Appointment } from "@/services/appointments.service";
import { usersService } from "@/services/users.service";
import { clientsService } from "@/services/clients.service";
import { petsService } from "@/services/pets.service";
import { appointmentReasonsService } from "@/services/appointment-reasons.service";
import { vaccinationTypesService } from "@/services/vaccination-types.service";
import { appointmentFormSchema, validateAndSanitize } from "@/lib/validation";

const Appointments = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedPetSpecies, setSelectedPetSpecies] = useState("");
  const [selectedReasonIsVaccination, setSelectedReasonIsVaccination] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Partial<CreateAppointmentData>>({
    petId: 0,
    doctorId: 0,
    scheduledAt: "",
    durationMinutes: 45,
    reason: "",
    reasonId: undefined,
    vaccinationTypeId: undefined,
    location: "",
  });

  // Fetch doctors (staff with role 'doctor')
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => usersService.getAll({ role: 'doctor', limit: 100 }),
  });

  // Fetch appointments for selected date
  const dateStr = selectedDate.toISOString().split('T')[0];
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', dateStr, selectedDoctor],
    queryFn: () => {
      const params: any = { date: dateStr, limit: 100 };
      if (selectedDoctor !== "all") {
        params.doctorId = Number(selectedDoctor);
      }
      return appointmentsService.getAll(params);
    },
  });

  // Fetch clients for the add appointment dialog
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsService.getAll({ limit: 100 }),
  });

  // Fetch appointment reasons
  const { data: appointmentReasonsData } = useQuery({
    queryKey: ['appointment-reasons'],
    queryFn: () => appointmentReasonsService.getAll({ isActive: true, limit: 100 }),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch vaccination types filtered by pet species
  const { data: vaccinationTypesData } = useQuery({
    queryKey: ['vaccination-types', selectedPetSpecies],
    queryFn: () => vaccinationTypesService.getAll({
      species: selectedPetSpecies,
      isActive: true,
      limit: 100
    }),
    enabled: !!selectedPetSpecies && !!selectedReasonIsVaccination,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch pets for selected client
  const { data: petsData } = useQuery({
    queryKey: ['pets', 'client', selectedClient],
    queryFn: () => petsService.getAll({ ownerId: Number(selectedClient) }),
    enabled: !!selectedClient,
  });

  // Fetch available slots for selected doctor and date
  const selectedDateForSlots = newAppointment.scheduledAt?.split('T')[0] || "";
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', newAppointment.doctorId, selectedDateForSlots],
    queryFn: () => appointmentsService.getAvailableSlots({
      doctorId: newAppointment.doctorId!,
      date: selectedDateForSlots
    }),
    enabled: !!newAppointment.doctorId && !!selectedDateForSlots,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Wizyta została umówiona pomyślnie");
      setIsAddDialogOpen(false);
      setNewAppointment({
        petId: 0,
        doctorId: 0,
        scheduledAt: "",
        durationMinutes: 45,
        reason: "",
        reasonId: undefined,
        vaccinationTypeId: undefined,
        location: "",
      });
      setSelectedClient("");
      setSelectedSlot("");
      setSelectedPetSpecies("");
      setSelectedReasonIsVaccination(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się umówić wizyty");
    },
  });

  const doctors = doctorsData?.data || [];
  const appointments = appointmentsData?.data || [];
  const clients = clientsData?.data || [];
  const pets = petsData?.data || [];
  const appointmentReasons = appointmentReasonsData?.data || [];
  const vaccinationTypes = vaccinationTypesData?.data || [];

  const timeSlots = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  const filteredAppointments = appointments.filter(
    (apt) => selectedDoctor === "all" || apt.doctor_user_id === Number(selectedDoctor)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "proposed":
        return "bg-yellow-500/20 text-yellow-700";
      case "confirmed":
        return "bg-primary/20 text-primary";
      case "in_progress":
        return "bg-accent/20 text-accent";
      case "completed":
        return "bg-green-500/20 text-green-700";
      case "cancelled":
      case "cancelled_late":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "proposed":
        return "Zaproponowana";
      case "confirmed":
        return "Potwierdzona";
      case "in_progress":
        return "W trakcie";
      case "completed":
        return "Zakończona";
      case "cancelled":
        return "Anulowana";
      case "cancelled_late":
        return "Anulowana (późno)";
      default:
        return status;
    }
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate and sanitize form data
    const validationResult = validateAndSanitize(appointmentFormSchema, newAppointment);

    if (!validationResult.success) {
      const firstError = validationResult.errors.errors[0];
      toast.error(firstError.message || "Wypełnij wszystkie wymagane pola poprawnie");

      // Log all validation errors in development
      if (import.meta.env.DEV) {
        console.error('Validation errors:', validationResult.errors.errors);
      }
      return;
    }

    // Submit validated and sanitized data
    createAppointmentMutation.mutate(validationResult.data as CreateAppointmentData);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleViewDetails = async (appointmentId: number) => {
    try {
      setLoadingDetails(true);
      setDetailsDialogOpen(true);
      const details = await appointmentsService.getById(appointmentId);
      setSelectedAppointmentDetails(details);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Nie udało się pobrać szczegółów wizyty");
      setDetailsDialogOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <AppLayout role="receptionist">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Kalendarz Wizyt</h1>
                <p className="text-muted-foreground">
                  Zarządzaj wizytami i harmonogramem lekarzy
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="medical" size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Umów Wizytę
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Umów Nową Wizytę</DialogTitle>
                    <DialogDescription>
                      Wypełnij formularz, aby umówić wizytę dla klienta
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleAddAppointment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client">Klient *</Label>
                        <Select
                          value={selectedClient}
                          onValueChange={(value) => {
                            setSelectedClient(value);
                            setNewAppointment({ ...newAppointment, petId: 0 });
                          }}
                        >
                          <SelectTrigger id="client">
                            <SelectValue placeholder="Wybierz klienta" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.first_name} {client.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pet">Pupil *</Label>
                        <Select
                          value={newAppointment.petId?.toString() || ""}
                          onValueChange={(value) => {
                            const selectedPet = pets.find(p => p.id === Number(value));
                            setNewAppointment({ ...newAppointment, petId: Number(value), vaccinationTypeId: undefined });
                            setSelectedPetSpecies(selectedPet?.species || "");
                          }}
                          disabled={!selectedClient}
                        >
                          <SelectTrigger id="pet">
                            <SelectValue placeholder={!selectedClient ? "Najpierw wybierz klienta" : "Wybierz pupila"} />
                          </SelectTrigger>
                          <SelectContent>
                            {pets.length > 0 ? (
                              pets.map((pet) => (
                                <SelectItem key={pet.id} value={pet.id.toString()}>
                                  {pet.name} ({pet.species})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                Brak pupili
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor">Lekarz *</Label>
                        <Select
                          value={newAppointment.doctorId?.toString() || ""}
                          onValueChange={(value) => setNewAppointment({ ...newAppointment, doctorId: Number(value) })}
                        >
                          <SelectTrigger id="doctor">
                            <SelectValue placeholder="Wybierz lekarza" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                {doctor.first_name} {doctor.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reasonId">Powód wizyty</Label>
                        <Select
                          value={newAppointment.reasonId?.toString() || ""}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setNewAppointment({ ...newAppointment, reasonId: undefined, vaccinationTypeId: undefined });
                              setSelectedReasonIsVaccination(false);
                            } else {
                              const selectedReason = appointmentReasons.find(r => r.id === Number(value));
                              setNewAppointment({
                                ...newAppointment,
                                reasonId: Number(value),
                                vaccinationTypeId: undefined
                              });
                              setSelectedReasonIsVaccination(!!selectedReason?.is_vaccination);
                            }
                          }}
                        >
                          <SelectTrigger id="reasonId">
                            <SelectValue placeholder="Wybierz powód wizyty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Brak / Inny</SelectItem>
                            {appointmentReasons.map((reason) => (
                              <SelectItem key={reason.id} value={reason.id.toString()}>
                                {reason.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Conditional vaccination type dropdown */}
                    {selectedReasonIsVaccination && selectedPetSpecies && (
                      <div className="space-y-2">
                        <Label htmlFor="vaccinationTypeId">Typ szczepienia *</Label>
                        <Select
                          value={newAppointment.vaccinationTypeId?.toString() || ""}
                          onValueChange={(value) => setNewAppointment({ ...newAppointment, vaccinationTypeId: Number(value) })}
                        >
                          <SelectTrigger id="vaccinationTypeId">
                            <SelectValue placeholder="Wybierz typ szczepienia" />
                          </SelectTrigger>
                          <SelectContent>
                            {vaccinationTypes.length > 0 ? (
                              vaccinationTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                  {type.name}
                                  {type.recommended_interval_months && ` (co ${type.recommended_interval_months} mies.)`}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                Brak dostępnych typów szczepień dla tego gatunku
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {vaccinationTypes.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Brak szczepień dla gatunku "{selectedPetSpecies}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="date">Data wizyty *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newAppointment.scheduledAt?.split('T')[0] || ""}
                        onChange={(e) => {
                          setNewAppointment({
                            ...newAppointment,
                            scheduledAt: e.target.value ? `${e.target.value}T09:00:00.000Z` : "",
                          });
                          setSelectedSlot("");
                        }}
                        disabled={!newAppointment.doctorId}
                      />
                      {!newAppointment.doctorId && (
                        <p className="text-xs text-muted-foreground">
                          Najpierw wybierz lekarza
                        </p>
                      )}
                    </div>

                    {newAppointment.doctorId && selectedDateForSlots && (
                      <div className="space-y-2">
                        <Label>Dostępne godziny *</Label>
                        {slotsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : availableSlots && availableSlots.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                            {availableSlots.map((slot) => (
                              <Button
                                key={slot.time}
                                type="button"
                                variant={selectedSlot === slot.time ? "default" : "outline"}
                                className={`h-auto py-2 ${
                                  !slot.available
                                    ? "opacity-50 cursor-not-allowed bg-destructive/10 hover:bg-destructive/10"
                                    : selectedSlot === slot.time
                                    ? "bg-primary"
                                    : "hover:bg-primary/10"
                                }`}
                                disabled={!slot.available}
                                onClick={() => {
                                  setSelectedSlot(slot.time);
                                  const currentDate = newAppointment.scheduledAt?.split('T')[0];
                                  setNewAppointment({
                                    ...newAppointment,
                                    scheduledAt: `${currentDate}T${slot.time}:00.000Z`,
                                  });
                                }}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-medium">{slot.time}</span>
                                  {!slot.available && (
                                    <span className="text-[10px] text-destructive">Zajęte</span>
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center border rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">
                              Lekarz nie pracuje w tym dniu lub brak dostępnych slotów
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Lokalizacja</Label>
                        <Input
                          id="location"
                          placeholder="np. Gabinet 1"
                          value={newAppointment.location || ""}
                          onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setSelectedSlot("");
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button type="submit" variant="medical" disabled={createAppointmentMutation.isPending}>
                        {createAppointmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Umów wizytę
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-[200px] text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {selectedDate.toLocaleDateString('pl-PL', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
                  Dziś
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Wszyscy lekarze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy lekarze</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr {doctor.first_name} {doctor.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wizyty Dzisiaj
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{filteredAppointments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Potwierdzone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {filteredAppointments.filter(a => a.status === 'confirmed').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  W trakcie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {filteredAppointments.filter(a => a.status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wolne sloty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-secondary">15</div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Harmonogram Wizyt</CardTitle>
              <CardDescription>
                Kliknij na wizytę, aby zobaczyć szczegóły lub edytować
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeSlots.map((timeSlot) => {
                  const slotAppointments = filteredAppointments.filter((apt) => {
                    try {
                      const aptDate = new Date(apt.scheduled_at);
                      const aptHour = aptDate.getHours();
                      const slotHour = parseInt(timeSlot.split(':')[0]);
                      return aptHour === slotHour;
                    } catch {
                      return false;
                    }
                  });

                  return (
                    <div key={timeSlot} className="flex gap-4 min-h-[80px]">
                      <div className="w-20 flex-shrink-0 pt-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {timeSlot}
                        </span>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {slotAppointments.length > 0 ? (
                          slotAppointments.map((apt) => {
                            const appointmentTime = new Date(apt.scheduled_at).toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });

                            return (
                              <Card
                                key={apt.id}
                                className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary"
                                onClick={() => handleViewDetails(apt.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge className={getStatusColor(apt.status)}>
                                      {getStatusLabel(apt.status)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {apt.duration_minutes} min
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <p className="text-xs text-muted-foreground">{appointmentTime}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <p className="text-sm font-semibold text-foreground">
                                        {apt.client_name}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <PawPrint className="h-3 w-3 text-muted-foreground" />
                                      <p className="text-xs text-muted-foreground">{apt.pet_name}</p>
                                    </div>

                                    {apt.reason && (
                                      <p className="text-xs text-muted-foreground italic">
                                        {apt.reason}
                                      </p>
                                    )}

                                    <p className="text-xs text-primary font-medium mt-2">
                                      Dr {apt.doctor_name}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        ) : (
                          <div className="col-span-3 border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                            <p className="text-sm">Brak wizyt - kliknij, aby umówić</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Szczegóły wizyty</DialogTitle>
              <DialogDescription>
                {selectedAppointmentDetails && new Date(selectedAppointmentDetails.scheduled_at).toLocaleDateString("pl-PL", {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedAppointmentDetails ? (
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Data i godzina</p>
                    <p className="text-base font-medium">
                      {new Date(selectedAppointmentDetails.scheduled_at).toLocaleDateString("pl-PL")} o{" "}
                      {new Date(selectedAppointmentDetails.scheduled_at).toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div>
                      <Badge className={getStatusColor(selectedAppointmentDetails.status)}>
                        {getStatusLabel(selectedAppointmentDetails.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Klient</p>
                    <p className="text-base font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedAppointmentDetails.client_name}
                    </p>
                    {selectedAppointmentDetails.client_phone && (
                      <p className="text-sm text-muted-foreground">
                        Tel: {selectedAppointmentDetails.client_phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Pupil</p>
                    <p className="text-base font-medium flex items-center gap-2">
                      <PawPrint className="h-4 w-4" />
                      {selectedAppointmentDetails.pet_name}
                    </p>
                    {selectedAppointmentDetails.species && (
                      <p className="text-sm text-muted-foreground">
                        {selectedAppointmentDetails.species}
                        {selectedAppointmentDetails.breed && ` • ${selectedAppointmentDetails.breed}`}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Lekarz weterynarii</p>
                    <p className="text-base font-medium">
                      Dr {selectedAppointmentDetails.doctor_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Czas trwania</p>
                    <p className="text-base font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedAppointmentDetails.duration_minutes} minut
                    </p>
                  </div>
                </div>

                {/* Reason */}
                {selectedAppointmentDetails.reason && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Powód wizyty</p>
                    <p className="text-base">{selectedAppointmentDetails.reason}</p>
                  </div>
                )}

                {/* Location */}
                {selectedAppointmentDetails.location && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Lokalizacja</p>
                    <p className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedAppointmentDetails.location}
                    </p>
                  </div>
                )}

                {/* Services */}
                {selectedAppointmentDetails.services && selectedAppointmentDetails.services.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Wykonane usługi</p>
                    <div className="border rounded-lg divide-y">
                      {selectedAppointmentDetails.services.map((service: any) => (
                        <div key={service.id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{service.total.toFixed(2)} zł</p>
                            {service.quantity > 1 && (
                              <p className="text-sm text-muted-foreground">
                                {service.quantity} × {service.unit_price.toFixed(2)} zł
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medical Record */}
                {selectedAppointmentDetails.medical_record && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm text-muted-foreground font-semibold">Rekord medyczny</p>

                    {selectedAppointmentDetails.medical_record.diagnosis && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Rozpoznanie:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedAppointmentDetails.medical_record.diagnosis}
                        </p>
                      </div>
                    )}

                    {selectedAppointmentDetails.medical_record.treatment && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Leczenie:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedAppointmentDetails.medical_record.treatment}
                        </p>
                      </div>
                    )}

                    {selectedAppointmentDetails.medical_record.prescription && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Recepta:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedAppointmentDetails.medical_record.prescription}
                        </p>
                      </div>
                    )}

                    {selectedAppointmentDetails.medical_record.notes && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Notatki:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedAppointmentDetails.medical_record.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* No medical record message */}
                {selectedAppointmentDetails.status === 'completed' && !selectedAppointmentDetails.medical_record && (
                  <div className="text-center py-6 border-t">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Brak dostępnego rekordu medycznego dla tej wizyty
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter>
              <Button onClick={() => setDetailsDialogOpen(false)}>Zamknij</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
};

export default Appointments;
