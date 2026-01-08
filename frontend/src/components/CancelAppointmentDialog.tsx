import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface CancelAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

// Business rules (matching backend)
const CANCEL_NO_PENALTY_HOURS = 72;
const CANCEL_WARNING_HOURS = 48;
const CANCEL_LATE_PENALTY_HOURS = 24;
const CANCEL_BLOCKED_HOURS = 24;
const LATE_CANCELLATION_FEE = 50;

function getHoursUntilAppointment(scheduledAt: string): number {
  const now = new Date();
  const appointmentDate = new Date(scheduledAt);
  const diffMs = appointmentDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
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

export function CancelAppointmentDialog({ appointment, isOpen, onClose }: CancelAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) => appointmentsService.cancelAppointment(appointmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      toast({
        title: "Wizyta anulowana",
        description: data.message,
      });

      if (data.hasFee && data.fee) {
        toast({
          title: "Opłata za późne anulowanie",
          description: `Opłata ${data.fee} zł zostanie naliczona przy następnej wizycie.`,
          variant: "destructive",
        });
      }

      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się anulować wizyty",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCancelling(false);
    },
  });

  const handleCancel = () => {
    if (!appointment) return;
    setIsCancelling(true);
    cancelMutation.mutate(appointment.id);
  };

  if (!appointment) return null;

  const hoursUntil = getHoursUntilAppointment(appointment.scheduled_at);
  const canCancel = hoursUntil >= CANCEL_BLOCKED_HOURS;
  const hasLateFee = hoursUntil >= CANCEL_LATE_PENALTY_HOURS && hoursUntil < CANCEL_WARNING_HOURS;
  const hasWarning = hoursUntil >= CANCEL_WARNING_HOURS && hoursUntil < CANCEL_NO_PENALTY_HOURS;
  const timeRemaining = formatTimeRemaining(hoursUntil);

  if (!canCancel) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Nie można anulować online
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
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
                    ❌ Wizyta odbywa się za mniej niż 24h
                  </p>
                  <p className="text-sm">
                    Anulowanie online nie jest możliwe. Aby anulować lub przełożyć wizytę, skontaktuj się z kliniką.
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p className="font-medium">📞 Kontakt z kliniką:</p>
                  <p>Telefon: +48 123 456 789</p>
                  <p>Email: kontakt@wetklinika.pl</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            {hasLateFee ? 'Późne anulowanie wizyty' : 'Anulowanie wizyty'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-4">
              <p>Czy na pewno chcesz anulować wizytę?</p>

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

              {hasLateFee && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-destructive">
                    ❌ UWAGA: PÓŹNE ANULOWANIE
                  </p>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p>
                        Za anulowanie wizyty na mniej niż 2 dni przed terminem zostanie naliczona opłata manipulacyjna w wysokości <span className="font-bold">{LATE_CANCELLATION_FEE} zł</span>.
                      </p>
                      <p className="text-destructive/90">
                        📝 Opłata zostanie doliczona przez recepcjonistę przy Twojej następnej wizycie w klinice.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hasWarning && !hasLateFee && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg dark:bg-yellow-950/20 dark:border-yellow-800/30">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-600 mb-1">
                    ⚠️ UWAGA
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">
                    Anulujesz wizytę na mniej niż 3 dni przed terminem. Prosimy o zgłaszanie anulowania wcześniej.
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                    ✓ Tym razem anulowanie bez opłaty
                  </p>
                </div>
              )}

              {!hasWarning && !hasLateFee && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg dark:bg-green-950/20 dark:border-green-800/30">
                  <p className="text-sm text-green-700 dark:text-green-500">
                    ✓ Możesz anulować wizytę bez konsekwencji
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Cofnij</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling}
            className={hasLateFee ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isCancelling ? "Anulowanie..." : hasLateFee ? "Rozumiem, anuluj" : "Potwierdź anulowanie"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
