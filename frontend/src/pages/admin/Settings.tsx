import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Building2, Clock, Mail, Phone, MapPin, Bell, Shield, Database } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    clinicName: "VetCRM Przychodnia",
    address: "ul. Weterynaryjna 15, 00-001 Warszawa",
    phone: "+48 22 123 45 67",
    email: "kontakt@vetcrm.pl",
    workingHours: "Pn-Pt: 8:00-20:00, Sob: 9:00-15:00",
    description: "Kompleksowa opieka weterynaryjna dla Twojego pupila",
    emailNotifications: true,
    smsNotifications: true,
    autoReminders: true,
    reminderDays: "2",
  });

  const handleSave = () => {
    toast({
      title: "Zapisano ustawienia",
      description: "Zmiany zostały pomyślnie zapisane",
    });
  };

  return (
    <AppLayout role="admin">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Ustawienia Systemu</h1>
            <p className="text-muted-foreground">Konfiguracja przychodni i systemu</p>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Clinic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Informacje o Przychodni</CardTitle>
              </div>
              <CardDescription>Podstawowe dane kontaktowe i lokalizacyjne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nazwa przychodni</Label>
                  <Input
                    id="clinicName"
                    value={settings.clinicName}
                    onChange={(e) => setSettings({...settings, clinicName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({...settings, email: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHours">Godziny otwarcia</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="workingHours"
                      value={settings.workingHours}
                      onChange={(e) => setSettings({...settings, workingHours: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis przychodni</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings({...settings, description: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Powiadomienia</CardTitle>
              </div>
              <CardDescription>Konfiguracja automatycznych powiadomień dla klientów</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Powiadomienia Email</Label>
                  <p className="text-sm text-muted-foreground">Wysyłaj przypomnienia o wizytach przez email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Powiadomienia SMS</Label>
                  <p className="text-sm text-muted-foreground">Wysyłaj przypomnienia o wizytach przez SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatyczne przypomnienia</Label>
                  <p className="text-sm text-muted-foreground">Włącz system automatycznych przypomnień</p>
                </div>
                <Switch
                  checked={settings.autoReminders}
                  onCheckedChange={(checked) => setSettings({...settings, autoReminders: checked})}
                />
              </div>

              {settings.autoReminders && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="reminderDays">Przypominaj z wyprzedzeniem (dni)</Label>
                  <Input
                    id="reminderDays"
                    type="number"
                    value={settings.reminderDays}
                    onChange={(e) => setSettings({...settings, reminderDays: e.target.value})}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Bezpieczeństwo</CardTitle>
              </div>
              <CardDescription>Ustawienia bezpieczeństwa i dostępu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Status RODO</p>
                <p className="font-medium text-foreground">✓ System zgodny z RODO</p>
                <p className="text-xs text-muted-foreground mt-2">Logi dostępu aktywne, szyfrowanie włączone</p>
              </div>

              <Button variant="outline" className="w-full">
                <Database className="mr-2 h-4 w-4" />
                Eksportuj dane (RODO)
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Anuluj</Button>
            <Button onClick={handleSave}>Zapisz zmiany</Button>
          </div>
        </div>
    </AppLayout>
  );
};

export default Settings;
