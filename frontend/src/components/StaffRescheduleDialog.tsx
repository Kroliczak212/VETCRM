import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { usersService } from "@/services/users.service";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, Mail, AlertTriangle, UserRound } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

// Predefined reasons for rescheduling
const RESCHEDULE_REASONS = [
  { value: 'schedule_change', label: 'Zmiana grafiku lekarza' },
  { value: 'emergency', label: 'Nagly przypadek w klinice' },
  { value: 'doctor_unavailable', label: 'Nieobecnosc lekarza' },
  { value: 'equipment_issue', label: 'Problem ze sprzetem' },
  { value: 'clinic_closure', label: 'Tymczasowe zamkniecie kliniki' },
  { value: 'other', label: 'Inny powod' },
];

interface StaffRescheduleDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StaffRescheduleDialog({ appointment, isOpen, onClose }: StaffRescheduleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // Fetch all doctors
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => usersService.getDoctors(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedDoctorId(null);
      setSelectedDate('');
      setSelectedTime('');
      setSelectedReason('');
      setCustomReason('');
    } else if (appointment) {
      // Set default doctor to current appointment's doctor
      setSelectedDoctorId(appointment.doctor_user_id);
      setSelectedDate('');
    }
  }, [isOpen, appointment]);

  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedDoctorId, selectedDate],
    queryFn: () =>
      appointmentsService.getAvailableSlots({
        doctorId: selectedDoctorId!,
        date: selectedDate,
      }),
    enabled: !!selectedDoctorId && !!selectedDate && isOpen,
  });

  const forceRescheduleMutation = useMutation({
    mutationFn: ({ appointmentId, newScheduledAt, reason, newDoctorId }: {
      appointmentId: number;
      newScheduledAt: string;
      reason?: string;
      newDoctorId?: number;
    }) =>
      appointmentsService.forceReschedule(appointmentId, newScheduledAt, reason, newDoctorId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      let description = "Wizyta zostala przelozona.";
      if (data.doctorChanged) {
        description = `Wizyta zostala przelozona do Dr ${data.newDoctorName}.`;
      }
      if (data.clientNotified) {
        description += " Klient otrzymal powiadomienie email.";
      }
      toast({
        title: "Termin zmieniony",
        description,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Blad",
        description: error.response?.data?.error || "Nie udalo sie zmienic terminu wizyty",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!appointment || !selectedDate || !selectedTime || !selectedDoctorId) return;

    const newScheduledAt = `${selectedDate}T${selectedTime}:00`;

    // Build reason string
    let finalReason: string | undefined;
    if (selectedReason === 'other') {
      finalReason = customReason || undefined;
    } else if (selectedReason) {
      const reasonObj = RESCHEDULE_REASONS.find(r => r.value === selectedReason);
      finalReason = reasonObj?.label;
    }

    // Only pass new doctor ID if it's different from the original
    const newDoctorId = selectedDoctorId !== appointment.doctor_user_id ? selectedDoctorId : undefined;

    forceRescheduleMutation.mutate({
      appointmentId: appointment.id,
      newScheduledAt,
      reason: finalReason,
      newDoctorId,
    });
  };

  if (!appointment) return null;

  // Get dates that are at least 7 days from the original appointment
  const getAvailableDates = () => {
    const days: string[] = [];
    const originalDate = new Date(appointment.scheduled_at);
    const today = new Date();

    // Start from tomorrow, go up to 60 days
    for (let i = 1; i <= 60; i++) {
      const date = addDays(today, i);
      // Only include dates that are at least 7 days from the original appointment
      const daysDiff = Math.abs(differenceInDays(date, originalDate));
      if (daysDiff >= 7) {
        days.push(format(date, 'yyyy-MM-dd'));
      }
    }
    return days;
  };

  const availableDates = getAvailableDates();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Zmien termin wizyty
          </DialogTitle>
          <DialogDescription>
            Zmien termin wizyty. Nowy termin musi byc odlegly o co najmniej 7 dni od obecnego. Klient zostanie automatycznie powiadomiony emailem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-sm text-muted-foreground">Obecny termin:</Label>
            <div className="bg-muted p-4 rounded-lg mt-2">
              <p className="font-medium mb-1">{appointment.reason || 'Wizyta'}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(appointment.scheduled_at).toLocaleDateString('pl-PL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {' o '}
                {new Date(appointment.scheduled_at).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Klient: {appointment.client_name} | Zwierze: {appointment.pet_name} | Dr {appointment.doctor_name}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="doctor" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Lekarz
            </Label>
            <select
              id="doctor"
              value={selectedDoctorId || ''}
              onChange={(e) => {
                setSelectedDoctorId(Number(e.target.value));
                setSelectedTime(''); // Reset time when doctor changes
              }}
              className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">-- Wybierz lekarza --</option>
              {doctorsData?.data.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr {doctor.first_name} {doctor.last_name}
                  {doctor.id === appointment.doctor_user_id ? ' (obecny)' : ''}
                </option>
              ))}
            </select>
            {selectedDoctorId && selectedDoctorId !== appointment.doctor_user_id && (
              <p className="text-xs text-amber-600 mt-1">
                Zmiana lekarza - klient zostanie o tym poinformowany
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="date">Nowa data *</Label>
            <select
              id="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">-- Wybierz date --</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          {selectedDate && (
            <div>
              <Label htmlFor="time">Nowa godzina *</Label>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Ladowanie dostepnych terminow...</span>
                </div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`
                        px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${
                          slot.available
                            ? selectedTime === slot.time
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                            : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Brak dostepnych terminow w tym dniu
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="reason">Powod zmiany</Label>
            <select
              id="reason"
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                if (e.target.value !== 'other') {
                  setCustomReason('');
                }
              }}
              className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">-- Wybierz powod --</option>
              {RESCHEDULE_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'other' && (
            <div>
              <Label htmlFor="customReason">Opisz powod zmiany</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Wpisz powod zmiany terminu..."
                className="mt-2"
                rows={3}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Powod zostanie zawarty w emailu do klienta
          </p>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg dark:bg-amber-950/20 dark:border-amber-800/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium mb-1">Uwaga</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nowy termin musi byc odlegly o minimum 7 dni od obecnego terminu</li>
                  <li>Zmiana zostanie wprowadzona natychmiast, bez zatwierdzenia przez klienta</li>
                  <li>Klient moze poprosic o kolejna zmiane jesli termin mu nie odpowiada</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg dark:bg-blue-950/20 dark:border-blue-800/30">
            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">Powiadomienie email</p>
                <p>
                  Klient otrzyma automatyczny email z informacja o zmianie terminu, nowym terminem oraz
                  mozliwoscia zlozenia prosby o kolejna zmiane jesli termin mu nie odpowiada.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={forceRescheduleMutation.isPending}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDoctorId || !selectedDate || !selectedTime || forceRescheduleMutation.isPending}
          >
            {forceRescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zmien termin i powiadom klienta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
