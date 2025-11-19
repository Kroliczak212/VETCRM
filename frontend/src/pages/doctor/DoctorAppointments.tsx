import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, PawPrint, FileText, CheckCircle, XCircle, Loader2, Search, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { medicalRecordsService, type CreateMedicalRecordData } from "@/services/medical-records.service";
import { petsService } from "@/services/pets.service";
import { authService } from "@/services/auth.service";

const DoctorAppointments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAppointmentDialog, setActiveAppointmentDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [medicalRecordData, setMedicalRecordData] = useState({
    diagnosis: "",
    treatment: "",
    prescription: "",
    notes: ""
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const currentUser = authService.getCurrentUser();
  const doctorId = currentUser?.id;

  // Fetch appointments for the logged-in doctor
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', 'doctor', doctorId, statusFilter],
    queryFn: () => appointmentsService.getAll({
      doctorId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    }),
    enabled: !!doctorId,
  });

  const allAppointments = appointmentsData?.data || [];

  // Filter appointments by search term and custom logic for "all" filter
  const appointments = allAppointments
    .filter(apt => {
      // Custom filtering for "all" - exclude pending/cancelled/completed by default
      if (statusFilter === 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aptDate = new Date(apt.scheduled_at);
        aptDate.setHours(0, 0, 0, 0);
        const isToday = aptDate.getTime() === today.getTime();

        // Show in_progress and confirmed always
        // Show completed only if from today
        if (apt.status === 'in_progress' || apt.status === 'confirmed') {
          return true;
        }
        if (apt.status === 'completed' && isToday) {
          return true;
        }
        // Hide proposed, cancelled, cancelled_late, and old completed
        return false;
      }
      return true;
    })
    .filter(apt => {
      // Search filter
      if (!searchTerm) return true;

      const search = searchTerm.toLowerCase();
      const petName = apt.pet_name?.toLowerCase() || '';
      const clientName = apt.client_name?.toLowerCase() || '';
      const date = formatDate(apt.scheduled_at).toLowerCase();
      const reason = apt.reason?.toLowerCase() || '';

      return petName.includes(search) ||
             clientName.includes(search) ||
             date.includes(search) ||
             reason.includes(search);
    })
    .sort((a, b) => {
      // Sort by status priority first
      const statusPriority: Record<string, number> = {
        'in_progress': 0,
        'confirmed': 1,
        'proposed': 2,
        'completed': 3,
        'cancelled': 4,
        'cancelled_late': 4
      };

      const priorityA = statusPriority[a.status] ?? 999;
      const priorityB = statusPriority[b.status] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then sort by scheduled date (earlier first)
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

  // Fetch pet details when dialog is open
  const { data: petData } = useQuery({
    queryKey: ['pet', selectedAppointment?.pet_id],
    queryFn: () => petsService.getById(selectedAppointment!.pet_id),
    enabled: !!selectedAppointment?.pet_id,
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Appointment['status'] }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] });
      toast({
        title: "Sukces",
        description: "Status wizyty został zaktualizowany",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować statusu",
        variant: "destructive",
      });
    },
  });

  // Save medical record mutation
  const saveMedicalRecordMutation = useMutation({
    mutationFn: async (data: CreateMedicalRecordData) => {
      const result = await medicalRecordsService.create(data);
      // Upload files if any
      if (uploadedFiles.length > 0 && result.medicalRecord) {
        for (const file of uploadedFiles) {
          await medicalRecordsService.uploadFile(result.medicalRecord.id, file);
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] });
      toast({
        title: "Sukces",
        description: "Dokumentacja medyczna została zapisana",
      });
      // Reset form
      setMedicalRecordData({ diagnosis: "", treatment: "", prescription: "", notes: "" });
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zapisać dokumentacji",
        variant: "destructive",
      });
    },
  });

  // Auto-update past appointments that weren't started or completed
  useEffect(() => {
    if (!allAppointments || allAppointments.length === 0) return;

    const now = new Date();
    const appointmentsToUpdate: Appointment[] = [];

    allAppointments.forEach((appointment) => {
      const scheduledDate = new Date(appointment.scheduled_at);
      const isPast = scheduledDate < now;
      const isNotStarted = appointment.status === 'confirmed' || appointment.status === 'proposed';

      if (isPast && isNotStarted) {
        appointmentsToUpdate.push(appointment);
      }
    });

    // Update appointments if any found
    if (appointmentsToUpdate.length > 0) {
      appointmentsToUpdate.forEach((appointment) => {
        updateStatusMutation.mutate(
          { id: appointment.id, status: 'cancelled' },
          {
            onSuccess: () => {
              // Silent update - don't show toast for auto-updates
            },
            onError: () => {
              // Silent error handling for auto-updates
            },
          }
        );
      });
    }
  }, [allAppointments]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      proposed: { label: "Zaproponowana", className: "bg-yellow-500/20 text-yellow-700", icon: Calendar },
      confirmed: { label: "Potwierdzona", className: "bg-primary/20 text-primary", icon: Calendar },
      in_progress: { label: "W trakcie", className: "bg-accent/20 text-accent", icon: Clock },
      completed: { label: "Zakończona", className: "bg-secondary/20 text-secondary", icon: CheckCircle },
      cancelled: { label: "Odwołana", className: "bg-destructive/20 text-destructive", icon: XCircle },
      cancelled_late: { label: "Odwołana (późno)", className: "bg-orange-500/20 text-orange-700", icon: XCircle }
    };
    const variant = variants[status] || variants.confirmed;
    const Icon = variant.icon;
    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const handleStartAppointment = (appointment: Appointment) => {
    // Change status to in_progress and open dialog
    setSelectedAppointment(appointment);
    updateStatusMutation.mutate(
      { id: appointment.id, status: 'in_progress' },
      {
        onSuccess: () => {
          setActiveAppointmentDialog(true);
        }
      }
    );
  };

  const handleCompleteAppointment = async () => {
    if (!selectedAppointment) return;

    // Save medical record if there's any data
    if (medicalRecordData.diagnosis || medicalRecordData.treatment || medicalRecordData.notes || medicalRecordData.prescription) {
      await saveMedicalRecordMutation.mutateAsync({
        appointmentId: selectedAppointment.id,
        ...medicalRecordData
      });
    }

    // Change status to completed
    updateStatusMutation.mutate(
      { id: selectedAppointment.id, status: 'completed' },
      {
        onSuccess: () => {
          setActiveAppointmentDialog(false);
          setSelectedAppointment(null);
          setMedicalRecordData({ diagnosis: "", treatment: "", prescription: "", notes: "" });
          setUploadedFiles([]);
        }
      }
    );
  };

  const handleSaveMedicalRecord = () => {
    if (!selectedAppointment) return;
    saveMedicalRecordMutation.mutate({
      appointmentId: selectedAppointment.id,
      ...medicalRecordData
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL");
  };

  if (isLoading) {
    return (
      <AppLayout role="doctor">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="doctor">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Moje Wizyty</h1>
            <p className="text-muted-foreground">Harmonogram i zarządzanie wizytami</p>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {appointments.filter(a => a.status === "confirmed" || a.status === "proposed").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Zaplanowane</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {appointments.filter(a => a.status === "in_progress").length}
                  </p>
                  <p className="text-sm text-muted-foreground">W trakcie</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-secondary mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {appointments.filter(a => a.status === "completed").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Zakończone</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {appointments.filter(a => a.status === "cancelled" || a.status === "cancelled_late").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Odwołane</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="proposed">Zaproponowane</SelectItem>
                    <SelectItem value="confirmed">Potwierdzone</SelectItem>
                    <SelectItem value="in_progress">W trakcie</SelectItem>
                    <SelectItem value="completed">Zakończone</SelectItem>
                    <SelectItem value="cancelled">Odwołane</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj po imieniu zwierzaka, właścicielu, dacie lub powodzie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments Timeline */}
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    Brak wizyt do wyświetlenia
                  </p>
                </CardContent>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Time */}
                      <div className="flex lg:flex-col items-center lg:items-start gap-2 lg:w-32">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{formatTime(appointment.scheduled_at)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(appointment.scheduled_at)}</p>
                          <p className="text-xs text-muted-foreground">{appointment.duration_minutes} min</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg text-foreground">{appointment.reason || "Wizyta"}</h3>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium text-foreground">{appointment.client_name}</span>
                                <span>• {appointment.client_phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <PawPrint className="h-4 w-4" />
                                <span>
                                  {appointment.pet_name} ({appointment.species}
                                  {appointment.breed ? `, ${appointment.breed}` : ""})
                                </span>
                              </div>
                              {appointment.location && (
                                <div className="flex items-center gap-2 mt-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="italic">{appointment.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {(appointment.status === "confirmed" || appointment.status === "proposed") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setPreviewDialog(true);
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Zobacz szczegóły
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStartAppointment(appointment)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Rozpocznij wizytę
                              </Button>
                            </>
                          )}
                          {appointment.status === "in_progress" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setActiveAppointmentDialog(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Kontynuuj wizytę
                            </Button>
                          )}
                          {appointment.status === "completed" && (
                            <Button variant="outline" size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Zobacz historię
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Active Appointment Dialog */}
        <Dialog open={activeAppointmentDialog} onOpenChange={setActiveAppointmentDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Wizyta - {selectedAppointment?.pet_name}</DialogTitle>
              <DialogDescription>
                {selectedAppointment && new Date(selectedAppointment.scheduled_at).toLocaleDateString("pl-PL", {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} o {selectedAppointment && formatTime(selectedAppointment.scheduled_at)}
              </DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              <Tabs defaultValue="patient" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="patient">Pacjent</TabsTrigger>
                  <TabsTrigger value="history">Historia medyczna</TabsTrigger>
                  <TabsTrigger value="documentation">Dokumentacja</TabsTrigger>
                </TabsList>

                {/* Patient Info Tab */}
                <TabsContent value="patient" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Imię zwierzaka</Label>
                      <p className="text-lg font-medium">{selectedAppointment.pet_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Gatunek</Label>
                      <p className="text-lg font-medium">
                        {selectedAppointment.species}
                        {selectedAppointment.breed && ` - ${selectedAppointment.breed}`}
                      </p>
                    </div>
                    {petData && (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Data urodzenia</Label>
                          <p className="text-lg font-medium">
                            {petData.date_of_birth
                              ? new Date(petData.date_of_birth).toLocaleDateString("pl-PL")
                              : "Brak danych"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Waga</Label>
                          <p className="text-lg font-medium">
                            {petData.weight ? `${petData.weight} kg` : "Brak danych"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Numer chip</Label>
                          <p className="text-lg font-medium">
                            {petData.microchip_number || "Brak danych"}
                          </p>
                        </div>
                        {petData.notes && (
                          <div className="col-span-2">
                            <Label className="text-muted-foreground">Notatki</Label>
                            <p className="text-base">{petData.notes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Właściciel</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{selectedAppointment.client_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{selectedAppointment.client_phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Powód wizyty</Label>
                    <p className="text-base mt-2">{selectedAppointment.reason_name || selectedAppointment.reason || "Nie podano"}</p>
                  </div>
                </TabsContent>

                {/* Medical History Tab */}
                <TabsContent value="history" className="space-y-4">
                  {petData?.medical_history && petData.medical_history.length > 0 ? (
                    petData.medical_history.map((record: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {new Date(record.scheduled_at).toLocaleDateString("pl-PL")}
                                </span>
                              </div>
                              <Badge>{record.status}</Badge>
                            </div>
                            {record.diagnosis && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Rozpoznanie:</Label>
                                <p className="text-sm mt-1">{record.diagnosis}</p>
                              </div>
                            )}
                            {record.treatment && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Leczenie:</Label>
                                <p className="text-sm mt-1">{record.treatment}</p>
                              </div>
                            )}
                            {record.notes && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Notatki:</Label>
                                <p className="text-sm mt-1">{record.notes}</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Lekarz: {record.doctor_name}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Brak historii medycznej
                    </div>
                  )}
                </TabsContent>

                {/* Documentation Tab */}
                <TabsContent value="documentation" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="diagnosis">Rozpoznanie</Label>
                      <Textarea
                        id="diagnosis"
                        placeholder="Wpisz rozpoznanie..."
                        value={medicalRecordData.diagnosis}
                        onChange={(e) => setMedicalRecordData({ ...medicalRecordData, diagnosis: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="treatment">Leczenie</Label>
                      <Textarea
                        id="treatment"
                        placeholder="Wpisz plan leczenia..."
                        value={medicalRecordData.treatment}
                        onChange={(e) => setMedicalRecordData({ ...medicalRecordData, treatment: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="prescription">Recepta</Label>
                      <Textarea
                        id="prescription"
                        placeholder="Wpisz receptę..."
                        value={medicalRecordData.prescription}
                        onChange={(e) => setMedicalRecordData({ ...medicalRecordData, prescription: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notatki</Label>
                      <Textarea
                        id="notes"
                        placeholder="Dodatkowe notatki..."
                        value={medicalRecordData.notes}
                        onChange={(e) => setMedicalRecordData({ ...medicalRecordData, notes: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Pliki</Label>
                      <div className="mt-2">
                        <Input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="cursor-pointer"
                        />
                        {uploadedFiles.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploadedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Upload className="h-4 w-4" />
                                <span>{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={handleSaveMedicalRecord}
                        disabled={saveMedicalRecordMutation.isPending}
                      >
                        {saveMedicalRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Zapisz dokumentację
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveAppointmentDialog(false);
                  setSelectedAppointment(null);
                }}
              >
                Zamknij
              </Button>
              <Button
                onClick={handleCompleteAppointment}
                disabled={updateStatusMutation.isPending || saveMedicalRecordMutation.isPending}
              >
                {(updateStatusMutation.isPending || saveMedicalRecordMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <CheckCircle className="mr-2 h-4 w-4" />
                Zakończ wizytę
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog (before starting appointment) */}
        <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Szczegóły wizyty</DialogTitle>
              <DialogDescription>
                {selectedAppointment && new Date(selectedAppointment.scheduled_at).toLocaleDateString("pl-PL", {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} o {selectedAppointment && formatTime(selectedAppointment.scheduled_at)}
              </DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Pacjent</Label>
                    <p className="text-lg font-medium">{selectedAppointment.pet_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gatunek</Label>
                    <p className="text-lg font-medium">
                      {selectedAppointment.species}
                      {selectedAppointment.breed && ` - ${selectedAppointment.breed}`}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Właściciel</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedAppointment.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{selectedAppointment.client_phone}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Powód wizyty</Label>
                  <p className="text-lg font-medium mt-2">{selectedAppointment.reason_name || selectedAppointment.reason || "Nie podano"}</p>
                </div>

                {selectedAppointment.location && (
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Lokalizacja</Label>
                    <p className="text-base mt-2">{selectedAppointment.location}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Czas trwania</Label>
                  <p className="text-base mt-2">{selectedAppointment.duration_minutes} minut</p>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-2">{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewDialog(false);
                  setSelectedAppointment(null);
                }}
              >
                Zamknij
              </Button>
              {selectedAppointment && (selectedAppointment.status === "confirmed" || selectedAppointment.status === "proposed") && (
                <Button
                  onClick={() => {
                    setPreviewDialog(false);
                    handleStartAppointment(selectedAppointment);
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Rozpocznij wizytę
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
};

export default DoctorAppointments;
