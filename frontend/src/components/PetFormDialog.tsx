import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { petsService, type Pet, type UpdatePetData, type CreatePetByClientData } from "@/services/pets.service";
import { useToast } from "@/hooks/use-toast";
import { Dog, Cat, Loader2 } from "lucide-react";

interface PetFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: Pet | null; // If provided, we're editing; if null, we're creating
}

const SPECIES_OPTIONS = [
  { value: "Pies", label: "Pies", icon: Dog },
  { value: "Kot", label: "Kot", icon: Cat },
  { value: "Krolik", label: "Krolik" },
  { value: "Chomik", label: "Chomik" },
  { value: "Swinkamorska", label: "Swinka morska" },
  { value: "Ptak", label: "Ptak" },
  { value: "Gad", label: "Gad" },
  { value: "Inne", label: "Inne" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Samiec" },
  { value: "female", label: "Samica" },
  { value: "unknown", label: "Nieznana" },
];

export function PetFormDialog({ isOpen, onClose, pet }: PetFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!pet;

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "unknown">("unknown");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (pet) {
      setName(pet.name || "");
      setSpecies(pet.species || "");
      setBreed(pet.breed || "");
      setSex(pet.sex || "unknown");
      setDateOfBirth(pet.date_of_birth ? pet.date_of_birth.split("T")[0] : "");
      setWeight(pet.weight?.toString() || "");
      setMicrochipNumber(pet.microchip_number || "");
      setNotes(pet.notes || "");
    } else {
      // Reset form for new pet
      setName("");
      setSpecies("");
      setBreed("");
      setSex("unknown");
      setDateOfBirth("");
      setWeight("");
      setMicrochipNumber("");
      setNotes("");
    }
  }, [pet, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePetByClientData) => petsService.createByClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      toast({
        title: "Sukces",
        description: "Zwierze zostalo dodane",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Blad",
        description: error.response?.data?.error || "Nie udalo sie dodac zwierzecia",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePetData }) =>
      petsService.updateByClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      toast({
        title: "Sukces",
        description: "Dane zwierzecia zostaly zaktualizowane",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Blad",
        description: error.response?.data?.error || "Nie udalo sie zaktualizowac danych",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !species) {
      toast({
        title: "Blad",
        description: "Imie i gatunek sa wymagane",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      sex,
      dateOfBirth: dateOfBirth || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      microchipNumber: microchipNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing && pet) {
      updateMutation.mutate({ id: pet.id, data });
    } else {
      createMutation.mutate(data as CreatePetByClientData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5" />
            {isEditing ? "Edytuj zwierze" : "Dodaj nowe zwierze"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Zaktualizuj dane swojego zwierzecia"
              : "Wypelnij formularz, aby dodac nowe zwierze"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Imie *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Burek"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="species">Gatunek *</Label>
              <Select value={species} onValueChange={setSpecies}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz gatunek" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Rasa</Label>
              <Input
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="np. Owczarek niemiecki"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Plec</Label>
              <Select value={sex} onValueChange={(v) => setSex(v as "male" | "female" | "unknown")}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz plec" />
                </SelectTrigger>
                <SelectContent>
                  {SEX_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Data urodzenia</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Waga (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="np. 12.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microchipNumber">Numer mikroczipu</Label>
            <Input
              id="microchipNumber"
              value={microchipNumber}
              onChange={(e) => setMicrochipNumber(e.target.value)}
              placeholder="np. 123456789012345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Dodatkowe informacje</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergie, szczegolne potrzeby, uwagi..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Zapisywanie..." : "Dodawanie..."}
                </>
              ) : isEditing ? (
                "Zapisz zmiany"
              ) : (
                "Dodaj zwierze"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
