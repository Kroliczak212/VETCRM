import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Plus, Phone, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  getReceptionistStatistics,
  ReceptionistStatistics,
  formatAppointmentStatus,
  getStatusColor,
} from "@/services/dashboard.service";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<ReceptionistStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getReceptionistStatistics();
        setStatistics(data);
      } catch (error) {
        console.error("Error fetching receptionist statistics:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać statystyk recepcjonisty",
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
      <AppLayout role="receptionist">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!statistics) {
    return (
      <AppLayout role="receptionist">
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
      change: "Wszystkie wizyty na dziś",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Oczekujących",
      value: statistics.pendingAppointments.toString(),
      change: "Zaproponowane/Potwierdzone",
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Nowi Klienci",
      value: statistics.newClientsThisMonth.toString(),
      change: "W tym miesiącu",
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  return (
    <AppLayout role="receptionist">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Panel Recepcjonisty</h1>
                <p className="text-muted-foreground">
                  Zarządzaj wizytami i obsługą klientów
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => navigate("/receptionist/clients")}>
                  <Users className="mr-2 h-5 w-5" />
                  Klienci
                </Button>
                <Button variant="medical" size="lg" onClick={() => navigate("/receptionist/appointments")}>
                  <Plus className="mr-2 h-5 w-5" />
                  Umów Wizytę
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <CardTitle className="text-foreground">Szybkie Akcje</CardTitle>
              <CardDescription>Najczęściej używane funkcje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => navigate("/receptionist/appointments")}
                >
                  <Calendar className="h-8 w-8 text-primary" />
                  <span className="font-semibold">Umów Wizytę</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => navigate("/receptionist/clients")}
                >
                  <Plus className="h-8 w-8 text-secondary" />
                  <span className="font-semibold">Dodaj Klienta</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-6 flex-col gap-2"
                  onClick={() => navigate("/receptionist/doctors")}
                >
                  <Users className="h-8 w-8 text-accent" />
                  <span className="font-semibold">Lista Lekarzy</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Wizyty na Dziś</CardTitle>
                  <CardDescription>
                    Harmonogram wizyt -{" "}
                    {new Date().toLocaleDateString("pl-PL", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/receptionist/appointments")}>
                  Zobacz wszystkie
                </Button>
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
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 hover:shadow-md cursor-pointer transition-all duration-300 group"
                      onClick={() => handleViewAppointmentDetails(appointment.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg font-bold text-sm min-w-[70px] text-center group-hover:bg-primary/20 transition-colors">
                          {formatTime(appointment.scheduled_at)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">
                              {appointment.client_name}
                            </p>
                            <a
                              href={`tel:${appointment.client_phone}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Phone className="h-3 w-3" />
                              </Button>
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appointment.pet_name} ({appointment.species})
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Prowadzący: {appointment.doctor_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <p
                            className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {formatAppointmentStatus(appointment.status)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {appointment.duration_minutes} min
                            {appointment.reason && ` • ${appointment.reason}`}
                          </p>
                        </div>
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
                          Zobacz
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment Details Dialog */}
        <AppointmentDetailsDialog
          appointmentId={selectedAppointmentId}
          isOpen={isDetailsDialogOpen}
          onClose={handleCloseDetailsDialog}
        />
    </AppLayout>
  );
};

export default ReceptionistDashboard;
