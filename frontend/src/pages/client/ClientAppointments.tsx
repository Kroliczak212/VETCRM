import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, MapPin, User, PawPrint, FileText, Loader2, ArrowLeft, X, CalendarClock, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { petsService, type Pet } from "@/services/pets.service";
import { usersService } from "@/services/users.service";
import { appointmentReasonsService } from "@/services/appointment-reasons.service";
import { vaccinationTypesService } from "@/services/vaccination-types.service";
import { CancelAppointmentDialog } from "@/components/CancelAppointmentDialog";
import { RescheduleAppointmentDialog } from "@/components/RescheduleAppointmentDialog";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const appointmentSchema = z.object({
  petId: z.string().min(1, "Wybierz zwierzę"),
  doctorId: z.string().min(1, "Wybierz lekarza"),
  selectedDate: z.string().min(1, "Wybierz datę"),
  durationMinutes: z.number().min(15, "Czas trwania musi być co najmniej 15 minut").default(30),
  reasonId: z.string().optional(),
  vaccinationTypeId: z.string().optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
});

const ClientAppointments = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterPetId = searchParams.get('petId');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedDateForSlots, setSelectedDateForSlots] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPetSpecies, setSelectedPetSpecies] = useState<string>("");
  const [selectedReasonIsVaccination, setSelectedReasonIsVaccination] = useState(false);

  // Cancel and reschedule dialog state
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isAppointmentDetailsDialogOpen, setIsAppointmentDetailsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      petId: "",
      doctorId: "",
      selectedDate: "",
      durationMinutes: 30,
      reasonId: "",
      vaccinationTypeId: "",
      reason: "",
      location: "",
    },
  });

  // Fetch appointments using React Query
  const { data: appointmentsData, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointmentsService.getAll({ limit: 100 }),
  });

  // Fetch pets using React Query
  const { data: petsData, isLoading: petsLoading } = useQuery({
    queryKey: ['pets', 'my'],
    queryFn: () => petsService.getAll({ limit: 100 }),
  });

  // Fetch doctors using React Query
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['users', 'doctors'],
    queryFn: () => usersService.getDoctors(),
  });

  // Fetch appointment reasons using React Query
  const { data: appointmentReasonsData } = useQuery({
    queryKey: ['appointment-reasons', 'active'],
    queryFn: () => appointmentReasonsService.getAll({ isActive: true, limit: 100 }),
  });

  // Fetch vaccination types based on selected pet species
  const { data: vaccinationTypesData } = useQuery({
    queryKey: ['vaccination-types', selectedPetSpecies],
    queryFn: () => vaccinationTypesService.getAll({ species: selectedPetSpecies, isActive: true, limit: 100 }),
    enabled: !!selectedPetSpecies && selectedReasonIsVaccination,
  });

  // Get selected doctor ID from form
  const selectedDoctorId = form.watch('doctorId');

  // Fetch available slots when doctor and date are selected
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedDoctorId, selectedDateForSlots],
    queryFn: () => appointmentsService.getAvailableSlots({
      doctorId: parseInt(selectedDoctorId),
      date: selectedDateForSlots
    }),
    enabled: !!selectedDoctorId && !!selectedDateForSlots,
  });

  const allAppointments = appointmentsData?.data || [];
  const pets = petsData?.data || [];
  const doctors = doctorsData?.data || [];
  const appointmentReasons = appointmentReasonsData?.data || [];
  const vaccinationTypes = vaccinationTypesData?.data || [];

  // Filter appointments by petId if provided in URL
  const appointments = filterPetId
    ? allAppointments.filter(a => a.pet_id === parseInt(filterPetId))
    : allAppointments;

  // Find the filtered pet's name for display
  const filteredPet = filterPetId
    ? pets.find(p => p.id === parseInt(filterPetId))
    : null;

  const upcomingAppointments = appointments.filter(
    (a) => !["completed", "cancelled", "cancelled_late"].includes(a.status)
  );
  const pastAppointments = appointments.filter((a) => a.status === "completed");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      proposed: { label: "Zaproponowana", className: "bg-blue-100 text-blue-800" },
      confirmed: { label: "Potwierdzona", className: "bg-green-100 text-green-800" },
      in_progress: { label: "W trakcie", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "Zakończona", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Odwołana", className: "bg-red-100 text-red-800" },
      cancelled_late: { label: "Odwołana (późno)", className: "bg-red-200 text-red-900" },
    };
    const variant = variants[status] || variants.proposed;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const onSubmit = async (data: z.infer<typeof appointmentSchema>) => {
    try {
      setSubmitting(true);

      // Validate that a slot is selected
      if (!selectedSlot) {
        toast({
          title: "Błąd",
          description: "Wybierz godzinę wizyty",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Combine date and selected slot time into ISO string
      const scheduledAt = `${data.selectedDate}T${selectedSlot}:00.000Z`;

      await appointmentsService.create({
        petId: parseInt(data.petId),
        doctorId: parseInt(data.doctorId),
        scheduledAt,
        durationMinutes: data.durationMinutes,
        reasonId: data.reasonId ? parseInt(data.reasonId) : undefined,
        vaccinationTypeId: data.vaccinationTypeId ? parseInt(data.vaccinationTypeId) : undefined,
        reason: data.reason,
        location: data.location,
        status: "proposed", // Client appointments start as "proposed"
      });

      toast({
        title: "Wizyta zaproponowana",
        description: "Twoja propozycja wizyty została wysłana. Otrzymasz potwierdzenie po zaakceptowaniu przez recepcję.",
      });

      // Refresh appointments list
      await refetchAppointments();

      setDialogOpen(false);
      form.reset();
      setSelectedSlot("");
      setSelectedDateForSlots("");
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaproponować wizyty",
        variant: "destructive",
      });
      console.error("Error creating appointment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel dialog
  const handleOpenCancelDialog = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setIsCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setIsCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  // Handle reschedule dialog
  const handleOpenRescheduleDialog = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setIsRescheduleDialogOpen(true);
  };

  const handleCloseRescheduleDialog = () => {
    setIsRescheduleDialogOpen(false);
    setAppointmentToReschedule(null);
  };

  const handleViewDetails = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsAppointmentDetailsDialogOpen(true);
  };

  const handleCloseAppointmentDetailsDialog = () => {
    setIsAppointmentDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  };


  if (appointmentsLoading || petsLoading || doctorsLoading) {
    return (
      <AppLayout role="client">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="client">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {filteredPet && (
              <Button variant="outline" size="icon" onClick={() => navigate('/client/appointments')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {filteredPet ? `Historia wizyt - ${filteredPet.name}` : 'Moje Wizyty'}
              </h1>
              <p className="text-muted-foreground">
                {filteredPet ? `Wizyty dla ${filteredPet.species}: ${filteredPet.name}` : 'Zarządzaj wizytami dla swoich pupili'}
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Umów wizytę
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Umów nową wizytę</DialogTitle>
                <DialogDescription>Wybierz pupila, lekarza i preferowany termin</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Pet and Doctor - 2 column grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="petId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zwierzę</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedPet = pets.find(p => p.id === Number(value));
                              setSelectedPetSpecies(selectedPet?.species || "");
                              form.setValue('vaccinationTypeId', "");
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz zwierzę" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pets.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  Brak zwierząt - dodaj zwierzę w zakładce "Moje Pupile"
                                </SelectItem>
                              ) : (
                                pets.map((pet) => (
                                  <SelectItem key={pet.id} value={pet.id.toString()}>
                                    {pet.name} ({pet.species})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lekarz</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedSlot("");
                              setSelectedDateForSlots("");
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz lekarza" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {doctors.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  Brak dostępnych lekarzy
                                </SelectItem>
                              ) : (
                                doctors.map((doctor: any) => (
                                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                    {doctor.first_name} {doctor.last_name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Reason and Location - 2 column grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reasonId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Powód wizyty</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === "none") {
                                setSelectedReasonIsVaccination(false);
                                form.setValue('vaccinationTypeId', "");
                              } else {
                                const selectedReason = appointmentReasons.find(r => r.id === Number(value));
                                setSelectedReasonIsVaccination(!!selectedReason?.is_vaccination);
                                if (!selectedReason?.is_vaccination) {
                                  form.setValue('vaccinationTypeId', "");
                                }
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz powód wizyty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Brak / Inny</SelectItem>
                              {appointmentReasons.map((reason: any) => (
                                <SelectItem key={reason.id} value={reason.id.toString()}>
                                  {reason.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lokalizacja (opcjonalnie)</FormLabel>
                          <FormControl>
                            <Input placeholder="np. Gabinet 1..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {selectedReasonIsVaccination && selectedPetSpecies && (
                    <FormField
                      control={form.control}
                      name="vaccinationTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ szczepienia *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz typ szczepienia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vaccinationTypes.length > 0 ? (
                                vaccinationTypes.map((type: any) => (
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="selectedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data wizyty</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setSelectedDateForSlots(e.target.value);
                              setSelectedSlot("");
                            }}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedDoctorId && selectedDateForSlots && (
                    <div className="space-y-2">
                      <Label>Wybierz godzinę</Label>
                      {slotsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : availableSlots && availableSlots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                          {availableSlots.map((slot: any) => (
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
                              onClick={() => setSelectedSlot(slot.time)}
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
                        <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg">
                          Brak dostępnych terminów w tym dniu
                        </div>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dodatkowy opis (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Opisz objawy lub dodatkowe informacje..." {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Anuluj
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting || pets.length === 0}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Zarezerwuj wizytę
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Upcoming Appointments */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {filteredPet ? `Nadchodzące wizyty - ${filteredPet.name}` : 'Nadchodzące wizyty'}
          </h2>
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Brak nadchodzących wizyt</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Date/Time */}
                      <div className="lg:w-32">
                        <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                          <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
                          <p className="font-bold text-foreground">
                            {new Date(appointment.scheduled_at).toLocaleDateString("pl-PL")}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(appointment.scheduled_at).toLocaleTimeString("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-lg text-foreground mb-1">
                              {appointment.reason || "Wizyta"}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <PawPrint className="h-4 w-4" />
                            <span className="font-medium text-foreground">{appointment.pet_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{appointment.doctor_name}</span>
                          </div>
                          {appointment.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{appointment.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(appointment.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Zobacz szczegóły
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRescheduleDialog(appointment)}
                            disabled={submitting}
                          >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Zmień termin
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCancelDialog(appointment)}
                            disabled={submitting}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Appointments */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {filteredPet ? `Przeszłe wizyty - ${filteredPet.name}` : 'Historia wizyt'}
          </h2>
          {pastAppointments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Brak historii wizyt</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <Card key={appointment.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-32">
                        <div className="bg-muted/50 rounded-lg p-4 text-center border border-border">
                          <Calendar className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                          <p className="font-bold text-foreground">
                            {new Date(appointment.scheduled_at).toLocaleDateString("pl-PL")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.scheduled_at).toLocaleTimeString("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-foreground mb-1">
                              {appointment.reason || "Wizyta"}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-4 w-4" />
                            <span>{appointment.pet_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{appointment.doctor_name}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(appointment.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Zobacz szczegóły wizyty
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Appointment Dialog */}
      <CancelAppointmentDialog
        appointment={appointmentToCancel}
        isOpen={isCancelDialogOpen}
        onClose={handleCloseCancelDialog}
      />

      {/* Reschedule Appointment Dialog */}
      <RescheduleAppointmentDialog
        appointment={appointmentToReschedule}
        isOpen={isRescheduleDialogOpen}
        onClose={handleCloseRescheduleDialog}
      />

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        isOpen={isAppointmentDetailsDialogOpen}
        onClose={handleCloseAppointmentDetailsDialog}
      />
    </AppLayout>
  );
};

export default ClientAppointments;
