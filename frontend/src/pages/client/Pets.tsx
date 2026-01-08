import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Cat, Calendar, FileText, Syringe, Heart, Loader2, Eye, X, CalendarClock, FileDown, Plus, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { petsService, type Pet } from "@/services/pets.service";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { vaccinationsService, type Vaccination } from "@/services/vaccinations.service";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import { CancelAppointmentDialog } from "@/components/CancelAppointmentDialog";
import { RescheduleAppointmentDialog } from "@/components/RescheduleAppointmentDialog";
import { GenerateDocumentationDialog } from "@/components/GenerateDocumentationDialog";
import { PetFormDialog } from "@/components/PetFormDialog";

const Pets = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [vaccinationHistoryDialogOpen, setVaccinationHistoryDialogOpen] = useState(false);
  const [selectedPetForVaccinations, setSelectedPetForVaccinations] = useState<Pet | null>(null);
  const [documentationDialogOpen, setDocumentationDialogOpen] = useState(false);
  const [selectedPetForDocumentation, setSelectedPetForDocumentation] = useState<Pet | null>(null);

  // Pet form dialog (add/edit)
  const [isPetFormOpen, setIsPetFormOpen] = useState(false);
  const [petToEdit, setPetToEdit] = useState<Pet | null>(null);

  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);

  const { data: petsData, isLoading: petsLoading } = useQuery({
    queryKey: ['pets', 'my'],
    queryFn: () => petsService.getAll({ limit: 100 }),
  });

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointmentsService.getAll({ limit: 100 }),
  });

  const { data: vaccinationsData, isLoading: vaccinationsLoading } = useQuery({
    queryKey: ['vaccinations', 'my'],
    queryFn: () => vaccinationsService.getAll({ limit: 100 }),
  });

  const pets = petsData?.data || [];
  const allAppointments = appointmentsData?.data || [];
  const allVaccinations = vaccinationsData?.data || [];

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

  const getPetVaccinations = (petId: number): Vaccination[] => {
    return allVaccinations
      .filter((vac: Vaccination) => vac.pet_id === petId)
      .sort((a: Vaccination, b: Vaccination) => new Date(b.vaccination_date).getTime() - new Date(a.vaccination_date).getTime());
  };

  const getUpcomingVisits = (petId: number): Appointment[] => {
    return allAppointments
      .filter((apt: Appointment) =>
        apt.pet_id === petId &&
        !['completed', 'cancelled', 'cancelled_late'].includes(apt.status)
      )
      .sort((a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  };

  const getLastVisit = (petId: number): string => {
    const petAppointments = allAppointments
      .filter((apt: Appointment) => apt.pet_id === petId && apt.status === 'completed')
      .sort((a: Appointment, b: Appointment) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return petAppointments.length > 0 ? formatDate(petAppointments[0].scheduled_at) : 'Brak wizyt';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL");
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' });
  };

  const getVaccinationStatus = (status?: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      current: { label: "Aktualne", className: "bg-secondary/20 text-secondary" },
      due_soon: { label: "Wymaga odświeżenia", className: "bg-accent/20 text-accent" },
      overdue: { label: "Zaległe", className: "bg-destructive/20 text-destructive" }
    };
    const variant = variants[status || 'current'] || variants.current;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const getSpeciesIcon = (species: string) => {
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('pies') || speciesLower.includes('dog')) return Dog;
    if (speciesLower.includes('kot') || speciesLower.includes('cat')) return Cat;
    return Dog;
  };

  const handleViewHistory = (petId: number) => {
    navigate(`/client/appointments?petId=${petId}`);
  };

  const handleHealthStatus = (pet: any) => {
    setSelectedPet(pet);
    setHealthDialogOpen(true);
  };

  const handleBookAppointment = (petId: number) => {
    navigate(`/client/appointments?petId=${petId}`);
  };

  const handleCalendarClick = (petId: number) => {
    toast({
      title: "Szczegóły wizyty",
      description: "Przekierowywanie do kalendarza wizyt...",
    });
    setTimeout(() => {
      navigate(`/client/appointments`);
    }, 500);
  };

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

  // Handle vaccination history dialog
  const handleOpenVaccinationHistory = (pet: Pet) => {
    setSelectedPetForVaccinations(pet);
    setVaccinationHistoryDialogOpen(true);
  };

  const handleCloseVaccinationHistory = () => {
    setVaccinationHistoryDialogOpen(false);
    setSelectedPetForVaccinations(null);
  };

  // Handle documentation dialog
  const handleOpenDocumentationDialog = (pet: Pet) => {
    setSelectedPetForDocumentation(pet);
    setDocumentationDialogOpen(true);
  };

  const handleCloseDocumentationDialog = () => {
    setDocumentationDialogOpen(false);
    setSelectedPetForDocumentation(null);
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Moje Zwierzęta</h1>
            <p className="text-muted-foreground">Pełna dokumentacja zdrowia Twoich pupili</p>
          </div>
          <Button
            onClick={() => {
              setPetToEdit(null);
              setIsPetFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj zwierzę
          </Button>
        </div>
      </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {pets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Nie masz jeszcze żadnych zwierząt w systemie.
                </p>
              </CardContent>
            </Card>
          ) : (
            pets.map((pet: Pet) => {
              const SpeciesIcon = getSpeciesIcon(pet.species);
              const petVaccinations = getPetVaccinations(pet.id);
              const upcomingVisits = getUpcomingVisits(pet.id);

              return (
                <Card key={pet.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                          <SpeciesIcon className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl text-foreground mb-2">
                            {pet.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {pet.species} • {pet.breed || 'Nieznana rasa'} • {calculateAge(pet.date_of_birth)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPetToEdit(pet);
                          setIsPetFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edytuj
                      </Button>
                    </div>
                  </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Waga</p>
                      <p className="font-bold text-foreground">{pet.weight ? `${pet.weight} kg` : 'Brak danych'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Data urodzenia</p>
                      <p className="font-bold text-foreground">{pet.date_of_birth ? formatDate(pet.date_of_birth) : 'Brak danych'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Nr chip</p>
                      <p className="font-bold text-foreground text-xs">{pet.microchip_number || 'Brak danych'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Ostatnia wizyta</p>
                      <p className="font-bold text-foreground">{getLastVisit(pet.id)}</p>
                    </div>
                  </div>

                  {petVaccinations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Syringe className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Szczepienia</h3>
                      </div>
                      <div className="space-y-3">
                        {petVaccinations.map((vac: Vaccination) => (
                          <div key={vac.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">{vac.vaccine_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Ostatnie: {formatDate(vac.vaccination_date)}
                                </p>
                              </div>
                              {getVaccinationStatus(vac.status)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Następne szczepienie</span>
                                <span className="font-medium">{formatDate(vac.next_due_date)}</span>
                              </div>
                              <Progress
                                value={vac.status === "current" ? 100 : vac.status === "due_soon" ? 75 : 30}
                                className="h-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {upcomingVisits.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Nadchodzące wizyty</h3>
                      </div>
                      <div className="space-y-2">
                        {upcomingVisits.map((visit: Appointment) => (
                          <div
                            key={visit.id}
                            className="bg-primary/5 rounded-lg p-3 border border-primary/20 hover:bg-primary/10 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => handleViewAppointmentDetails(visit.id)}>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{visit.reason || 'Wizyta'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(visit.scheduled_at)} {formatTime(visit.scheduled_at)} • {visit.doctor_name}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAppointmentDetails(visit.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Zobacz
                              </Button>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-primary/20">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRescheduleDialog(visit);
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
                                  handleOpenCancelDialog(visit);
                                }}
                                className="flex-1 text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Anuluj
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewHistory(pet.id)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Historia wizyt
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenVaccinationHistory(pet)}
                    >
                      <Syringe className="mr-2 h-4 w-4" />
                      Historia szczepień
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenDocumentationDialog(pet)}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Wygeneruj dokumentację
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleHealthStatus(pet)}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Stan zdrowia
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleBookAppointment(pet.id)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Umów wizytę
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>

        <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Stan zdrowia - {selectedPet?.name}</DialogTitle>
              <DialogDescription>
                Podstawowe informacje o zwierzęciu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gatunek:</span>
                  <span className="font-medium">{selectedPet?.species}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rasa:</span>
                  <span className="font-medium">{selectedPet?.breed || 'Nieznana'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wiek:</span>
                  <span className="font-medium">{selectedPet && calculateAge(selectedPet.date_of_birth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waga:</span>
                  <span className="font-medium">{selectedPet?.weight ? `${selectedPet.weight} kg` : 'Brak danych'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nr chip:</span>
                  <span className="font-medium">{selectedPet?.microchip_number || 'Brak danych'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ostatnia wizyta:</span>
                  <span className="font-medium">{selectedPet && getLastVisit(selectedPet.id)}</span>
                </div>
              </div>
              {selectedPet?.notes && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold mb-2">Notatki</h4>
                  <p className="text-sm text-muted-foreground">{selectedPet.notes}</p>
                </div>
              )}
            </div>
            <Button onClick={() => setHealthDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogContent>
        </Dialog>

        <AppointmentDetailsDialog
          appointmentId={selectedAppointmentId}
          isOpen={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
        />

        <CancelAppointmentDialog
          appointment={appointmentToCancel}
          isOpen={isCancelDialogOpen}
          onClose={handleCloseCancelDialog}
        />

        <RescheduleAppointmentDialog
          appointment={appointmentToReschedule}
          isOpen={isRescheduleDialogOpen}
          onClose={handleCloseRescheduleDialog}
        />

        <Dialog open={vaccinationHistoryDialogOpen} onOpenChange={setVaccinationHistoryDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historia szczepień - {selectedPetForVaccinations?.name}</DialogTitle>
              <DialogDescription>
                Kompletna historia szczepień dla {selectedPetForVaccinations?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPetForVaccinations && (() => {
                const petVaccinations = getPetVaccinations(selectedPetForVaccinations.id);

                if (petVaccinations.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      Brak szczepień dla tego zwierzęcia
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {petVaccinations.map((vac: Vaccination) => (
                      <div key={vac.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg text-foreground">
                                {vac.vaccination_type_name || vac.vaccine_name}
                              </h4>
                              {getVaccinationStatus(vac.status)}
                              {vac.source && (
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  {vac.source === 'appointment' ? 'Z wizyty' : 'Wpis ręczny'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Data szczepienia</p>
                            <p className="font-medium">{formatDate(vac.vaccination_date)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Następne szczepienie</p>
                            <p className="font-medium">{formatDate(vac.next_due_date)}</p>
                          </div>
                          {vac.batch_number && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Nr partii</p>
                              <p className="font-medium">{vac.batch_number}</p>
                            </div>
                          )}
                          {vac.administered_by_name && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Podane przez</p>
                              <p className="font-medium">{vac.administered_by_name}</p>
                            </div>
                          )}
                          {vac.added_by_name && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Dodane przez</p>
                              <p className="font-medium">
                                {vac.added_by_name}
                                {vac.added_by_role && (
                                  <span className="text-muted-foreground text-xs ml-1">
                                    ({vac.added_by_role === 'client' ? 'właściciel' :
                                      vac.added_by_role === 'doctor' ? 'lekarz' :
                                      vac.added_by_role === 'receptionist' ? 'recepcjonista' :
                                      vac.added_by_role})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {vac.recommended_interval_months && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Zalecany interwał</p>
                              <p className="font-medium">{vac.recommended_interval_months} miesięcy</p>
                            </div>
                          )}
                        </div>

                        {vac.notes && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-muted-foreground text-xs mb-1">Notatki</p>
                            <p className="text-sm">{vac.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseVaccinationHistory}>
                Zamknij
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <GenerateDocumentationDialog
          pet={selectedPetForDocumentation}
          isOpen={documentationDialogOpen}
          onClose={handleCloseDocumentationDialog}
        />

        <PetFormDialog
          isOpen={isPetFormOpen}
          onClose={() => {
            setIsPetFormOpen(false);
            setPetToEdit(null);
          }}
          pet={petToEdit}
        />
    </AppLayout>
  );
};

export default Pets;
