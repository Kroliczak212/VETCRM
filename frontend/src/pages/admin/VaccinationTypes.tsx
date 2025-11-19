import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  vaccinationTypesService,
  type VaccinationType,
  type CreateVaccinationTypeData,
  type UpdateVaccinationTypeData,
} from "@/services/vaccination-types.service";
import { Badge } from "@/components/ui/badge";

const SPECIES_OPTIONS = [
  { value: 'wszystkie', label: 'Wszystkie gatunki' },
  { value: 'pies', label: 'Pies' },
  { value: 'kot', label: 'Kot' },
  { value: 'gryzoń', label: 'Gryzoń' },
  { value: 'ptak', label: 'Ptak' },
  { value: 'inne', label: 'Inne' },
];

const VaccinationTypes = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const [newType, setNewType] = useState<Partial<CreateVaccinationTypeData>>({
    name: "",
    species: "wszystkie",
    description: "",
    recommendedIntervalMonths: undefined,
    isRequired: false,
    displayOrder: 999,
  });

  const [editType, setEditType] = useState<Partial<UpdateVaccinationTypeData>>({});

  // Fetch vaccination types
  const { data: typesData, isLoading } = useQuery({
    queryKey: ['vaccination-types', 'admin'],
    queryFn: () => vaccinationTypesService.getAll({ limit: 100 }),
  });

  // Create type mutation
  const createTypeMutation = useMutation({
    mutationFn: (data: CreateVaccinationTypeData) => vaccinationTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccination-types'] });
      toast.success("Typ szczepienia został dodany");
      setIsDialogOpen(false);
      setNewType({
        name: "",
        species: "wszystkie",
        description: "",
        recommendedIntervalMonths: undefined,
        isRequired: false,
        displayOrder: 999,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się dodać typu szczepienia");
    },
  });

  // Update type mutation
  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVaccinationTypeData }) =>
      vaccinationTypesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccination-types'] });
      toast.success("Typ szczepienia został zaktualizowany");
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się zaktualizować typu szczepienia");
    },
  });

  // Delete (deactivate) type mutation
  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => vaccinationTypesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccination-types'] });
      toast.success("Typ szczepienia został dezaktywowany");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się dezaktywować typu szczepienia");
    },
  });

  const types = typesData?.data || [];

  const handleAddType = () => {
    if (!newType.name) {
      toast.error("Nazwa jest wymagana");
      return;
    }
    createTypeMutation.mutate(newType as CreateVaccinationTypeData);
  };

  const handleEditClick = (type: VaccinationType) => {
    setSelectedTypeId(type.id);
    setEditType({
      name: type.name,
      species: type.species,
      description: type.description || "",
      recommendedIntervalMonths: type.recommended_interval_months || undefined,
      isRequired: type.is_required,
      isActive: type.is_active,
      displayOrder: type.display_order,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateType = () => {
    if (!selectedTypeId) return;
    updateTypeMutation.mutate({ id: selectedTypeId, data: editType as UpdateVaccinationTypeData });
  };

  const handleDeleteType = (id: number, name: string) => {
    if (confirm(`Czy na pewno chcesz dezaktywować typ szczepienia: "${name}"?`)) {
      deleteTypeMutation.mutate(id);
    }
  };

  // Sort by species, then display_order
  const sortedTypes = [...types].sort((a, b) => {
    if (a.species !== b.species) {
      return a.species.localeCompare(b.species);
    }
    return a.display_order - b.display_order;
  });

  // Group by species
  const groupedTypes = sortedTypes.reduce((acc: any, type: VaccinationType) => {
    if (!acc[type.species]) {
      acc[type.species] = [];
    }
    acc[type.species].push(type);
    return acc;
  }, {});

  const getSpeciesLabel = (species: string) => {
    const option = SPECIES_OPTIONS.find(opt => opt.value === species);
    return option?.label || species;
  };

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Typy szczepień</h1>
            <p className="text-muted-foreground">Zarządzaj typami szczepień dla różnych gatunków</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj typ szczepienia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj nowy typ szczepienia</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nazwa *</Label>
                  <Input
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="np. Wścieklizna, DHLPP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gatunek</Label>
                  <Select
                    value={newType.species}
                    onValueChange={(value: any) => setNewType({ ...newType, species: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    placeholder="Opcjonalny opis"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zalecany interwał (miesiące)</Label>
                  <Input
                    type="number"
                    value={newType.recommendedIntervalMonths || ""}
                    onChange={(e) =>
                      setNewType({
                        ...newType,
                        recommendedIntervalMonths: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="np. 12"
                  />
                  <p className="text-xs text-muted-foreground">Odstęp czasu między szczepieniami</p>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="is-required">Szczepienie obowiązkowe?</Label>
                  <Switch
                    id="is-required"
                    checked={newType.isRequired}
                    onCheckedChange={(checked) => setNewType({ ...newType, isRequired: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kolejność wyświetlania</Label>
                  <Input
                    type="number"
                    value={newType.displayOrder}
                    onChange={(e) => setNewType({ ...newType, displayOrder: parseInt(e.target.value) })}
                    placeholder="999"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleAddType} disabled={createTypeMutation.isPending}>
                  {createTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Dodaj
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedTypes).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedTypes).map(([species, speciesTypes]: [string, any]) => (
              <Card key={species}>
                <CardHeader>
                  <CardTitle>{getSpeciesLabel(species)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {speciesTypes.map((type: VaccinationType) => (
                      <div key={type.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{type.name}</p>
                            {type.is_required && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                Obowiązkowe
                              </Badge>
                            )}
                            {type.is_active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          )}
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            {type.recommended_interval_months && (
                              <span>Interwał: {type.recommended_interval_months} mies.</span>
                            )}
                            <span>Kolejność: {type.display_order}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(type)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {type.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteType(type.id, type.name)}
                              disabled={deleteTypeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">
            Brak typów szczepień. Dodaj pierwszy typ szczepienia.
          </p>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj typ szczepienia</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nazwa</Label>
                <Input
                  value={editType.name}
                  onChange={(e) => setEditType({ ...editType, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gatunek</Label>
                <Select
                  value={editType.species}
                  onValueChange={(value: any) => setEditType({ ...editType, species: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-2">
                <Label>Opis</Label>
                <Textarea
                  value={editType.description}
                  onChange={(e) => setEditType({ ...editType, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Zalecany interwał (miesiące)</Label>
                <Input
                  type="number"
                  value={editType.recommendedIntervalMonths || ""}
                  onChange={(e) =>
                    setEditType({
                      ...editType,
                      recommendedIntervalMonths: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="edit-is-required">Szczepienie obowiązkowe?</Label>
                <Switch
                  id="edit-is-required"
                  checked={editType.isRequired}
                  onCheckedChange={(checked) => setEditType({ ...editType, isRequired: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="edit-is-active">Aktywny</Label>
                <Switch
                  id="edit-is-active"
                  checked={editType.isActive}
                  onCheckedChange={(checked) => setEditType({ ...editType, isActive: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kolejność wyświetlania</Label>
                <Input
                  type="number"
                  value={editType.displayOrder}
                  onChange={(e) => setEditType({ ...editType, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUpdateType} disabled={updateTypeMutation.isPending}>
                {updateTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default VaccinationTypes;
