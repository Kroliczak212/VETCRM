import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, UserPlus, Calendar, Loader2, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService, type CreateUserData } from "@/services/users.service";

export default function StaffManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [newStaff, setNewStaff] = useState<Partial<CreateUserData>>({
    roleName: "doctor",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['users', 'staff', searchTerm],
    queryFn: () => usersService.getAll({ search: searchTerm, limit: 100 }),
  });

  const createStaffMutation = useMutation({
    mutationFn: (data: CreateUserData) => usersService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddDialogOpen(false);

      if (response.data.temporaryPassword) {
        setTemporaryPasswordDialog({
          isOpen: true,
          password: response.data.temporaryPassword,
          name: `${response.data.first_name} ${response.data.last_name}`,
          email: response.data.email,
        });
      } else {
        toast({ title: "Sukces", description: "Pracownik został dodany pomyślnie" });
      }

      setNewStaff({
        roleName: "doctor",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać pracownika",
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Sukces", description: "Pracownik został usunięty" });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się usunąć pracownika",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      usersService.updateIsActive(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Sukces",
        description: `Konto zostało ${variables.isActive ? 'aktywowane' : 'dezaktywowane'}`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zmienić statusu konta",
        variant: "destructive",
      });
    },
  });

  const allStaff = staffData?.data || [];
  const doctors = allStaff.filter(s => s.role_name === 'doctor');
  const receptionists = allStaff.filter(s => s.role_name === 'receptionist');

  const handleAddStaff = () => {
    if (!newStaff.email || !newStaff.firstName || !newStaff.lastName || !newStaff.roleName) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }
    createStaffMutation.mutate(newStaff as CreateUserData);
  };

  const handleDeleteStaff = (id: number, name: string) => {
    if (confirm(`Czy na pewno chcesz usunąć ${name}?`)) {
      deleteStaffMutation.mutate(id);
    }
  };

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Zarządzanie personelem</h1>
            <p className="text-muted-foreground">Lekarze, recepcjoniści i ich grafiki</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Grafiki
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Zarządzanie grafikami</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Tutaj będzie kalendarz z grafikami pracowników
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pracownika
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Dodaj nowego pracownika</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Rola *</Label>
                    <Select
                      value={newStaff.roleName}
                      onValueChange={(value: "doctor" | "receptionist" | "admin") => setNewStaff({ ...newStaff, roleName: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rolę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Lekarz weterynarii</SelectItem>
                        <SelectItem value="receptionist">Recepcjonista</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Imię *</Label>
                      <Input
                        value={newStaff.firstName}
                        onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                        placeholder="Jan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nazwisko *</Label>
                      <Input
                        value={newStaff.lastName}
                        onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                        placeholder="Kowalski"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="jan@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <PhoneInput
                      value={newStaff.phone}
                      onChange={(value) => setNewStaff({ ...newStaff, phone: value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleAddStaff} disabled={createStaffMutation.isPending}>
                    {createStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj pracownika
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj pracownika..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="doctors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="doctors">Lekarze ({doctors.length})</TabsTrigger>
            <TabsTrigger value="receptionists">Recepcjoniści ({receptionists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : doctors.length > 0 ? (
              doctors.map((doctor) => (
                <Card key={doctor.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Dr. {doctor.first_name} {doctor.last_name}
                          <Badge variant={doctor.is_active ? "default" : "secondary"}>
                            {doctor.is_active ? "Aktywny" : "Nieaktywny"}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Lekarz weterynarii</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeleteStaff(doctor.id, `Dr. ${doctor.first_name} ${doctor.last_name}`)
                          }
                          disabled={deleteStaffMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{doctor.email}</p>
                      </div>
                      {doctor.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Telefon</p>
                          <p className="text-sm font-medium">{doctor.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Data dodania</p>
                        <p className="text-sm font-medium">
                          {new Date(doctor.created_at).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={`active-${doctor.id}`} className="text-sm font-medium">
                            Status konta
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {doctor.is_active
                              ? "Lekarz może przyjmować pacjentów"
                              : "Lekarz nie może przyjmować pacjentów"}
                          </p>
                        </div>
                        <Switch
                          id={`active-${doctor.id}`}
                          checked={doctor.is_active}
                          onCheckedChange={(checked) => {
                            if (confirm(
                              checked
                                ? `Czy na pewno chcesz aktywować konto lekarza ${doctor.first_name} ${doctor.last_name}?`
                                : `Czy na pewno chcesz dezaktywować konto lekarza ${doctor.first_name} ${doctor.last_name}? Spowoduje to dezaktywację godzin pracy i odrzucenie oczekujących requestów grafiku.`
                            )) {
                              toggleActiveMutation.mutate({ id: doctor.id, isActive: checked });
                            }
                          }}
                          disabled={toggleActiveMutation.isPending}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak lekarzy w systemie</p>
            )}
          </TabsContent>

          <TabsContent value="receptionists" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : receptionists.length > 0 ? (
              receptionists.map((receptionist) => (
                <Card key={receptionist.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {receptionist.first_name} {receptionist.last_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Recepcjonista</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeleteStaff(receptionist.id, `${receptionist.first_name} ${receptionist.last_name}`)
                          }
                          disabled={deleteStaffMutation.isPending}
                        >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{receptionist.email}</p>
                    </div>
                    {receptionist.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Telefon</p>
                        <p className="text-sm font-medium">{receptionist.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Data dodania</p>
                      <p className="text-sm font-medium">
                        {new Date(receptionist.created_at).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak recepcjonistów w systemie</p>
            )}
          </TabsContent>
        </Tabs>

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
                    <p>To hasło zostanie pokazane tylko raz. Przekaż je pracownikowi.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pracownik</Label>
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
                <p className="font-semibold mb-1">Instrukcja dla pracownika:</p>
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
      </div>
    </AppLayout>
  );
}