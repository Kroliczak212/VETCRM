import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Plus, Phone, Mail, MapPin, Calendar, PawPrint, Loader2, Trash2, Clock, User, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientsService, type UpdateClientData } from "@/services/clients.service";
import { petsService, type CreatePetData, type UpdatePetData } from "@/services/pets.service";
import { appointmentsService, type Appointment } from "@/services/appointments.service";
import { vaccinationsService, type CreateVaccinationData, type Vaccination } from "@/services/vaccinations.service";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import { z } from "zod";
import { validateAndSanitize } from "@/lib/validation";
import { PET_SPECIES, isPredefinedSpecies } from "@/constants/pet-species";

const createPetSchema = z.object({
  ownerId: z.number().positive('ID właściciela jest wymagane'),

  name: z.string()
    .min(1, 'Imię zwierzęcia jest wymagane')
    .max(50, 'Imię zwierzęcia nie może przekraczać 50 znaków')
    .trim(),

  species: z.string()
    .min(1, 'Gatunek jest wymagany')
    .max(50, 'Gatunek nie może przekraczać 50 znaków')
    .trim(),

  breed: z.string()
    .max(50, 'Rasa nie może przekraczać 50 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  sex: z.enum(['male', 'female', 'unknown'])
    .optional(),

  dateOfBirth: z.string()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, 'Data urodzenia nie może być w przyszłości')
    .optional()
    .or(z.literal('')),

  weight: z.number()
    .positive('Waga musi być większa od 0')
    .max(1000, 'Waga nie może przekraczać 1000 kg')
    .optional(),

  microchipNumber: z.string()
    .max(50, 'Numer microchipa nie może przekraczać 50 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  notes: z.string()
    .max(1000, 'Notatki nie mogą przekraczać 1000 znaków')
    .trim()
    .optional()
    .or(z.literal('')),
});

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPetDialogOpen, setIsPetDialogOpen] = useState(false);
  const [isEditPetDialogOpen, setIsEditPetDialogOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<number | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<UpdateClientData>({});
  const [newPet, setNewPet] = useState<CreatePetData>({
    ownerId: Number(id),
    name: "",
    species: "",
    breed: "",
    sex: "unknown",
    dateOfBirth: "",
    weight: undefined,
    microchipNumber: "",
    notes: "",
  });
  const [editingPet, setEditingPet] = useState<UpdatePetData & { id: number } | null>(null);
  const [showCustomSpeciesAdd, setShowCustomSpeciesAdd] = useState(false);
  const [customSpeciesAdd, setCustomSpeciesAdd] = useState("");
  const [showCustomSpeciesEdit, setShowCustomSpeciesEdit] = useState(false);
  const [customSpeciesEdit, setCustomSpeciesEdit] = useState("");

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: petsData, isLoading: petsLoading } = useQuery({
    queryKey: ['pets', 'client', id],
    queryFn: () => petsService.getAll({ ownerId: Number(id) }),
    enabled: !!id,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', 'client', id],
    queryFn: async () => {
      const pets = petsData?.data || [];
      if (pets.length === 0) return { data: [] };

      const allAppointments = await Promise.all(
        pets.map(pet => appointmentsService.getAll({ petId: pet.id, limit: 100 }))
      );

      const combinedAppointments = allAppointments.flatMap(result => result.data);

      combinedAppointments.sort((a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      );

      return { data: combinedAppointments };
    },
    enabled: !!petsData,
  });

  const updateClientMutation = useMutation({
    mutationFn: (data: UpdateClientData) => clientsService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: "Sukces", description: "Dane klienta zostały zaktualizowane" });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować danych",
        variant: "destructive",
      });
    },
  });

  const createPetMutation = useMutation({
    mutationFn: (data: CreatePetData) => petsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets', 'client', id] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: "Sukces", description: "Pupil został dodany pomyślnie" });
      setIsPetDialogOpen(false);
      setNewPet({
        ownerId: Number(id),
        name: "",
        species: "",
        breed: "",
        sex: "unknown",
        dateOfBirth: "",
        weight: undefined,
        microchipNumber: "",
        notes: "",
      });
      setShowCustomSpeciesAdd(false);
      setCustomSpeciesAdd("");
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się dodać pupila",
        variant: "destructive",
      });
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: ({ id: petId, data }: { id: number; data: UpdatePetData }) =>
      petsService.update(petId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets', 'client', id] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: "Sukces", description: "Dane pupila zostały zaktualizowane" });
      setIsEditPetDialogOpen(false);
      setEditingPet(null);
      setShowCustomSpeciesEdit(false);
      setCustomSpeciesEdit("");
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się zaktualizować danych pupila",
        variant: "destructive",
      });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: (petId: number) => petsService.delete(petId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets', 'client', id] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast({ title: "Sukces", description: "Pupil został usunięty" });
      setPetToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.response?.data?.error || "Nie udało się usunąć pupila",
        variant: "destructive",
      });
    },
  });

  const handleUpdateClient = () => {
    const hasChanges =
      editData.firstName !== undefined ||
      editData.lastName !== undefined ||
      editData.phone !== undefined ||
      editData.address !== undefined ||
      editData.notes !== undefined;

    if (!hasChanges) {
      toast({
        title: "Brak zmian",
        description: "Wprowadź przynajmniej jedną zmianę",
      });
      return;
    }
    updateClientMutation.mutate(editData);
  };

  const handleAddPet = () => {
    const petData = {
      ...newPet,
      species: newPet.species === 'other' ? customSpeciesAdd : newPet.species
    };

    const validationResult = validateAndSanitize(createPetSchema, petData);

    if (!validationResult.success) {
      const firstError = validationResult.errors.errors[0];
      toast({
        title: "Błąd walidacji",
        description: firstError.message || "Wypełnij wszystkie wymagane pola poprawnie",
        variant: "destructive",
      });

      if (import.meta.env.DEV) {
        console.error('Validation errors:', validationResult.errors.errors);
      }
      return;
    }

    createPetMutation.mutate(validationResult.data);
  };

  const handleEditPet = (pet: any) => {
    let formattedDate = "";
    if (pet.date_of_birth) {
      if (import.meta.env.DEV) {
        console.log('Original date from backend:', pet.date_of_birth);
      }

      formattedDate = pet.date_of_birth.substring(0, 10);

      if (import.meta.env.DEV) {
        console.log('Formatted date for input:', formattedDate);
      }
    }

    const isCustomSpecies = !isPredefinedSpecies(pet.species);

    setEditingPet({
      id: pet.id,
      name: pet.name,
      species: isCustomSpecies ? 'other' : pet.species,
      breed: pet.breed || "",
      sex: pet.sex,
      dateOfBirth: formattedDate,
      weight: pet.weight || undefined,
      microchipNumber: pet.microchip_number || "",
      notes: pet.notes || "",
    });

    if (isCustomSpecies) {
      setCustomSpeciesEdit(pet.species);
      setShowCustomSpeciesEdit(true);
    } else {
      setCustomSpeciesEdit("");
      setShowCustomSpeciesEdit(false);
    }

    setIsEditPetDialogOpen(true);
  };

  const handleUpdatePet = () => {
    if (!editingPet) return;

    const { id: petId, ...petData } = editingPet;

    const finalPetData = {
      ...petData,
      species: petData.species === 'other' ? customSpeciesEdit : petData.species
    };

    const validationResult = validateAndSanitize(createPetSchema, {
      ...finalPetData,
      ownerId: Number(id), // Add ownerId for validation
    });

    if (!validationResult.success) {
      const firstError = validationResult.errors.errors[0];
      toast({
        title: "Błąd walidacji",
        description: firstError.message || "Wypełnij wszystkie wymagane pola poprawnie",
        variant: "destructive",
      });

      if (import.meta.env.DEV) {
        console.error('Validation errors:', validationResult.errors.errors);
      }
      return;
    }

    const { ownerId, ...updateData } = validationResult.data;
    updatePetMutation.mutate({ id: petId, data: updateData });
  };

  const handleDeletePet = (petId: number) => {
    deletePetMutation.mutate(petId);
  };

  const handleViewAppointmentDetails = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedAppointmentId(null);
  };

  const pets = petsData?.data || [];
  const appointments = appointmentsData?.data || [];

  const now = new Date();
  const pastAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at);
    return apt.status === 'completed' || aptDate < now;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "proposed": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "in_progress": return "bg-purple-500";
      case "completed": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      case "cancelled_late": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "proposed": return "Zaproponowana";
      case "confirmed": return "Potwierdzona";
      case "in_progress": return "W trakcie";
      case "completed": return "Zakończona";
      case "cancelled": return "Anulowana";
      case "cancelled_late": return "Anulowana (późno)";
      default: return status;
    }
  };

  if (clientLoading) {
    return (
      <AppLayout role="receptionist">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (clientError || !client) {
    return (
      <AppLayout role="receptionist">
        <div className="p-8">
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Błąd ładowania
              </h3>
              <p className="text-muted-foreground mb-4">
                Nie udało się załadować danych klienta
              </p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="receptionist">
      <div className="p-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-muted-foreground">
              Klient od {new Date(client.created_at).toLocaleDateString("pl-PL")}
            </p>
          </div>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edytuj dane
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edytuj dane klienta</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imię</Label>
                    <Input
                      defaultValue={client.first_name}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nazwisko</Label>
                    <Input
                      defaultValue={client.last_name}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      defaultValue={client.phone}
                      onChange={(e) => {
                        let rawValue = e.target.value.replace(/\D/g, '');

                        if (rawValue.startsWith('48')) {
                          rawValue = rawValue.substring(2);
                        }

                        rawValue = rawValue.substring(0, 9);

                        let formattedValue = '';
                        if (rawValue.length > 0) {
                          formattedValue = '+48';
                          if (rawValue.length > 0) formattedValue += ' ' + rawValue.substring(0, 3);
                          if (rawValue.length > 3) formattedValue += ' ' + rawValue.substring(3, 6);
                          if (rawValue.length > 6) formattedValue += ' ' + rawValue.substring(6, 9);
                        }

                        e.target.value = formattedValue;
                        setEditData({ ...editData, phone: formattedValue });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adres</Label>
                    <Input
                      defaultValue={client.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Uwagi</Label>
                  <Input
                    defaultValue={client.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleUpdateClient} disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacje kontaktowe</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
              {client.address && (
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="pets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pets">Pupile ({pets.length})</TabsTrigger>
              <TabsTrigger value="appointments">Historia wizyt ({pastAppointments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pets" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isPetDialogOpen} onOpenChange={setIsPetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj pupila
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Dodaj nowego pupila</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Imię pupila *</Label>
                          <Input
                            value={newPet.name}
                            onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                            placeholder="np. Burek"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gatunek *</Label>
                          <Select
                            value={newPet.species}
                            onValueChange={(value) => {
                              setNewPet({ ...newPet, species: value });
                              setShowCustomSpeciesAdd(value === 'other');
                              if (value !== 'other') {
                                setCustomSpeciesAdd("");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz gatunek" />
                            </SelectTrigger>
                            <SelectContent>
                              {PET_SPECIES.map((species) => (
                                <SelectItem key={species.value} value={species.value}>
                                  {species.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {showCustomSpeciesAdd && (
                            <Input
                              value={customSpeciesAdd}
                              onChange={(e) => setCustomSpeciesAdd(e.target.value)}
                              placeholder="Wpisz gatunek zwierzęcia"
                              className="mt-2"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Rasa</Label>
                          <Input
                            value={newPet.breed}
                            onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                            placeholder="np. Owczarek niemiecki"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data urodzenia</Label>
                          <Input
                            type="date"
                            value={newPet.dateOfBirth}
                            onChange={(e) => setNewPet({ ...newPet, dateOfBirth: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Płeć</Label>
                          <Select
                            value={newPet.sex}
                            onValueChange={(value: "male" | "female" | "unknown") => setNewPet({ ...newPet, sex: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Samiec</SelectItem>
                              <SelectItem value="female">Samica</SelectItem>
                              <SelectItem value="unknown">Nieznana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Waga (kg)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newPet.weight || ""}
                            onChange={(e) => setNewPet({ ...newPet, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="np. 5.5"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Numer microchipa</Label>
                          <Input
                            value={newPet.microchipNumber}
                            onChange={(e) => setNewPet({ ...newPet, microchipNumber: e.target.value })}
                            placeholder="np. PL123456789"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Uwagi</Label>
                          <Input
                            value={newPet.notes}
                            onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                            placeholder="Dodatkowe informacje"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsPetDialogOpen(false)}>
                        Anuluj
                      </Button>
                      <Button onClick={handleAddPet} disabled={createPetMutation.isPending}>
                        {createPetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Dodaj pupila
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {petsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {pets.map((pet) => (
                    <Card key={pet.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-5 w-5 text-primary" />
                            <CardTitle>{pet.name}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPet(pet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPetToDelete(pet.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gatunek:</span>
                          <span className="text-sm font-medium">{pet.species}</span>
                        </div>
                        {pet.breed && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Rasa:</span>
                            <span className="text-sm font-medium">{pet.breed}</span>
                          </div>
                        )}
                        {pet.date_of_birth && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Data urodzenia:</span>
                            <span className="text-sm font-medium">
                              {(() => {
                                const dateStr = pet.date_of_birth.substring(0, 10);
                                const [year, month, day] = dateStr.split('-');
                                return `${day}.${month}.${year}`;
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Płeć:</span>
                          <span className="text-sm font-medium">
                            {pet.sex === 'male' ? 'Samiec' : pet.sex === 'female' ? 'Samica' : 'Nieznana'}
                          </span>
                        </div>
                        {pet.weight && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Waga:</span>
                            <span className="text-sm font-medium">{pet.weight} kg</span>
                          </div>
                        )}
                        {pet.microchip_number && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Microchip:</span>
                            <span className="text-sm font-medium">{pet.microchip_number}</span>
                          </div>
                        )}
                        {pet.notes && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Uwagi:</span>
                            <span className="text-sm font-medium">{pet.notes}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Brak pupili. Dodaj pierwszego pupila używając przycisku powyżej.
                </p>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  {pastAppointments.length > 0 ? (
                    <div className="divide-y">
                      {pastAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-4 hover:bg-muted/50 hover:shadow-md cursor-pointer transition-all group"
                          onClick={() => handleViewAppointmentDetails(apt.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {new Date(apt.scheduled_at).toLocaleDateString("pl-PL")} o{" "}
                                  {new Date(apt.scheduled_at).toLocaleTimeString("pl-PL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <Badge className={getStatusColor(apt.status)}>
                                  {getStatusText(apt.status)}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {apt.pet_name} - {apt.reason || "Wizyta"} - {apt.doctor_name}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAppointmentDetails(apt.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Zobacz
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Brak historii wizyt
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEditPetDialogOpen} onOpenChange={setIsEditPetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj pupila</DialogTitle>
          </DialogHeader>
          {editingPet && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imię *</Label>
                  <Input
                    value={editingPet.name}
                    onChange={(e) => setEditingPet({ ...editingPet, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gatunek *</Label>
                  <Select
                    value={editingPet.species}
                    onValueChange={(value) => {
                      setEditingPet({ ...editingPet, species: value });
                      setShowCustomSpeciesEdit(value === 'other');
                      if (value !== 'other') {
                        setCustomSpeciesEdit("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PET_SPECIES.map((species) => (
                        <SelectItem key={species.value} value={species.value}>
                          {species.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showCustomSpeciesEdit && (
                    <Input
                      value={customSpeciesEdit}
                      onChange={(e) => setCustomSpeciesEdit(e.target.value)}
                      placeholder="Wpisz gatunek zwierzęcia"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rasa</Label>
                  <Input
                    value={editingPet.breed}
                    onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data urodzenia</Label>
                  <Input
                    type="date"
                    value={editingPet.dateOfBirth}
                    onChange={(e) => setEditingPet({ ...editingPet, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Płeć</Label>
                  <Select
                    value={editingPet.sex}
                    onValueChange={(value: "male" | "female" | "unknown") =>
                      setEditingPet({ ...editingPet, sex: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Samiec</SelectItem>
                      <SelectItem value="female">Samica</SelectItem>
                      <SelectItem value="unknown">Nieznana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Waga (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingPet.weight || ""}
                    onChange={(e) => setEditingPet({ ...editingPet, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="np. 5.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Numer microchipa</Label>
                <Input
                  value={editingPet.microchipNumber}
                  onChange={(e) => setEditingPet({ ...editingPet, microchipNumber: e.target.value })}
                  placeholder="np. PL123456789"
                />
              </div>
              <div className="space-y-2">
                <Label>Uwagi</Label>
                <Textarea
                  value={editingPet.notes}
                  onChange={(e) => setEditingPet({ ...editingPet, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditPetDialogOpen(false);
                    setEditingPet(null);
                    setShowCustomSpeciesEdit(false);
                    setCustomSpeciesEdit("");
                  }}
                >
                  Anuluj
                </Button>
                <Button onClick={handleUpdatePet} disabled={updatePetMutation.isPending}>
                  {updatePetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={petToDelete !== null} onOpenChange={() => setPetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tego pupila?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Wszystkie dane dotyczące tego pupila zostaną
              trwale usunięte, w tym historia wizyt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => petToDelete && handleDeletePet(petToDelete)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deletePetMutation.isPending}
            >
              {deletePetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        isOpen={isDetailsDialogOpen}
        onClose={handleCloseDetailsDialog}
      />
    </AppLayout>
  );
}