import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, PawPrint, Calendar, Syringe, Activity, Loader2 } from "lucide-react";
import { petsService, type Pet, type MedicalRecord } from "@/services/pets.service";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { vaccinationsService, type Vaccination } from "@/services/vaccinations.service";

export default function PetDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const petId = parseInt(id || '0');

  // Fetch pet details
  const { data: pet, isLoading: petLoading } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsService.getById(petId),
    enabled: !!petId,
  });

  // Fetch appointments for this pet
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', 'pet', petId],
    queryFn: () => appointmentsService.getAll({ petId, limit: 100 }),
    enabled: !!petId,
  });

  // Fetch vaccinations for this pet
  const { data: vaccinationsData, isLoading: vaccinationsLoading } = useQuery({
    queryKey: ['vaccinations', 'pet', petId],
    queryFn: () => vaccinationsService.getAll({ petId, limit: 100 }),
    enabled: !!petId,
  });

  const allAppointments = appointmentsData?.data || [];
  const vaccinations = vaccinationsData?.data || [];

  // Filter appointments for this specific pet
  const petAppointments = allAppointments.filter((apt: Appointment) => apt.pet_id === petId);

  // Get upcoming appointments
  const upcomingAppointments = petAppointments
    .filter((apt: Appointment) => !['completed', 'cancelled', 'cancelled_late'].includes(apt.status))
    .sort((a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Get medical history from completed appointments
  const medicalHistory: MedicalRecord[] = pet?.medical_history || [];

  // Helper: Calculate age from birth date
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

  // Helper: Format date to Polish locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL");
  };

  // Helper: Format time to Polish locale
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' });
  };

  const getVaccinationStatus = (status?: string) => {
    if (status === "current") return { label: "Aktualne", variant: "default" as const };
    if (status === "due_soon") return { label: "Wymaga odświeżenia", variant: "secondary" as const };
    if (status === "overdue") return { label: "Zaległe", variant: "destructive" as const };
    return { label: "Aktualne", variant: "default" as const };
  };

  if (petLoading || appointmentsLoading || vaccinationsLoading) {
    return (
      <AppLayout role="client">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!pet) {
    return (
      <AppLayout role="client">
        <div className="p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Nie znaleziono zwierzęcia</h2>
            <p className="text-muted-foreground mb-4">Zwierzę o podanym ID nie istnieje lub nie masz do niego dostępu.</p>
            <Button onClick={() => navigate('/client/pets')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do listy
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="client">
      <div className="p-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{pet.name}</h1>
            </div>
            <p className="text-muted-foreground">{pet.breed || pet.species} • {calculateAge(pet.date_of_birth)}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informacje podstawowe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gatunek:</span>
                <span className="font-medium">{pet.species}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rasa:</span>
                <span className="font-medium">{pet.breed || 'Nieznana'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data urodzenia:</span>
                <span className="font-medium">{pet.date_of_birth ? formatDate(pet.date_of_birth) : 'Brak danych'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Waga:</span>
                <span className="font-medium">{pet.weight ? `${pet.weight} kg` : 'Brak danych'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Microchip:</span>
                <span className="font-medium">{pet.microchip_number || 'Brak danych'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Następna wizyta</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatDate(upcomingAppointments[0].scheduled_at)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(upcomingAppointments[0].scheduled_at)} - {upcomingAppointments[0].reason || 'Wizyta'}
                  </div>
                  <div className="text-sm text-muted-foreground">{upcomingAppointments[0].doctor_name}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak zaplanowanych wizyt</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status szczepień</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vaccinations.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-primary" />
                    <span className="text-sm">{vaccinations.length} {vaccinations.length === 1 ? 'szczepienie' : 'szczepień'} w historii</span>
                  </div>
                  {vaccinations.some((v: Vaccination) => v.status === 'overdue') && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">Zaległe szczepienia</span>
                    </div>
                  )}
                  {vaccinations.some((v: Vaccination) => v.status === 'due_soon') && !vaccinations.some((v: Vaccination) => v.status === 'overdue') && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">Wymaga odświeżenia</span>
                    </div>
                  )}
                  {vaccinations.every((v: Vaccination) => v.status === 'current') && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">Wszystkie aktualne</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Brak szczepień w historii</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vaccinations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vaccinations">Historia szczepień</TabsTrigger>
            <TabsTrigger value="history">Historia medyczna</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {medicalHistory.length > 0 ? (
              medicalHistory.map((record: MedicalRecord) => (
                <Card key={record.appointment_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{formatDate(record.scheduled_at)}</span>
                          <Badge variant="outline">{record.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{record.doctor_name}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {record.diagnosis && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Rozpoznanie:</h4>
                        <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                      </div>
                    )}
                    {record.treatment && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Leczenie:</h4>
                        <p className="text-sm text-muted-foreground">{record.treatment}</p>
                      </div>
                    )}
                    {record.notes && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Notatki:</h4>
                        <p className="text-sm text-muted-foreground">{record.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak historii medycznej dla tego zwierzęcia.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vaccinations" className="space-y-4">
            {vaccinations.length > 0 ? (
              vaccinations.map((vacc: Vaccination) => {
                const statusInfo = getVaccinationStatus(vacc.status);
                return (
                  <Card key={vacc.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{vacc.vaccine_name}</CardTitle>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Data szczepienia:</span>
                          <span className="text-sm font-medium">{formatDate(vacc.vaccination_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Kolejne szczepienie:</span>
                          <span className="text-sm font-medium">{formatDate(vacc.next_due_date)}</span>
                        </div>
                      </div>
                      {vacc.batch_number && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Numer partii:</span>
                          <span className="text-sm font-medium">{vacc.batch_number}</span>
                        </div>
                      )}
                      {vacc.administered_by_name && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Podane przez:</span>
                          <span className="text-sm font-medium">{vacc.administered_by_name}</span>
                        </div>
                      )}
                      {vacc.notes && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Notatki:</h4>
                          <p className="text-sm text-muted-foreground">{vacc.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak szczepień w historii.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}