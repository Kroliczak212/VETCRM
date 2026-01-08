import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { appointmentsService, type Appointment, type MedicalFile } from "@/services/appointments.service";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  MapPin,
  FileText,
  Pill,
  ClipboardList,
  DollarSign,
  AlertCircle,
  PawPrint,
  Loader2,
  Download,
  File,
  FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { medicalRecordsService } from "@/services/medical-records.service";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AppointmentDetailsDialogProps {
  appointmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentDetailsDialog({ appointmentId, isOpen, onClose }: AppointmentDetailsDialogProps) {
  const { toast } = useToast();
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentsService.getById(appointmentId!),
    enabled: !!appointmentId && isOpen,
  });

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      await medicalRecordsService.downloadFile(fileId);
      toast({
        title: "Pobieranie rozpoczęte",
        description: `Plik "${fileName}" jest pobierany.`,
      });
    } catch (error) {
      toast({
        title: "Błąd pobierania",
        description: "Nie udało się pobrać pliku. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => fileType.includes(ext))) {
      return <FileImage className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: Appointment['status']) => {
    const colors = {
      proposed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled_late: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: Appointment['status']) => {
    const labels = {
      proposed: 'Proponowana',
      confirmed: 'Potwierdzona',
      in_progress: 'W trakcie',
      completed: 'Zakończona',
      cancelled: 'Odwołana',
      cancelled_late: 'Odwołana (późno)',
    };
    return labels[status] || status;
  };

  const isCompleted = appointment?.status === 'completed';
  const isCancelled = appointment?.status === 'cancelled' || appointment?.status === 'cancelled_late';
  const isUpcoming = appointment?.status === 'proposed' || appointment?.status === 'confirmed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Szczegóły wizyty
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : appointment ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
              <p className="text-sm text-muted-foreground">
                ID wizyty: #{appointment.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(appointment.scheduled_at), "EEEE, d MMMM yyyy", { locale: pl })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Godzina</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(appointment.scheduled_at), "HH:mm")} ({appointment.duration_minutes} min)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Właściciel
              </h3>
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{appointment.client_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${appointment.client_phone}`} className="text-sm text-primary hover:underline">
                    {appointment.client_phone}
                  </a>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <PawPrint className="h-4 w-4" />
                Pacjent
              </h3>
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{appointment.pet_name}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {appointment.species}
                  {appointment.breed && ` • ${appointment.breed}`}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Lekarz
              </h3>
              <div className="pl-6">
                <p className="text-sm">{appointment.doctor_name}</p>
              </div>
            </div>

            {appointment.location && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Lokalizacja
                  </h3>
                  <div className="pl-6">
                    <p className="text-sm">{appointment.location}</p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Powód wizyty
              </h3>
              <div className="pl-6 space-y-2">
                {appointment.reason_name ? (
                  <div>
                    <p className="text-sm font-medium">{appointment.reason_name}</p>
                    {appointment.vaccination_type_name && (
                      <p className="text-sm text-muted-foreground">
                        Typ szczepienia: {appointment.vaccination_type_name}
                      </p>
                    )}
                  </div>
                ) : appointment.reason ? (
                  <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Brak podanego powodu</p>
                )}
                {appointment.reason && appointment.reason_name && (
                  <div>
                    <p className="text-sm font-medium mt-2">Dodatkowy opis:</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {isUpcoming && (
              <>
                <Separator />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Wizyta zaplanowana</p>
                      <p>Ta wizyta jeszcze się nie odbyła. Dokumentacja medyczna zostanie dodana po zakończeniu wizyty.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isCompleted && appointment.services && appointment.services.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Wykonane usługi
                  </h3>
                  <div className="pl-6 space-y-2">
                    {appointment.services.map((service, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-muted-foreground">× {service.quantity}</span>
                        </div>
                        <span className="font-medium">{service.total.toFixed(2)} zł</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between text-sm font-bold pt-2">
                      <span>Suma</span>
                      <span>
                        {appointment.services.reduce((sum, s) => sum + s.total, 0).toFixed(2)} zł
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isCompleted && appointment.medical_record && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Dokumentacja medyczna
                  </h3>
                  <div className="pl-6 space-y-4">
                    {appointment.medical_record.diagnosis && (
                      <div>
                        <p className="text-sm font-medium mb-1">Diagnoza</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {appointment.medical_record.diagnosis}
                        </p>
                      </div>
                    )}
                    {appointment.medical_record.treatment && (
                      <div>
                        <p className="text-sm font-medium mb-1">Leczenie</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {appointment.medical_record.treatment}
                        </p>
                      </div>
                    )}
                    {appointment.medical_record.prescription && (
                      <div>
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <Pill className="h-4 w-4" />
                          Recepta
                        </p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {appointment.medical_record.prescription}
                        </p>
                      </div>
                    )}
                    {appointment.medical_record.notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Notatki lekarza</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {appointment.medical_record.notes}
                        </p>
                      </div>
                    )}

                    {appointment.medical_record.files && appointment.medical_record.files.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Załączone pliki ({appointment.medical_record.files.length})
                        </p>
                        <div className="space-y-2">
                          {appointment.medical_record.files.map((file: MedicalFile) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between bg-muted p-3 rounded-md"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {getFileIcon(file.file_type)}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.file_size)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadFile(file.id, file.file_name)}
                                disabled={downloadingFileId === file.id}
                                className="ml-2 flex-shrink-0"
                              >
                                {downloadingFileId === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Pobierz
                                  </>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {isCancelled && (
              <>
                <Separator />
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <div className="text-sm text-gray-800">
                      <p className="font-semibold">Wizyta odwołana</p>
                      <p>Ta wizyta została odwołana i nie odbyła się.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nie znaleziono szczegółów wizyty
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
