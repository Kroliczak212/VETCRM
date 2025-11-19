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
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Calendar, Clock, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface RescheduleAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

// Business rules
const RESCHEDULE_MIN_HOURS_BEFORE = 48;

function getHoursUntilAppointment(scheduledAt: string): number {
  const now = new Date();
  const appointmentDate = new Date(scheduledAt);
  const diffMs = appointmentDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

function formatTimeRemaining(hours: number): string {
  if (hours < 0) return 'Wizyta już się odbyła';

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);

  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dzień' : 'dni'}`);
  if (remainingHours > 0) parts.push(`${remainingHours} ${remainingHours === 1 ? 'godzina' : 'godzin'}`);

  return parts.length > 0 ? parts.join(' ') : '0 minut';
}

export function RescheduleAppointmentDialog({ appointment, isOpen, onClose }: RescheduleAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientNote, setClientNote] = useState<string>('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate('');
      setSelectedTime('');
      setClientNote('');
    } else if (appointment) {
      // Set default date to original appointment date
      const originalDate = new Date(appointment.scheduled_at);
      setSelectedDate(format(originalDate, 'yyyy-MM-dd'));
    }
  }, [isOpen, appointment]);

  // Fetch available slots when date is selected
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', appointment?.doctor_user_id, selectedDate],
    queryFn: () =>
      appointmentsService.getAvailableSlots({
        doctorId: appointment!.doctor_user_id,
        date: selectedDate,
      }),
    enabled: !!appointment && !!selectedDate && isOpen,
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ appointmentId, newScheduledAt, note }: { appointmentId: number; newScheduledAt: string; note?: string }) =>
      appointmentsService.requestReschedule(appointmentId, newScheduledAt, note),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Prośba wysłana",
        description: "Twoja prośba o zmianę terminu została wysłana do recepcji. Otrzymasz powiadomienie o decyzji.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się wysłać prośby o zmianę terminu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!appointment || !selectedDate || !selectedTime) return;

    const newScheduledAt = `${selectedDate}T${selectedTime}:00`;

    rescheduleMutation.mutate({
      appointmentId: appointment.id,
      newScheduledAt,
      note: clientNote || undefined,
    });
  };

  if (!appointment) return null;

  const hoursUntil = getHoursUntilAppointment(appointment.scheduled_at);
  const canReschedule = hoursUntil >= RESCHEDULE_MIN_HOURS_BEFORE;
  const timeRemaining = formatTimeRemaining(hoursUntil);

  // Get next 7 days for date picker
  const getNextDays = (count: number) => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(format(date, 'yyyy-MM-dd'));
    }
    return days;
  };

  const availableDates = getNextDays(14); // Next 2 weeks

  // Cannot reschedule (< 48h)
  if (!canReschedule) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Nie można zmienić terminu online
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">{appointment.reason || 'Wizyta'}</p>
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
                    {appointment.pet_name} • Dr {appointment.doctor_name}
                  </p>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Do wizyty pozostało: {timeRemaining}</p>
                  </div>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <p className="font-semibold text-destructive mb-2">
                    ❌ Wizyta odbywa się za mniej niż 48h
                  </p>
                  <p className="text-sm">
                    Zmiana terminu online nie jest możliwa. Aby przełożyć wizytę, skontaktuj się z kliniką.
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p className="font-medium">📞 Kontakt z kliniką:</p>
                  <p>Telefon: +48 123 456 789</p>
                  <p>Email: kontakt@wetklinika.pl</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Can reschedule - show form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Zmiana terminu wizyty
          </DialogTitle>
          <DialogDescription>
            Zaproponuj nowy termin wizyty. Zmiana wymaga zatwierdzenia przez recepcję.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current appointment info */}
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
                {appointment.pet_name} • Dr {appointment.doctor_name}
              </p>
            </div>
          </div>

          {/* Date selection */}
          <div>
            <Label htmlFor="date">Wybierz nową datę *</Label>
            <select
              id="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime(''); // Reset time when date changes
              }}
              className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">-- Wybierz datę --</option>
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

          {/* Time selection */}
          {selectedDate && (
            <div>
              <Label htmlFor="time">Wybierz godzinę *</Label>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Ładowanie dostępnych terminów...</span>
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
                  Brak dostępnych terminów w tym dniu
                </p>
              )}
            </div>
          )}

          {/* Optional note */}
          <div>
            <Label htmlFor="note">Notatka (opcjonalna)</Label>
            <Textarea
              id="note"
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              placeholder="Np. Proszę o zmianę z powodu..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Info about approval */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg dark:bg-blue-950/20 dark:border-blue-800/30">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">Zmiana wymaga zatwierdzenia</p>
                <p>
                  Twoja prośba o zmianę terminu zostanie przesłana do recepcji. Otrzymasz powiadomienie e-mail o decyzji.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={rescheduleMutation.isPending}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Wyślij prośbę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
