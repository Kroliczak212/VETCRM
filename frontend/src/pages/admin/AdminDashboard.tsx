import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, Calendar, DollarSign, TrendingUp, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminStatistics, AdminStatistics, formatAppointmentStatus } from "@/services/dashboard.service";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getAdminStatistics();
        setStatistics(data);
      } catch (error) {
        console.error("Error fetching admin statistics:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać statystyk administratora",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [toast]);

  // Helper: Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper: Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min. temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays === 1) return "1 dzień temu";
    return `${diffDays} dni temu`;
  };

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!statistics) {
    return (
      <AppLayout role="admin">
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
        </div>
      </AppLayout>
    );
  }

  const stats = [
    {
      title: "Wszyscy Pracownicy",
      value: statistics.totalStaff.toString(),
      icon: Users,
      trend: "Łącznie w systemie",
      color: "text-primary",
    },
    {
      title: "Aktywni Lekarze",
      value: statistics.activeDoctors.toString(),
      icon: Stethoscope,
      trend: "Lekarze weterynarii",
      color: "text-secondary",
    },
    {
      title: "Wszystkie Wizyty",
      value: statistics.totalAppointments.toString(),
      icon: Calendar,
      trend: "Łącznie umówione",
      color: "text-accent",
    },
    {
      title: "Przychód",
      value: formatCurrency(statistics.totalRevenue),
      icon: DollarSign,
      trend: "Opłacone wizyty",
      color: "text-primary",
    },
  ];

  return (
    <AppLayout role="admin">
      <header className="bg-card border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel Administratora</h1>
          <p className="text-muted-foreground">
            Zarządzanie systemem i personelem
          </p>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Grid */}
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
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Appointments by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Wizyty wg Statusu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statistics.appointmentsByStatus.map((item) => (
                <div
                  key={item.status}
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {formatAppointmentStatus(item.status)}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Ostatnie Wizyty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak ostatnich wizyt
                </p>
              ) : (
                statistics.recentActivity.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          appointment.status === "completed"
                            ? "bg-green-500"
                            : appointment.status === "cancelled" ||
                              appointment.status === "cancelled_late"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.client_name} - {appointment.pet_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Lekarz: {appointment.doctor_name} |{" "}
                          {formatAppointmentStatus(appointment.status)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeTime(appointment.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Wizyta:{" "}
                        {new Date(appointment.scheduled_at).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Miesięczny Przychód
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak danych o przychodach
              </p>
            ) : (
              <div className="space-y-3">
                {statistics.monthlyRevenue.map((item) => (
                  <div
                    key={item.month}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {new Date(item.month + "-01").toLocaleDateString("pl-PL", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
