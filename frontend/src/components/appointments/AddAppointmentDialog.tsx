import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { appointmentFormSchema, validateAndSanitize } from "@/lib/validation";
import type { CreateAppointmentData } from "@/services/appointments.service";
import type { User } from "@/services/users.service";
import type { Client } from "@/services/clients.service";
import type { Pet } from "@/services/pets.service";
import type { AppointmentReason } from "@/services/appointment-reasons.service";
import type { VaccinationType } from "@/services/vaccination-types.service";

interface AddAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newAppointment: Partial<CreateAppointmentData>;
  setNewAppointment: (data: Partial<CreateAppointmentData>) => void;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  selectedSlot: string;
  setSelectedSlot: (slot: string) => void;
  selectedPetSpecies: string;
  setSelectedPetSpecies: (species: string) => void;
  selectedReasonIsVaccination: boolean;
  setSelectedReasonIsVaccination: (isVacc: boolean) => void;
  doctors: User[];
  clients: Client[];
  pets: Pet[];
  appointmentReasons: AppointmentReason[];
  vaccinationTypes: VaccinationType[];
  availableSlots?: { time: string; available: boolean }[];
  slotsLoading: boolean;
  isCreating: boolean;
  onSubmit: (data: CreateAppointmentData) => void;
}

export function AddAppointmentDialog({
  isOpen,
  onOpenChange,
  newAppointment,
  setNewAppointment,
  selectedClient,
  setSelectedClient,
  selectedSlot,
  setSelectedSlot,
  selectedPetSpecies,
  setSelectedPetSpecies,
  selectedReasonIsVaccination,
  setSelectedReasonIsVaccination,
  doctors,
  clients,
  pets,
  appointmentReasons,
  vaccinationTypes,
  availableSlots,
  slotsLoading,
  isCreating,
  onSubmit,
}: AddAppointmentDialogProps) {
  const selectedDateForSlots = newAppointment.scheduledAt?.split('T')[0] || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = validateAndSanitize(appointmentFormSchema, newAppointment);

    if (!validationResult.success) {
      const firstError = validationResult.errors.errors[0];
      toast.error(firstError.message || "Wypełnij wszystkie wymagane pola poprawnie");

      if (import.meta.env.DEV) {
        console.error('Validation errors:', validationResult.errors.errors);
      }
      return;
    }

    onSubmit(validationResult.data as CreateAppointmentData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedSlot("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="medical" size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Umów Wizytę
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Umów Nową Wizytę</DialogTitle>
          <DialogDescription>
            Wypełnij formularz, aby umówić wizytę dla klienta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Klient *</Label>
              <Select
                value={selectedClient}
                onValueChange={(value) => {
                  setSelectedClient(value);
                  setNewAppointment({ ...newAppointment, petId: 0 });
                }}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet">Pupil *</Label>
              <Select
                value={newAppointment.petId?.toString() || ""}
                onValueChange={(value) => {
                  const selectedPet = pets.find(p => p.id === Number(value));
                  setNewAppointment({ ...newAppointment, petId: Number(value), vaccinationTypeId: undefined });
                  setSelectedPetSpecies(selectedPet?.species || "");
                }}
                disabled={!selectedClient}
              >
                <SelectTrigger id="pet">
                  <SelectValue placeholder={!selectedClient ? "Najpierw wybierz klienta" : "Wybierz pupila"} />
                </SelectTrigger>
                <SelectContent>
                  {pets.length > 0 ? (
                    pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} ({pet.species})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Brak pupili
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor">Lekarz *</Label>
              <Select
                value={newAppointment.doctorId?.toString() || ""}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, doctorId: Number(value) })}
              >
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Wybierz lekarza" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonId">Powód wizyty</Label>
              <Select
                value={newAppointment.reasonId?.toString() || ""}
                onValueChange={(value) => {
                  if (value === "none") {
                    setNewAppointment({ ...newAppointment, reasonId: undefined, vaccinationTypeId: undefined });
                    setSelectedReasonIsVaccination(false);
                  } else {
                    const selectedReason = appointmentReasons.find(r => r.id === Number(value));
                    setNewAppointment({
                      ...newAppointment,
                      reasonId: Number(value),
                      vaccinationTypeId: undefined
                    });
                    setSelectedReasonIsVaccination(!!selectedReason?.is_vaccination);
                  }
                }}
              >
                <SelectTrigger id="reasonId">
                  <SelectValue placeholder="Wybierz powód wizyty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak / Inny</SelectItem>
                  {appointmentReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id.toString()}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedReasonIsVaccination && selectedPetSpecies && (
            <div className="space-y-2">
              <Label htmlFor="vaccinationTypeId">Typ szczepienia *</Label>
              <Select
                value={newAppointment.vaccinationTypeId?.toString() || ""}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, vaccinationTypeId: Number(value) })}
              >
                <SelectTrigger id="vaccinationTypeId">
                  <SelectValue placeholder="Wybierz typ szczepienia" />
                </SelectTrigger>
                <SelectContent>
                  {vaccinationTypes.length > 0 ? (
                    vaccinationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                        {type.recommended_interval_months && ` (co ${type.recommended_interval_months} mies.)`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Brak dostępnych typów szczepień dla tego gatunku
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {vaccinationTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Brak szczepień dla gatunku "{selectedPetSpecies}"
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data wizyty *</Label>
            <Input
              id="date"
              type="date"
              value={newAppointment.scheduledAt?.split('T')[0] || ""}
              onChange={(e) => {
                setNewAppointment({
                  ...newAppointment,
                  scheduledAt: e.target.value ? `${e.target.value}T09:00:00.000Z` : "",
                });
                setSelectedSlot("");
              }}
              disabled={!newAppointment.doctorId}
              min={new Date().toISOString().split('T')[0]}
            />
            {!newAppointment.doctorId && (
              <p className="text-xs text-muted-foreground">
                Najpierw wybierz lekarza
              </p>
            )}
          </div>

          {newAppointment.doctorId && selectedDateForSlots && (
            <div className="space-y-2">
              <Label>Dostępne godziny *</Label>
              {slotsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={selectedSlot === slot.time ? "default" : "outline"}
                      className={`h-auto py-2 ${
                        !slot.available
                          ? "opacity-50 cursor-not-allowed bg-destructive/10 hover:bg-destructive/10"
                          : selectedSlot === slot.time
                          ? "bg-primary"
                          : "hover:bg-primary/10"
                      }`}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedSlot(slot.time);
                        const currentDate = newAppointment.scheduledAt?.split('T')[0];
                        setNewAppointment({
                          ...newAppointment,
                          scheduledAt: `${currentDate}T${slot.time}:00.000Z`,
                        });
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-medium">{slot.time}</span>
                        {!slot.available && (
                          <span className="text-[10px] text-destructive">Zajęte</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Lekarz nie pracuje w tym dniu lub brak dostępnych slotów
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Lokalizacja</Label>
              <Input
                id="location"
                placeholder="np. Gabinet 1"
                value={newAppointment.location || ""}
                onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button type="submit" variant="medical" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Umów wizytę
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
