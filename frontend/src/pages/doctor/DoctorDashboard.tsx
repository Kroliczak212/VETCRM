import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CheckCircle, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getDoctorStatistics,
  DoctorStatistics,
  formatAppointmentStatus,
  getStatusColor,
} from "@/services/dashboard.service";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const DoctorDashboard = () => {
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<DoctorStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getDoctorStatistics();
        setStatistics(data);
      } catch (error) {
        console.error("Error fetching doctor statistics:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać statystyk lekarza",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [toast]);

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLabel = formatAppointmentStatus(status);
    const colorClass = getStatusColor(status);
    return (
      <Badge className={`${colorClass} border-0`}>
        {statusLabel}
      </Badge>
    );
  };

  const handleViewAppointmentDetails = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  };

  if (loading) {
    return (
      <AppLayout role="doctor">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!statistics) {
    return (
      <AppLayout role="doctor">
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
        </div>
      </AppLayout>
    );
  }

  const stats = [
    {
      title: "Wizyty Dzisiaj",
      value: statistics.todayAppointments.toString(),
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Zakończone Dzisiaj",
      value: statistics.completedToday.toString(),
      icon: CheckCircle,
      color: "text-secondary",
    },
    {
      title: "Nadchodzące Dzisiaj",
      value: statistics.upcomingToday.toString(),
      icon: Clock,
      color: "text-accent",
    },
    {
      title: "Pacjenci (Łącznie)",
      value: statistics.totalPatients.toString(),
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <AppLayout role="doctor">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Panel Lekarza</h1>
            <p className="text-muted-foreground">
              Twój dzienny harmonogram
            </p>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card
                key={stat.title}
                className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Statystyki Tygodnia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Wizyty w Tygodniu</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statistics.weekTotalAppointments}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Zakończone w Tygodniu</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statistics.weekCompletedAppointments}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Harmonogram na Dzisiaj</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("pl-PL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.appointmentsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Brak wizyt na dziś
                  </p>
                ) : (
                  statistics.appointmentsList.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 hover:shadow-md cursor-pointer transition-all border border-border group"
                      onClick={() => handleViewAppointmentDetails(appointment.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center group-hover:scale-105 transition-transform">
                          <div className="text-2xl font-bold text-primary">
                            {formatTime(appointment.scheduled_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {appointment.duration_minutes} min
                          </div>
                        </div>
                        <div className="h-12 w-1 bg-gradient-primary rounded-full" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">
                              {appointment.client_name}
                            </h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} ({appointment.species}
                            {appointment.breed ? `, ${appointment.breed}` : ""})
                          </p>
                          {appointment.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {appointment.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            📧 {appointment.client_email} | 📞 {appointment.client_phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAppointmentDetails(appointment.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Szczegóły
                        </Button>
                        {appointment.status === "confirmed" ||
                        appointment.status === "proposed" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Rozpocznij Wizytę
                          </Button>
                        ) : appointment.status === "in_progress" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Kontynuuj
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" disabled>
                            {formatAppointmentStatus(appointment.status)}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <AppointmentDetailsDialog
          appointmentId={selectedAppointmentId}
          isOpen={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
        />
    </AppLayout>
  );
};

export default DoctorDashboard;
