import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, PawPrint, FileText, CheckCircle, XCircle, Loader2, Search, Upload, Syringe, Download, Eye, File, Image } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { medicalRecordsService, type CreateMedicalRecordData } from "@/services/medical-records.service";
import { petsService } from "@/services/pets.service";
import { authService } from "@/services/auth.service";

const DoctorAppointments = () => {
  const navigate = useNavigate();
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
  const [vaccinationPerformed, setVaccinationPerformed] = useState<boolean | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");

  const currentUser = authService.getCurrentUser();
  const doctorId = currentUser?.id;

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

  const appointments = allAppointments
    .filter(apt => {
      if (statusFilter === 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aptDate = new Date(apt.scheduled_at);
        aptDate.setHours(0, 0, 0, 0);
        const isToday = aptDate.getTime() === today.getTime();

        if (apt.status === 'in_progress' || apt.status === 'confirmed') {
          return true;
        }
        if (apt.status === 'completed' && isToday) {
          return true;
        }
        return false;
      }
      return true;
    })
    .filter(apt => {
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

      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

  const { data: petData } = useQuery({
    queryKey: ['pet', selectedAppointment?.pet_id],
    queryFn: () => petsService.getById(selectedAppointment!.pet_id),
    enabled: !!selectedAppointment?.pet_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, vaccinationPerformed }: { id: number; status: Appointment['status']; vaccinationPerformed?: boolean }) =>
      appointmentsService.updateStatus(id, status, vaccinationPerformed),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] });
      if (selectedAppointment?.pet_id) {
        queryClient.invalidateQueries({ queryKey: ['vaccinations', 'pet', selectedAppointment.pet_id.toString()] });
        queryClient.invalidateQueries({ queryKey: ['appointments', 'pet', selectedAppointment.pet_id.toString()] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować statusu",
        variant: "destructive",
      });
    },
  });

  const saveMedicalRecordMutation = useMutation({
    mutationFn: async (data: CreateMedicalRecordData) => {
      const result = await medicalRecordsService.create(data);
      if (uploadedFiles.length > 0 && result.medicalRecord) {
        for (const file of uploadedFiles) {
          await medicalRecordsService.uploadFile(result.medicalRecord.id, file);
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] });
      if (selectedAppointment?.pet_id) {
        queryClient.invalidateQueries({ queryKey: ['pet', selectedAppointment.pet_id] });
        queryClient.invalidateQueries({ queryKey: ['appointments', 'pet', selectedAppointment.pet_id.toString()] });
      }
      toast({
        title: "Sukces",
        description: "Dokumentacja medyczna została zapisana",
      });
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

    if (appointmentsToUpdate.length > 0) {
      appointmentsToUpdate.forEach((appointment) => {
        updateStatusMutation.mutate(
          { id: appointment.id, status: 'cancelled' },
          {
            onSuccess: () => {},
            onError: () => {},
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

  const areAllFieldsEmpty = () => {
    return (
      !medicalRecordData.diagnosis?.trim() &&
      !medicalRecordData.treatment?.trim() &&
      !medicalRecordData.prescription?.trim() &&
      !medicalRecordData.notes?.trim() &&
      uploadedFiles.length === 0
    );
  };

  const areKeyMedicalFieldsEmpty = () => {
    return (
      !medicalRecordData.diagnosis?.trim() &&
      !medicalRecordData.treatment?.trim() &&
      !medicalRecordData.prescription?.trim()
    );
  };

  const hasAnyFieldData = () => {
    return (
      medicalRecordData.diagnosis?.trim() ||
      medicalRecordData.treatment?.trim() ||
      medicalRecordData.prescription?.trim() ||
      medicalRecordData.notes?.trim() ||
      uploadedFiles.length > 0
    );
  };

  const getFilledFields = () => {
    const fields: any = {};
    if (medicalRecordData.diagnosis?.trim()) fields.diagnosis = medicalRecordData.diagnosis;
    if (medicalRecordData.treatment?.trim()) fields.treatment = medicalRecordData.treatment;
    if (medicalRecordData.prescription?.trim()) fields.prescription = medicalRecordData.prescription;
    if (medicalRecordData.notes?.trim()) fields.notes = medicalRecordData.notes;
    return fields;
  };

  const handleStartAppointment = (appointment: Appointment) => {
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

    if (selectedAppointment.reason_is_vaccination && vaccinationPerformed === null) {
      toast({
        title: "Wymagane potwierdzenie",
        description: "Musisz zaznaczyć, czy szczepienie zostało wykonane.",
        variant: "destructive",
      });
      return;
    }

    if (areAllFieldsEmpty()) {
      setConfirmDialogMessage("Nie wypełniono żadnego pola dokumentacji. Czy na pewno chcesz zakończyć wizytę?");
      setShowConfirmDialog(true);
      return;
    }

    if (areKeyMedicalFieldsEmpty() && hasAnyFieldData()) {
      setConfirmDialogMessage("Nie wypełniono kluczowych pól medycznych (rozpoznanie, leczenie, recepta). Czy na pewno chcesz zakończyć wizytę?");
      setShowConfirmDialog(true);
      return;
    }

    await completeAppointmentWithData();
  };

  const completeAppointmentWithData = async () => {
    if (!selectedAppointment) return;

    try {
      if (hasAnyFieldData()) {
        const filledFields = getFilledFields();
        await saveMedicalRecordMutation.mutateAsync({
          appointmentId: selectedAppointment.id,
          ...filledFields
        });
      }

      const result = await updateStatusMutation.mutateAsync({
        id: selectedAppointment.id,
        status: 'completed',
        vaccinationPerformed: selectedAppointment.reason_is_vaccination ? vaccinationPerformed : undefined
      });

      if (selectedAppointment.reason_is_vaccination) {
        if (vaccinationPerformed && result?.appointment?.vaccinationCreated) {
          toast({
            title: "Wizyta zakończona",
            description: `Szczepienie ${selectedAppointment.vaccination_type_name} zostało zapisane w historii pacjenta.`,
          });
        } else if (vaccinationPerformed && !result?.appointment?.vaccinationCreated) {
          toast({
            title: "Wizyta zakończona",
            description: "Uwaga: Nie udało się automatycznie zapisać szczepienia. Dodaj je ręcznie w karcie pacjenta.",
            variant: "destructive",
          });
        } else if (!vaccinationPerformed && result?.appointment?.medicalRecordCreated) {
          toast({
            title: "Wizyta zakończona",
            description: "Szczepienie nie zostało wykonane. Informacja została zapisana w dokumentacji medycznej.",
          });
        } else {
          toast({
            title: "Wizyta zakończona",
            description: "Wizyta zakończona bez zapisu szczepienia.",
          });
        }
      } else {
        toast({
          title: "Wizyta zakończona",
          description: "Dokumentacja medyczna została zapisana.",
        });
      }

      setActiveAppointmentDialog(false);
      setSelectedAppointment(null);
      setMedicalRecordData({ diagnosis: "", treatment: "", prescription: "", notes: "" });
      setUploadedFiles([]);
      setVaccinationPerformed(null);

    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zakończyć wizyty",
        variant: "destructive",
      });
    }
  };

  const handleSaveMedicalRecord = () => {
    if (!selectedAppointment) return;

    if (!hasAnyFieldData()) {
      toast({
        title: "Brak danych",
        description: "Wypełnij przynajmniej jedno pole dokumentacji przed zapisaniem.",
        variant: "destructive",
      });
      return;
    }

    const filledFields = getFilledFields();
    saveMedicalRecordMutation.mutate({
      appointmentId: selectedAppointment.id,
      ...filledFields
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadFile = async (fileId: number) => {
    try {
      await medicalRecordsService.downloadFile(fileId);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się pobrać pliku",
        variant: "destructive",
      });
    }
  };

  const handlePreviewFile = async (fileId: number) => {
    try {
      await medicalRecordsService.previewFile(fileId);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się otworzyć podglądu pliku",
        variant: "destructive",
      });
    }
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
                      <div className="flex lg:flex-col items-center lg:items-start gap-2 lg:w-32">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{formatTime(appointment.scheduled_at)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(appointment.scheduled_at)}</p>
                          <p className="text-xs text-muted-foreground">{appointment.duration_minutes} min</p>
                        </div>
                      </div>

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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/doctor/patients/${appointment.pet_id}`)}
                            >
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
                            {record.prescription && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Recepta:</Label>
                                <p className="text-sm mt-1">{record.prescription}</p>
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
                            {record.files && record.files.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <Label className="text-sm text-muted-foreground mb-2 block">Załączone pliki:</Label>
                                <div className="space-y-2">
                                  {record.files.map((file: any) => {
                                    const FileIcon = getFileIcon(file.file_type);
                                    return (
                                      <div key={file.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{file.file_name}</p>
                                            <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                                          </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handlePreviewFile(file.id)}
                                            title="Podgląd"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadFile(file.id)}
                                            title="Pobierz"
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
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

                <TabsContent value="documentation" className="space-y-4">
                  {selectedAppointment.reason_is_vaccination && selectedAppointment.vaccination_type_name && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Syringe className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">Wizyta szczepienia</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        <p className="mb-3">
                          Ta wizyta dotyczy szczepienia: <strong>{selectedAppointment.vaccination_type_name}</strong>
                        </p>
                        <div className="bg-white rounded-md p-4 border border-blue-200 space-y-3">
                          <Label className="text-sm font-semibold text-gray-900">
                            Czy szczepienie zostało wykonane? *
                          </Label>
                          <div className="flex items-center justify-between gap-4">
                            <button
                              type="button"
                              onClick={() => setVaccinationPerformed(false)}
                              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                                vaccinationPerformed === false
                                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              NIE
                            </button>
                            <button
                              type="button"
                              onClick={() => setVaccinationPerformed(true)}
                              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                                vaccinationPerformed === true
                                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              TAK
                            </button>
                          </div>
                          {vaccinationPerformed === null && (
                            <p className="text-xs text-gray-600 italic">
                              ⚠️ Wybierz TAK lub NIE aby zakończyć wizytę
                            </p>
                          )}
                          {vaccinationPerformed === true && (
                            <p className="text-xs text-green-700">
                              ✓ Szczepienie zostanie automatycznie zapisane w historii pacjenta
                            </p>
                          )}
                          {vaccinationPerformed === false && (
                            <p className="text-xs text-red-700">
                              ℹ️ Wizyta zostanie zakończona bez zapisu szczepienia. Informacja zostanie zapisana w dokumentacji medycznej.
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

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

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Potwierdzenie zakończenia wizyty</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialogMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                setShowConfirmDialog(false);
                await completeAppointmentWithData();
              }}>
                Tak, zakończ wizytę
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AppLayout>
  );
};

export default DoctorAppointments;
