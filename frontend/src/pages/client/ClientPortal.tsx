import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Cat, Calendar, Syringe, FileText, Loader2, Eye, X, CalendarClock } from "lucide-react";
import { petsService, type Pet } from "@/services/pets.service";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { vaccinationsService, type Vaccination } from "@/services/vaccinations.service";
import { authService } from "@/services/auth.service";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import { CancelAppointmentDialog } from "@/components/CancelAppointmentDialog";
import { RescheduleAppointmentDialog } from "@/components/RescheduleAppointmentDialog";

const ClientPortal = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Cancel and reschedule dialog state
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);

  // Fetch pets
  const { data: petsData, isLoading: petsLoading } = useQuery({
    queryKey: ['pets', 'my'],
    queryFn: () => petsService.getAll({ limit: 100 }),
  });

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointmentsService.getAll({ limit: 100 }),
  });

  // Fetch vaccinations for calendar
  const { data: vaccinationsData, isLoading: vaccinationsLoading } = useQuery({
    queryKey: ['vaccinations', 'my'],
    queryFn: () => vaccinationsService.getAll({ limit: 100 }),
  });

  const myPets = petsData?.data || [];
  const allAppointments = appointmentsData?.data || [];
  const allVaccinations = vaccinationsData?.data || [];

  // Filter upcoming appointments (not completed/cancelled)
  const upcomingAppointments = allAppointments
    .filter((apt: Appointment) => !['completed', 'cancelled', 'cancelled_late'].includes(apt.status))
    .sort((a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3); // Show max 3

  // Build vaccination calendar: upcoming vaccinations in next 90 days, sorted by due date
  const vaccinationCalendar = allVaccinations
    .filter((vac: Vaccination) => vac.status === 'due_soon' || vac.status === 'overdue')
    .sort((a: Vaccination, b: Vaccination) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
    .slice(0, 5); // Show max 5

  const getSpeciesIcon = (species: string) => {
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('pies') || speciesLower.includes('dog')) return Dog;
    if (speciesLower.includes('kot') || speciesLower.includes('cat')) return Cat;
    return Dog;
  };

  const getStatusBadge = (status: string) => {
    if (status === "confirmed") {
      return <Badge className="bg-secondary/20 text-secondary">Potwierdzona</Badge>;
    }
    if (status === "proposed") {
      return <Badge className="bg-yellow-500/20 text-yellow-700">Zaproponowana</Badge>;
    }
    return <Badge className="bg-accent/20 text-accent">Oczekująca</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL");
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' });
  };

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return "Nieznany wiek";
    const birth = new Date(birthDate);
    const now = new Date();
    const ageYears = now.getFullYear() - birth.getFullYear();
    const ageMonths = now.getMonth() - birth.getMonth();

    if (ageYears === 0) {
      return `${ageMonths} ${ageMonths === 1 ? 'miesiąc' : 'miesięcy'}`;
    } else if (ageYears === 1) {
      return "1 rok";
    } else if (ageYears < 5) {
      return `${ageYears} lata`;
    } else {
      return `${ageYears} lat`;
    }
  };

  // Get last visit date for a pet
  const getLastVisit = (petId: number): string => {
    const petAppointments = allAppointments
      .filter((apt: Appointment) => apt.pet_id === petId && apt.status === 'completed')
      .sort((a: Appointment, b: Appointment) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return petAppointments.length > 0 ? formatDate(petAppointments[0].scheduled_at) : 'Brak wizyt';
  };

  // Get next vaccination date for a pet
  const getNextVaccination = (petId: number): string => {
    const petVaccinations = allVaccinations
      .filter((vac: Vaccination) => vac.pet_id === petId)
      .sort((a: Vaccination, b: Vaccination) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

    return petVaccinations.length > 0 ? formatDate(petVaccinations[0].next_due_date) : 'Brak';
  };

  // Handle opening appointment details
  const handleViewAppointmentDetails = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
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

  if (petsLoading || appointmentsLoading || vaccinationsLoading) {
    return (
      <AppLayout role="client">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="client">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mój Portal</h1>
          <p className="text-muted-foreground">
            Witaj, {currentUser?.firstName || 'Użytkowniku'}
          </p>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* My Pets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Moje Zwierzęta</h2>
          </div>

          {myPets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Nie masz jeszcze żadnych zwierząt w systemie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myPets.map((pet: Pet) => {
                const SpeciesIcon = getSpeciesIcon(pet.species);
                return (
                  <Card
                    key={pet.id}
                    className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                          <SpeciesIcon className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl text-foreground mb-1">
                            {pet.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {pet.breed || pet.species} • {calculateAge(pet.date_of_birth)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Ostatnia wizyta</p>
                          <p className="font-semibold text-foreground text-sm">{getLastVisit(pet.id)}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Następne szczepienie</p>
                          <p className="font-semibold text-foreground text-sm">{getNextVaccination(pet.id)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/client/pets/${pet.id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Historia
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => navigate(`/client/appointments?petId=${pet.id}`)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Umów wizytę
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Nadchodzące Wizyty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 hover:shadow-md transition-all border border-border group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleViewAppointmentDetails(appointment.id)}>
                      <div className="text-center group-hover:scale-105 transition-transform">
                        <div className="text-xl font-bold text-primary">{formatTime(appointment.scheduled_at)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(appointment.scheduled_at)}</div>
                      </div>
                      <div className="h-12 w-1 bg-gradient-primary rounded-full" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{appointment.pet_name}</h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{appointment.reason || 'Wizyta'}</p>
                        <p className="text-xs text-muted-foreground">Lekarz: {appointment.doctor_name}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAppointmentDetails(appointment.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Zobacz
                    </Button>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRescheduleDialog(appointment);
                      }}
                      className="flex-1"
                    >
                      <CalendarClock className="h-4 w-4 mr-2" />
                      Zmień termin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCancelDialog(appointment);
                      }}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Anuluj
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Vaccination Calendar */}
        {vaccinationCalendar.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Kalendarz Szczepień
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vaccinationCalendar.map((vac: Vaccination) => (
                  <div
                    key={vac.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                        {vac.species?.toLowerCase().includes('pies') || vac.species?.toLowerCase().includes('dog') ? (
                          <Dog className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <Cat className="h-5 w-5 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{vac.pet_name} - {vac.vaccine_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Następne szczepienie: {formatDate(vac.next_due_date)}
                          {vac.status === 'overdue' && <span className="text-destructive ml-2">(Zaległe!)</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/client/appointments?petId=${vac.pet_id}&reason=Szczepienie - ${vac.vaccine_name}`)}
                    >
                      Umów
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
      />

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
    </AppLayout>
  );
};

export default ClientPortal;
