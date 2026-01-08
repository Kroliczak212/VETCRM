import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { schedulesService, type CalendarDay } from "@/services/schedules.service";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DoctorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', startDate, endDate],
    queryFn: () => schedulesService.getCalendar({ startDate, endDate }),
  });

  const calendar = calendarData?.data || [];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  };

  const getDayName = (dayName: string) => {
    const names: Record<string, string> = {
      monday: 'Poniedziałek',
      tuesday: 'Wtorek',
      wednesday: 'Środa',
      thursday: 'Czwartek',
      friday: 'Piątek',
      saturday: 'Sobota',
      sunday: 'Niedziela',
    };
    return names[dayName] || dayName;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  const getSourceBadge = (source: CalendarDay['source']) => {
    if (source === 'schedule') {
      return <Badge variant="default" className="text-xs">Zmiana</Badge>;
    } else if (source === 'working_hours') {
      return <Badge variant="secondary" className="text-xs">Standardowe</Badge>;
    }
    return null;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <AppLayout role="doctor">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Mój grafik
          </h1>
          <p className="text-muted-foreground">
            Zobacz swoje godziny pracy w kalendarzu
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Standardowe</strong> - godziny z bazowego grafiku (pn-ndz) | <strong>Zmiana</strong> - jednorazowa zmiana dla konkretnego dnia
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl capitalize">
                {formatMonthYear(currentDate)}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Dzisiaj
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {calendar.map((day: CalendarDay) => {
                  const date = new Date(day.date);
                  const dayNumber = date.getDate();
                  const isTodayDay = isToday(day.date);

                  return (
                    <div
                      key={day.date}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isTodayDay
                          ? 'border-primary bg-primary/5'
                          : day.is_working
                          ? 'border-border bg-background'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-center ${isTodayDay ? 'text-primary' : ''}`}>
                          <div className="text-2xl font-bold">{dayNumber}</div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {getDayName(day.day_name).substring(0, 3)}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">{getDayName(day.day_name)}</div>
                          <div className="text-sm text-muted-foreground">{day.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {day.is_working ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-lg">
                                {formatTime(day.start_time)} - {formatTime(day.end_time)}
                              </span>
                            </div>
                            {getSourceBadge(day.source)}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Dzień wolny
                          </Badge>
                        )}
                      </div>

                      {day.notes && (
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {day.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Jak zarządzać grafikiem?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Godziny pracy</strong> - ustaw swoje bazowe godziny (poniedziałek-niedziela)</p>
              <p><strong>Zmiany grafiku</strong> - dodaj jednorazową zmianę dla konkretnego dnia</p>
              <p>Zmiany jednorazowe nadpisują bazowe godziny pracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Statystyki miesiąca</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Dni robocze:</span>
                <strong>{calendar.filter((d: CalendarDay) => d.is_working).length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Dni wolne:</span>
                <strong>{calendar.filter((d: CalendarDay) => !d.is_working).length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Zmian grafiku:</span>
                <strong>{calendar.filter((d: CalendarDay) => d.source === 'schedule').length}</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
