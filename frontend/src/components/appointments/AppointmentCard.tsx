import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, PawPrint } from "lucide-react";
import type { Appointment } from "@/services/appointments.service";

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "proposed":
      return "bg-yellow-500/20 text-yellow-700";
    case "confirmed":
      return "bg-primary/20 text-primary";
    case "in_progress":
      return "bg-accent/20 text-accent";
    case "completed":
      return "bg-green-500/20 text-green-700";
    case "cancelled":
    case "cancelled_late":
      return "bg-destructive/20 text-destructive";
    default:
      return "bg-muted";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "proposed":
      return "Zaproponowana";
    case "confirmed":
      return "Potwierdzona";
    case "in_progress":
      return "W trakcie";
    case "completed":
      return "Zakończona";
    case "cancelled":
      return "Anulowana";
    case "cancelled_late":
      return "Anulowana (późno)";
    default:
      return status;
  }
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const appointmentTime = new Date(appointment.scheduled_at).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge className={getStatusColor(appointment.status)}>
            {getStatusLabel(appointment.status)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {appointment.duration_minutes} min
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{appointmentTime}</p>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {appointment.client_name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PawPrint className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{appointment.pet_name}</p>
          </div>

          {appointment.reason && (
            <p className="text-xs text-muted-foreground italic">
              {appointment.reason}
            </p>
          )}

          <p className="text-xs text-primary font-medium mt-2">
            Dr {appointment.doctor_name}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
