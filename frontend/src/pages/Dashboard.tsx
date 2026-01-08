import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, Settings, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    navigate("/login");
  };

  const stats = [
    {
      title: "Wizyty Dzisiaj",
      value: "12",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Aktywni Pacjenci",
      value: "145",
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Nowe Dokumenty",
      value: "8",
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const upcomingAppointments = [
    { time: "09:00", patient: "Burek", owner: "Jan Kowalski", type: "Szczepienie" },
    { time: "10:30", patient: "Mruczek", owner: "Anna Nowak", type: "Kontrola" },
    { time: "12:00", patient: "Reksio", owner: "Piotr Wiśniewski", type: "Zabieg" },
    { time: "14:00", patient: "Luna", owner: "Maria Dąbrowska", type: "Badanie" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-card border-r border-border transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">V</span>
              </div>
              <span className="font-bold text-foreground">VetCRM</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: Calendar, label: "Kalendarz", active: true },
            { icon: Users, label: "Klienci", active: false },
            { icon: FileText, label: "Dokumenty", active: false },
            { icon: Settings, label: "Ustawienia", active: false },
          ].map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "default" : "ghost"}
              className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"}`}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span className="ml-2">{item.label}</span>}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} text-destructive hover:text-destructive`}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-2">Wyloguj</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Panel Główny</h1>
            <p className="text-muted-foreground">
              Witaj ponownie! Oto przegląd Twojej pracy na dziś.
            </p>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
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
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <CardTitle className="text-foreground">Nadchodzące Wizyty</CardTitle>
              <CardDescription>Harmonogram na dzisiaj</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAppointments.map((appointment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary px-3 py-2 rounded-md font-semibold text-sm">
                        {appointment.time}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{appointment.patient}</p>
                        <p className="text-sm text-muted-foreground">{appointment.owner}</p>
                      </div>
                    </div>
                    <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">
                      {appointment.type}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                Zobacz wszystkie wizyty
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
              <CardHeader>
                <CardTitle className="text-foreground">Szybkie Akcje</CardTitle>
                <CardDescription>Najczęściej używane funkcje</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Umów nową wizytę
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Dodaj nowego klienta
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Utwórz dokumentację
                </Button>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "500ms" }}>
              <CardHeader>
                <CardTitle className="text-foreground">Informacje</CardTitle>
                <CardDescription>Status systemu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rola użytkownika</span>
                  <span className="font-medium text-foreground">Lekarz</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ostatnie logowanie</span>
                  <span className="font-medium text-foreground">Dzisiaj, 08:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status systemu</span>
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
                    <span className="font-medium text-secondary">Online</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
