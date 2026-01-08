import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Phone, Mail, MapPin, Edit, Eye, PawPrint, Loader2, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsService, type CreateClientData } from "@/services/clients.service";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { validateAndSanitize, emailRegex, phoneRegex } from "@/lib/validation";

// Client form validation schema (camelCase for CreateClientData)
const createClientSchema = z.object({
  email: z.string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email')
    .max(100, 'Email nie może przekraczać 100 znaków')
    .toLowerCase()
    .trim(),

  firstName: z.string()
    .min(2, 'Imię musi mieć co najmniej 2 znaki')
    .max(50, 'Imię nie może przekraczać 50 znaków')
    .trim(),

  lastName: z.string()
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki')
    .max(50, 'Nazwisko nie może przekraczać 50 znaków')
    .trim(),

  phone: z.string()
    .min(9, 'Numer telefonu musi mieć co najmniej 9 znaków')
    .max(15, 'Numer telefonu nie może przekraczać 15 znaków')
    .regex(phoneRegex, 'Numer telefonu może zawierać tylko cyfry, spacje i znaki: + - ( )')
    .trim(),

  address: z.string()
    .max(200, 'Adres nie może przekraczać 200 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  notes: z.string()
    .max(1000, 'Notatki nie mogą przekraczać 1000 znaków')
    .trim()
    .optional()
    .or(z.literal('')),
});

const Clients = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [temporaryPasswordDialog, setTemporaryPasswordDialog] = useState<{
    isOpen: boolean;
    password: string;
    name: string;
    email: string;
  }>({
    isOpen: false,
    password: "",
    name: "",
    email: "",
  });
  const [newClient, setNewClient] = useState<CreateClientData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { data: clientsData, isLoading, error } = useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: () => clientsService.getAll({ search: searchQuery, limit: 100 }),
  });

  const createClientMutation = useMutation({
    mutationFn: (data: CreateClientData) => clientsService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsAddDialogOpen(false);

      // Show temporary password if it was auto-generated
      if (response.data.temporaryPassword) {
        setTemporaryPasswordDialog({
          isOpen: true,
          password: response.data.temporaryPassword,
          name: `${response.data.first_name} ${response.data.last_name}`,
          email: response.data.email,
        });
      } else {
        toast({ title: "Sukces", description: "Klient został dodany pomyślnie" });
      }

      setNewClient({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać klienta",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = () => {
    const validationResult = validateAndSanitize(createClientSchema, newClient);

    if (!validationResult.success) {
      const firstError = validationResult.errors.errors[0];
      toast({
        title: "Błąd walidacji",
        description: firstError.message || "Wypełnij wszystkie wymagane pola poprawnie",
        variant: "destructive",
      });

      // Log all validation errors in development
      if (import.meta.env.DEV) {
        console.error('Validation errors:', validationResult.errors.errors);
      }
      return;
    }

    createClientMutation.mutate(validationResult.data);
  };

  const clients = clientsData?.data || [];
  const totalPets = clients.reduce((sum, client) => sum + (client.pets_count || 0), 0);

  return (
    <AppLayout role="receptionist">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Baza Klientów</h1>
                <p className="text-muted-foreground">
                  Zarządzaj klientami i ich pupilami
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="medical" size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Dodaj Nowego Klienta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Dodaj nowego klienta</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Imię *</Label>
                        <Input
                          value={newClient.firstName}
                          onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                          placeholder="Jan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nazwisko *</Label>
                        <Input
                          value={newClient.lastName}
                          onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                          placeholder="Kowalski"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="jan@example.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Telefon *</Label>
                        <PhoneInput
                          value={newClient.phone}
                          onChange={(value) => setNewClient({ ...newClient, phone: value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adres</Label>
                        <Input
                          value={newClient.address}
                          onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                          placeholder="ul. Kwiatowa 15, Warszawa"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Uwagi</Label>
                      <Input
                        value={newClient.notes}
                        onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                        placeholder="Dodatkowe informacje..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Anuluj
                    </Button>
                    <Button onClick={handleAddClient} disabled={createClientMutation.isPending}>
                      {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Dodaj klienta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwisku, telefonie, email lub imieniu pupila..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Błąd ładowania
                </h3>
                <p className="text-muted-foreground">
                  Nie udało się załadować listy klientów. Spróbuj odświeżyć stronę.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Wszyscy Klienci
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{clients.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pacjenci (Pupile)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {totalPets}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Wyniki wyszukiwania
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{clients.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Clients List */}
              <div className="space-y-4">
                {clients.map((client, index) => (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Client Info */}
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {client.first_name} {client.last_name}
                          </h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            ID: {client.id}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{client.address || 'Brak adresu'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pets Info */}
                      <div className="border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                          <PawPrint className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            {client.pets_count || 0} {(client.pets_count || 0) === 1 ? 'pupil' : 'pupili'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Kliknij "Zobacz szczegóły" aby zobaczyć pupile
                        </p>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Klient od: {new Date(client.created_at).toLocaleDateString('pl-PL')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/receptionist/clients/${client.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Szczegóły
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate("/receptionist/appointments")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Umów wizytę
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>

              {clients.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nie znaleziono klientów
                    </h3>
                    <p className="text-muted-foreground">
                      Spróbuj użyć innych słów kluczowych lub dodaj nowego klienta
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Temporary Password Dialog */}
        <Dialog open={temporaryPasswordDialog.isOpen} onOpenChange={(open) => setTemporaryPasswordDialog({ ...temporaryPasswordDialog, isOpen: open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Konto utworzone pomyślnie
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Hasło tymczasowe</p>
                    <p>To hasło zostanie pokazane tylko raz. Przekaż je klientowi.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Klient</Label>
                <p className="text-sm font-medium">{temporaryPasswordDialog.name}</p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm font-medium">{temporaryPasswordDialog.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Hasło tymczasowe</Label>
                <div className="flex gap-2">
                  <Input
                    value={temporaryPasswordDialog.password}
                    readOnly
                    className="font-mono bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(temporaryPasswordDialog.password);
                      toast({ title: "Skopiowano", description: "Hasło zostało skopiowane do schowka" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Instrukcja dla klienta:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Zaloguj się używając emaila i hasła tymczasowego</li>
                  <li>System wymusi zmianę hasła przy pierwszym logowaniu</li>
                  <li>Ustaw nowe, bezpieczne hasło spełniające wymagania systemu</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTemporaryPasswordDialog({ isOpen: false, password: "", name: "", email: "" })}>
                Rozumiem
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
};

export default Clients;
