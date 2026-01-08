import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, Shield, Clock, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: "Zarządzanie Wizytami",
      description: "Intuicyjny kalendarz z wizualizacją grafiku lekarzy i łatwym umawianiem wizyt.",
    },
    {
      icon: Users,
      title: "Baza Klientów i Pacjentów",
      description: "Kompleksowa kartoteka właścicieli zwierząt z pełną historią medyczną.",
    },
    {
      icon: FileText,
      title: "Historia Medyczna",
      description: "Cyfrowa dokumentacja leczenia z możliwością załączania wyników badań.",
    },
    {
      icon: Shield,
      title: "System Ról i Uprawnień",
      description: "Bezpieczny dostęp dla administratorów, lekarzy, recepcjonistów i klientów.",
    },
    {
      icon: Clock,
      title: "Zadania w Tle",
      description: "Automatyczne przypomnienia, generowanie raportów i wysyłka powiadomień.",
    },
    {
      icon: Bell,
      title: "Portal Klienta",
      description: "Dostęp dla właścicieli do informacji o ich pupilach i nadchodzących wizytach.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">V</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">VetCRM</h1>
          </div>
          <Button variant="hero" onClick={() => navigate("/login")}>
            Zaloguj się
          </Button>
        </div>
      </header>

      <section className="py-20 md:py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Nowoczesne rozwiązanie dla przychodni weterynaryjnych
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              System CRM dla
              <span className="block bg-gradient-hero bg-clip-text text-transparent">
                Przychodni Weterynaryjnej
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Kompleksowe rozwiązanie webowe do zarządzania personelem, klientami, pacjentami 
              i automatyzacji zadań w Twojej przychodni weterynaryjnej.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="hero" size="xl" onClick={() => navigate("/login")}>
                Rozpocznij Demo
              </Button>
              <Button variant="outline" size="xl">
                Dowiedz się więcej
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground">
              Kompleksowe Funkcjonalności
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Wszystko, czego potrzebujesz do efektywnego zarządzania przychodnią w jednym miejscu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground">
              Dla Każdego Członka Zespołu
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              System dostosowany do potrzeb różnych ról w przychodni
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                role: "Administrator",
                description: "Pełne zarządzanie systemem i personelem",
                color: "bg-gradient-primary",
              },
              {
                role: "Recepcjonista",
                description: "Obsługa klientów i zarządzanie wizytami",
                color: "bg-gradient-secondary",
              },
              {
                role: "Lekarz",
                description: "Prowadzenie dokumentacji medycznej",
                color: "bg-gradient-hero",
              },
              {
                role: "Klient",
                description: "Dostęp do informacji o pupilach",
                color: "bg-accent",
              },
            ].map((item, index) => (
              <Card 
                key={index} 
                className="text-center hover:shadow-lg transition-all duration-300"
              >
                <CardHeader>
                  <div className={`h-16 w-16 rounded-full ${item.color} mx-auto mb-4 flex items-center justify-center shadow-md`}>
                    <span className="text-2xl font-bold text-white">
                      {item.role.charAt(0)}
                    </span>
                  </div>
                  <CardTitle className="text-foreground">{item.role}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h3 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Gotowy na Transformację Swojej Przychodni?
          </h3>
          <p className="text-lg text-primary-foreground/90">
            Dołącz do nowoczesnych przychodni weterynaryjnych, które wybrały VetCRM
          </p>
          <Button 
            variant="outline" 
            size="xl" 
            className="bg-card hover:bg-card/90 text-foreground border-primary-foreground/20"
            onClick={() => navigate("/login")}
          >
            Wypróbuj za darmo
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p className="text-sm">
            © 2024 VetCRM. Webowa aplikacja CRM dla przychodni weterynaryjnej.
          </p>
          <p className="text-xs mt-2">
            Projekt inżynierski - System zarządzania z automatyzacją zadań w tle
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
