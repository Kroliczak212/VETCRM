import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, Stethoscope, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users.service";
import { appointmentsService } from "@/services/appointments.service";

const Doctors = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Fetch doctors
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => usersService.getAll({ role: 'doctor', limit: 100 }),
  });

  // Fetch today's appointments
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => appointmentsService.getAll({ date: today, limit: 1000 }),
  });

  const doctors = doctorsData?.data || [];
  const appointments = appointmentsData?.data || [];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getColorForDoctor = (id: number) => {
    const colors = [
      'bg-gradient-primary',
      'bg-gradient-secondary',
      'bg-gradient-hero',
      'bg-accent',
      'bg-primary'
    ];
    return colors[id % colors.length];
  };

  const getDoctorAppointments = (doctorId: number) => {
    return appointments.filter(apt => apt.doctor_user_id === doctorId && apt.status !== 'cancelled' && apt.status !== 'cancelled_late');
  };

  if (doctorsLoading) {
    return (
      <AppLayout role="receptionist">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const totalAppointments = appointments.filter(apt => apt.status !== 'cancelled' && apt.status !== 'cancelled_late').length;

  return (
    <AppLayout role="receptionist">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Lekarze Weterynarii</h1>
              <p className="text-muted-foreground">
                Grafik i dostępność lekarzy
              </p>
            </div>
            <Button variant="outline" size="lg" onClick={() => navigate("/receptionist/appointments")}>
              <Calendar className="mr-2 h-5 w-5" />
              Zobacz Kalendarz
            </Button>
          </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wszyscy Lekarze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{doctors.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aktywni Lekarze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-secondary">
                  {doctors.filter(d => d.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wizyty Dzisiaj
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {totalAppointments}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Średnio na lekarza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {doctors.length > 0 ? Math.round(totalAppointments / doctors.length) : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {doctors.map((doctor, index) => {
              const doctorAppointments = getDoctorAppointments(doctor.id);

              return (
                <Card
                  key={doctor.id}
                  className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-16 w-16 rounded-xl ${getColorForDoctor(doctor.id)} flex items-center justify-center shadow-md`}>
                          <span className="text-2xl font-bold text-primary-foreground">
                            {getInitials(doctor.first_name, doctor.last_name)}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl text-foreground mb-1">
                            Dr {doctor.first_name} {doctor.last_name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            {doctor.specialization || 'Weterynarz'}
                          </CardDescription>
                        </div>
                      </div>
                      {doctor.is_active ? (
                        <Badge className="bg-secondary/20 text-secondary hover:bg-secondary/30">Aktywny</Badge>
                      ) : (
                        <Badge variant="secondary">Nieaktywny</Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{doctor.phone || 'Brak telefonu'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{doctor.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Harmonogram w kalendarzu</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Wizyty dzisiaj</p>
                        <p className="font-semibold text-foreground">{doctorAppointments.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-semibold text-foreground">
                          {doctor.is_active ? 'Dostępny' : 'Nieaktywny'}
                        </p>
                      </div>
                    </div>

                    {/* Appointment List */}
                    {doctorAppointments.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-2">Dzisiejsze wizyty</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {doctorAppointments.slice(0, 3).map((apt, idx) => (
                            <div key={idx} className="text-xs text-foreground">
                              {new Date(apt.scheduled_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} - {apt.pet_name}
                            </div>
                          ))}
                          {doctorAppointments.length > 3 && (
                            <div className="text-xs text-muted-foreground italic">
                              ...i {doctorAppointments.length - 3} więcej
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/receptionist/appointments`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Zobacz grafik
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        disabled={!doctor.is_active}
                        onClick={() => navigate("/receptionist/appointments")}
                      >
                        Umów wizytę
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
    </AppLayout>
  );
};

export default Doctors;
