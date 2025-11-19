import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  appointmentReasonsService,
  type AppointmentReason,
  type CreateAppointmentReasonData,
  type UpdateAppointmentReasonData,
} from "@/services/appointment-reasons.service";
import { Badge } from "@/components/ui/badge";

const AppointmentReasons = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);

  const [newReason, setNewReason] = useState<Partial<CreateAppointmentReasonData>>({
    name: "",
    description: "",
    isVaccination: false,
    displayOrder: 999,
  });

  const [editReason, setEditReason] = useState<Partial<UpdateAppointmentReasonData>>({});

  // Fetch appointment reasons
  const { data: reasonsData, isLoading } = useQuery({
    queryKey: ['appointment-reasons', 'admin'],
    queryFn: () => appointmentReasonsService.getAll({ limit: 100 }),
  });

  // Create reason mutation
  const createReasonMutation = useMutation({
    mutationFn: (data: CreateAppointmentReasonData) => appointmentReasonsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-reasons'] });
      toast.success("Powód wizyty został dodany");
      setIsDialogOpen(false);
      setNewReason({ name: "", description: "", isVaccination: false, displayOrder: 999 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się dodać powodu wizyty");
    },
  });

  // Update reason mutation
  const updateReasonMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAppointmentReasonData }) =>
      appointmentReasonsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-reasons'] });
      toast.success("Powód wizyty został zaktualizowany");
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się zaktualizować powodu wizyty");
    },
  });

  // Delete (deactivate) reason mutation
  const deleteReasonMutation = useMutation({
    mutationFn: (id: number) => appointmentReasonsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-reasons'] });
      toast.success("Powód wizyty został dezaktywowany");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się dezaktywować powodu wizyty");
    },
  });

  const reasons = reasonsData?.data || [];

  const handleAddReason = () => {
    if (!newReason.name) {
      toast.error("Nazwa jest wymagana");
      return;
    }
    createReasonMutation.mutate(newReason as CreateAppointmentReasonData);
  };

  const handleEditClick = (reason: AppointmentReason) => {
    setSelectedReasonId(reason.id);
    setEditReason({
      name: reason.name,
      description: reason.description || "",
      isVaccination: reason.is_vaccination,
      isActive: reason.is_active,
      displayOrder: reason.display_order,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateReason = () => {
    if (!selectedReasonId) return;
    updateReasonMutation.mutate({ id: selectedReasonId, data: editReason as UpdateAppointmentReasonData });
  };

  const handleDeleteReason = (id: number, name: string) => {
    if (confirm(`Czy na pewno chcesz dezaktywować powód wizyty: "${name}"?`)) {
      deleteReasonMutation.mutate(id);
    }
  };

  // Sort by display_order
  const sortedReasons = [...reasons].sort((a, b) => a.display_order - b.display_order);

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Powody wizyt</h1>
            <p className="text-muted-foreground">Zarządzaj powodami wizyt i szczepień</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj powód wizyty
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj nowy powód wizyty</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nazwa *</Label>
                  <Input
                    value={newReason.name}
                    onChange={(e) => setNewReason({ ...newReason, name: e.target.value })}
                    placeholder="np. Szczepienie, Kontrola"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Textarea
                    value={newReason.description}
                    onChange={(e) => setNewReason({ ...newReason, description: e.target.value })}
                    placeholder="Opcjonalny opis"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="is-vaccination">Czy to szczepienie?</Label>
                  <Switch
                    id="is-vaccination"
                    checked={newReason.isVaccination}
                    onCheckedChange={(checked) => setNewReason({ ...newReason, isVaccination: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kolejność wyświetlania</Label>
                  <Input
                    type="number"
                    value={newReason.displayOrder}
                    onChange={(e) => setNewReason({ ...newReason, displayOrder: parseInt(e.target.value) })}
                    placeholder="999"
                  />
                  <p className="text-xs text-muted-foreground">Niższe wartości są wyświetlane wyżej na liście</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleAddReason} disabled={createReasonMutation.isPending}>
                  {createReasonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        ) : sortedReasons.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Lista powodów wizyt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedReasons.map((reason) => (
                  <div key={reason.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{reason.name}</p>
                        {reason.is_vaccination && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            Szczepienie
                          </Badge>
                        )}
                        {reason.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {reason.description && (
                        <p className="text-sm text-muted-foreground">{reason.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Kolejność: {reason.display_order}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(reason)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {reason.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReason(reason.id, reason.name)}
                          disabled={deleteReasonMutation.isPending}
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
        ) : (
          <p className="text-center text-muted-foreground py-12">Brak powodów wizyt. Dodaj pierwszy powód.</p>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj powód wizyty</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nazwa</Label>
                <Input
                  value={editReason.name}
                  onChange={(e) => setEditReason({ ...editReason, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Textarea
                  value={editReason.description}
                  onChange={(e) => setEditReason({ ...editReason, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="edit-is-vaccination">Czy to szczepienie?</Label>
                <Switch
                  id="edit-is-vaccination"
                  checked={editReason.isVaccination}
                  onCheckedChange={(checked) => setEditReason({ ...editReason, isVaccination: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="edit-is-active">Aktywny</Label>
                <Switch
                  id="edit-is-active"
                  checked={editReason.isActive}
                  onCheckedChange={(checked) => setEditReason({ ...editReason, isActive: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kolejność wyświetlania</Label>
                <Input
                  type="number"
                  value={editReason.displayOrder}
                  onChange={(e) => setEditReason({ ...editReason, displayOrder: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUpdateReason} disabled={updateReasonMutation.isPending}>
                {updateReasonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AppointmentReasons;
