import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, PawPrint, User, Phone, Calendar, Activity, Loader2, Syringe, ChevronDown, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { petsService } from "@/services/pets.service";
import { appointmentsService } from "@/services/appointments.service";
import { medicalRecordsService, type CreateMedicalRecordData } from "@/services/medical-records.service";
import { clientsService } from "@/services/clients.service";
import { vaccinationsService, type CreateVaccinationData, type Vaccination } from "@/services/vaccinations.service";
import { authService } from "@/services/auth.service";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [isVaccinationDialogOpen, setIsVaccinationDialogOpen] = useState(false);

  // Fetch pet data
  const { data: patient, isLoading: petLoading } = useQuery({
    queryKey: ['pet', id],
    queryFn: () => petsService.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch owner data
  const { data: owner } = useQuery({
    queryKey: ['client', patient?.owner_user_id],
    queryFn: () => clientsService.getById(patient!.owner_user_id),
    enabled: !!patient?.owner_user_id,
  });

  // Fetch appointments for this pet (which contain medical records)
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', 'pet', id],
    queryFn: () => appointmentsService.getAll({ petId: Number(id), limit: 100 }),
    enabled: !!id,
  });

  const appointments = appointmentsData?.data || [];

  // Fetch vaccinations for this pet
  const { data: vaccinationsData } = useQuery({
    queryKey: ['vaccinations', 'pet', id],
    queryFn: () => vaccinationsService.getAll({ petId: Number(id), limit: 100 }),
    enabled: !!id,
  });

  const vaccinations = vaccinationsData?.data || [];

  // Filter upcoming confirmed appointments
  const upcomingAppointments = appointments
    .filter(apt => {
      const isConfirmed = apt.status === 'confirmed';
      const isFuture = new Date(apt.scheduled_at) > new Date();
      return isConfirmed && isFuture;
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Filter completed appointments (medical history)
  const completedAppointments = appointments
    .filter(apt => apt.status === 'completed')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const [newRecord, setNewRecord] = useState({
    appointmentId: 0,
    diagnosis: "",
    treatment: "",
    notes: "",
  });

  const [newVaccination, setNewVaccination] = useState({
    vaccineName: "",
    vaccinationDate: new Date().toISOString().split('T')[0],
    nextDueDate: "",
    batchNumber: "",
    appointmentId: 0,
    notes: "",
  });

  // Create medical record mutation
  const createRecordMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordData) => medicalRecordsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'pet', id] });
      toast({
        title: "Wpis dodany",
        description: "Nowy wpis w historii medycznej został zapisany.",
      });
      setIsRecordDialogOpen(false);
      setNewRecord({ appointmentId: 0, diagnosis: "", treatment: "", notes: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać wpisu",
        variant: "destructive",
      });
    },
  });

  const handleAddRecord = () => {
    if (!newRecord.appointmentId || !newRecord.diagnosis || !newRecord.treatment) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    createRecordMutation.mutate(newRecord);
  };

  // Create vaccination mutation
  const createVaccinationMutation = useMutation({
    mutationFn: (data: CreateVaccinationData) => vaccinationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'pet', id] });
      toast({
        title: "Szczepienie dodane",
        description: "Nowe szczepienie zostało zapisane w systemie.",
      });
      setIsVaccinationDialogOpen(false);
      setNewVaccination({
        vaccineName: "",
        vaccinationDate: new Date().toISOString().split('T')[0],
        nextDueDate: "",
        batchNumber: "",
        appointmentId: 0,
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać szczepienia",
        variant: "destructive",
      });
    },
  });

  const handleAddVaccination = () => {
    if (!newVaccination.vaccineName || !newVaccination.vaccinationDate) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola (nazwa szczepionki i data)",
        variant: "destructive",
      });
      return;
    }

    const vaccinationData: CreateVaccinationData = {
      petId: Number(id),
      vaccineName: newVaccination.vaccineName,
      vaccinationDate: newVaccination.vaccinationDate,
      nextDueDate: newVaccination.nextDueDate || undefined,
      batchNumber: newVaccination.batchNumber || undefined,
      appointmentId: newVaccination.appointmentId || undefined,
      notes: newVaccination.notes || undefined,
    };

    createVaccinationMutation.mutate(vaccinationData);
  };

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return "Nieznany wiek";
    const birth = new Date(birthDate);
    const now = new Date();
    const ageYears = now.getFullYear() - birth.getFullYear();

    if (ageYears === 0) {
      const ageMonths = now.getMonth() - birth.getMonth();
      return `${ageMonths} ${ageMonths === 1 ? 'miesiąc' : 'miesięcy'}`;
    } else if (ageYears === 1) {
      return "1 rok";
    } else if (ageYears < 5) {
      return `${ageYears} lata`;
    } else {
      return `${ageYears} lat`;
    }
  };

  const getVaccinationStatus = (status?: string) => {
    if (status === "current") return { label: "Aktualne", variant: "default" as const };
    if (status === "due_soon") return { label: "Wymaga odświeżenia", variant: "secondary" as const };
    if (status === "overdue") return { label: "Zaległe", variant: "destructive" as const };
    return { label: "Aktualne", variant: "default" as const };
  };

  if (petLoading) {
    return (
      <AppLayout role="doctor">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout role="doctor">
        <div className="p-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">Nie znaleziono pacjenta</h3>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Find completed appointments without medical records for the dropdown
  // Only allow doctor to add records to their own appointments
  const currentUser = authService.getCurrentUser();
  const completedAppointmentsWithoutRecords = completedAppointments.filter(apt =>
    !apt.medical_record && apt.doctor_user_id === currentUser?.id
  );

  return (
    <AppLayout role="doctor">
      <div className="p-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PawPrint className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{patient.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {patient.breed || patient.species} • {calculateAge(patient.date_of_birth)}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isVaccinationDialogOpen} onOpenChange={setIsVaccinationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Syringe className="mr-2 h-4 w-4" />
                  Dodaj szczepienie
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Dodaj szczepienie</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nazwa szczepionki *</Label>
                    <Input
                      value={newVaccination.vaccineName}
                      onChange={(e) => setNewVaccination({ ...newVaccination, vaccineName: e.target.value })}
                      placeholder="np. Wścieklizna, DHPP, FeLV..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data szczepienia *</Label>
                      <Input
                        type="date"
                        value={newVaccination.vaccinationDate}
                        onChange={(e) => setNewVaccination({ ...newVaccination, vaccinationDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Następne szczepienie</Label>
                      <Input
                        type="date"
                        value={newVaccination.nextDueDate}
                        onChange={(e) => setNewVaccination({ ...newVaccination, nextDueDate: e.target.value })}
                        placeholder="Opcjonalne - domyślnie +1 rok"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Numer partii</Label>
                    <Input
                      value={newVaccination.batchNumber}
                      onChange={(e) => setNewVaccination({ ...newVaccination, batchNumber: e.target.value })}
                      placeholder="Opcjonalne"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Powiązana wizyta (opcjonalne)</Label>
                    <Select
                      value={newVaccination.appointmentId.toString()}
                      onValueChange={(value) => setNewVaccination({ ...newVaccination, appointmentId: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Brak powiązania" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Brak powiązania</SelectItem>
                        {appointments
                          .filter(apt => apt.status === 'completed')
                          .map((apt) => (
                            <SelectItem key={apt.id} value={apt.id.toString()}>
                              {new Date(apt.scheduled_at).toLocaleDateString("pl-PL")} - {apt.reason || "Wizyta"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notatki</Label>
                    <Textarea
                      value={newVaccination.notes}
                      onChange={(e) => setNewVaccination({ ...newVaccination, notes: e.target.value })}
                      placeholder="Dodatkowe uwagi..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsVaccinationDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleAddVaccination} disabled={createVaccinationMutation.isPending}>
                    {createVaccinationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj szczepienie
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={completedAppointmentsWithoutRecords.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy wpis medyczny
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Dodaj wpis do historii medycznej</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Wizyta *</Label>
                    <Select
                      value={newRecord.appointmentId.toString()}
                      onValueChange={(value) => setNewRecord({ ...newRecord, appointmentId: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz wizytę" />
                      </SelectTrigger>
                      <SelectContent>
                        {completedAppointmentsWithoutRecords.map((apt) => (
                          <SelectItem key={apt.id} value={apt.id.toString()}>
                            {new Date(apt.scheduled_at).toLocaleDateString("pl-PL")} - {apt.reason_name || apt.reason || "Wizyta"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rozpoznanie *</Label>
                    <Textarea
                      value={newRecord.diagnosis}
                      onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                      placeholder="Opisz rozpoznanie i objawy..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zastosowane leczenie *</Label>
                    <Textarea
                      value={newRecord.treatment}
                      onChange={(e) => setNewRecord({ ...newRecord, treatment: e.target.value })}
                      placeholder="Opisz przeprowadzone leczenie..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dodatkowe uwagi</Label>
                    <Textarea
                      value={newRecord.notes}
                      onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                      placeholder="Inne istotne informacje..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleAddRecord} disabled={createRecordMutation.isPending}>
                    {createRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz wpis
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                <span className="font-medium">{patient.species}</span>
              </div>
              {patient.breed && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rasa:</span>
                  <span className="font-medium">{patient.breed}</span>
                </div>
              )}
              {patient.date_of_birth && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data urodzenia:</span>
                  <span className="font-medium">{new Date(patient.date_of_birth).toLocaleDateString("pl-PL")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Płeć:</span>
                <span className="font-medium">
                  {patient.sex === 'male' ? 'Samiec' : patient.sex === 'female' ? 'Samica' : 'Nieznana'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Właściciel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {owner ? `${owner.first_name} ${owner.last_name}` : (patient.owner_name || "Ładowanie...")}
                </span>
              </div>
              {owner && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{owner.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {completedAppointments.some(apt => apt.medical_record) ? "Ma historię medyczną" : "Brak historii medycznej"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{appointments.length} wizyt w systemie</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appointments">Wizyty ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="history">Historia medyczna ({completedAppointments.length})</TabsTrigger>
            <TabsTrigger value="vaccinations">Szczepienia ({vaccinations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak zaplanowanych wizyt
                  </p>
                </CardContent>
              </Card>
            ) : (
              upcomingAppointments.map((appointment) => (
                <Collapsible key={appointment.id}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <div className="font-semibold">
                                {new Date(appointment.scheduled_at).toLocaleDateString("pl-PL")} • {new Date(appointment.scheduled_at).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {appointment.reason_name || appointment.reason || "Wizyta"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Potwierdzona</Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Lekarz</span>
                            <p className="text-sm mt-1">{appointment.doctor_name}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Czas trwania</span>
                            <p className="text-sm mt-1">{appointment.duration_minutes} minut</p>
                          </div>
                          {appointment.location && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Lokalizacja</span>
                              <p className="text-sm mt-1">{appointment.location}</p>
                            </div>
                          )}
                          {appointment.vaccination_type_name && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Typ szczepienia</span>
                              <p className="text-sm mt-1">{appointment.vaccination_type_name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {completedAppointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak zakończonych wizyt
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedAppointments.map((appointment) => (
                <Collapsible key={appointment.id}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-green-600" />
                            <div className="text-left">
                              <div className="font-semibold">
                                {new Date(appointment.scheduled_at).toLocaleDateString("pl-PL")} • {new Date(appointment.scheduled_at).toLocaleTimeString("pl-PL", { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {appointment.reason_name || appointment.reason || "Wizyta"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600">Zakończona</Badge>
                            {appointment.medical_record && (
                              <Badge variant="outline" className="text-xs">Ma dokumentację</Badge>
                            )}
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Lekarz</span>
                            <p className="text-sm mt-1">{appointment.doctor_name}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Czas trwania</span>
                            <p className="text-sm mt-1">{appointment.duration_minutes} minut</p>
                          </div>
                          {appointment.location && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Lokalizacja</span>
                              <p className="text-sm mt-1">{appointment.location}</p>
                            </div>
                          )}
                          {appointment.vaccination_type_name && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Typ szczepienia</span>
                              <p className="text-sm mt-1">{appointment.vaccination_type_name}</p>
                            </div>
                          )}
                        </div>

                        {appointment.medical_record ? (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Rozpoznanie</h4>
                              <p className="text-sm text-muted-foreground">{appointment.medical_record.diagnosis}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Leczenie</h4>
                              <p className="text-sm text-muted-foreground">{appointment.medical_record.treatment}</p>
                            </div>
                            {appointment.medical_record.notes && (
                              <div>
                                <h4 className="text-sm font-semibold mb-1">Notatki</h4>
                                <p className="text-sm text-muted-foreground">{appointment.medical_record.notes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground italic">
                              Brak dokumentacji medycznej. Kliknij "Nowy wpis medyczny" u góry strony, aby dodać rozpoznanie i leczenie.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </TabsContent>

          <TabsContent value="vaccinations" className="space-y-3">
            {vaccinations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak szczepień w historii
                  </p>
                </CardContent>
              </Card>
            ) : (
              vaccinations.map((vaccination: Vaccination) => {
                const statusInfo = getVaccinationStatus(vaccination.status);
                return (
                  <Collapsible key={vaccination.id}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Syringe className="h-5 w-5 text-blue-600" />
                              <div className="text-left">
                                <div className="font-semibold">{vaccination.vaccine_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(vaccination.vaccination_date).toLocaleDateString("pl-PL")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Data szczepienia</span>
                              <p className="text-sm mt-1">
                                {new Date(vaccination.vaccination_date).toLocaleDateString("pl-PL")}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Kolejne szczepienie</span>
                              <p className="text-sm mt-1">
                                {new Date(vaccination.next_due_date).toLocaleDateString("pl-PL")}
                              </p>
                            </div>
                            {vaccination.vaccination_type_name && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Typ szczepienia</span>
                                <p className="text-sm mt-1">{vaccination.vaccination_type_name}</p>
                              </div>
                            )}
                            {vaccination.batch_number && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Numer partii</span>
                                <p className="text-sm mt-1">{vaccination.batch_number}</p>
                              </div>
                            )}
                            {vaccination.administered_by_name && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Podane przez</span>
                                <p className="text-sm mt-1">{vaccination.administered_by_name}</p>
                              </div>
                            )}
                            {vaccination.added_by_name && (
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Dodane przez</span>
                                <p className="text-sm mt-1">{vaccination.added_by_name} ({vaccination.added_by_role})</p>
                              </div>
                            )}
                          </div>
                          {vaccination.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="text-sm font-semibold mb-1">Notatki</h4>
                              <p className="text-sm text-muted-foreground">{vaccination.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
