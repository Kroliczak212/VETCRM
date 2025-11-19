import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesService, type CreateServiceData, type UpdateServiceData } from "@/services/services.service";

const Pricing = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const [newService, setNewService] = useState<Partial<CreateServiceData>>({
    name: "",
    category: "",
    price: 0,
    durationMinutes: 30,
    description: "",
  });

  const [editService, setEditService] = useState<Partial<UpdateServiceData>>({});

  // Fetch services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesService.getAll({ limit: 100 }),
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (data: CreateServiceData) => servicesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Usługa została dodana");
      setIsDialogOpen(false);
      setNewService({ name: "", category: "", price: 0, durationMinutes: 30, description: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się dodać usługi");
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateServiceData }) => servicesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Usługa została zaktualizowana");
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się zaktualizować usługi");
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) => servicesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Usługa została usunięta");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Nie udało się usunąć usługi");
    },
  });

  const services = servicesData?.data || [];

  const handleAddService = () => {
    if (!newService.name || !newService.category || !newService.price) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }
    createServiceMutation.mutate(newService as CreateServiceData);
  };

  const handleEditClick = (service: any) => {
    setSelectedServiceId(service.id);
    setEditService({
      name: service.name,
      category: service.category,
      price: service.price,
      durationMinutes: service.duration_minutes,
      description: service.description,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = () => {
    if (!selectedServiceId) return;
    updateServiceMutation.mutate({ id: selectedServiceId, data: editService as UpdateServiceData });
  };

  const handleDeleteService = (id: number, name: string) => {
    if (confirm(`Czy na pewno chcesz usunąć ${name}?`)) {
      deleteServiceMutation.mutate(id);
    }
  };

  // Group services by category
  const groupedServices = services.reduce((acc: any, service: any) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {});

  return (
    <AppLayout role="admin">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cennik usług</h1>
            <p className="text-muted-foreground">Zarządzaj cenami i czasem trwania usług</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj usługę
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj nową usługę</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nazwa usługi *</Label>
                  <Input
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="np. Konsultacja podstawowa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategoria *</Label>
                  <Input
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    placeholder="np. Konsultacje"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cena (PLN) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                      placeholder="150.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Czas trwania (min) *</Label>
                    <Input
                      type="number"
                      value={newService.durationMinutes}
                      onChange={(e) => setNewService({ ...newService, durationMinutes: parseInt(e.target.value) })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Input
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="Opcjonalny opis usługi"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleAddService} disabled={createServiceMutation.isPending}>
                  {createServiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        ) : Object.keys(groupedServices).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedServices).map(([category, categoryServices]: [string, any]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryServices.map((service: any) => (
                      <div key={service.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{service.price.toFixed(2)} PLN</p>
                            <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteService(service.id, service.name)}
                              disabled={deleteServiceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">Brak usług. Dodaj pierwszą usługę.</p>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj usługę</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nazwa usługi</Label>
                <Input
                  value={editService.name}
                  onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategoria</Label>
                <Input
                  value={editService.category}
                  onChange={(e) => setEditService({ ...editService, category: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cena (PLN)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editService.price}
                    onChange={(e) => setEditService({ ...editService, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Czas trwania (min)</Label>
                  <Input
                    type="number"
                    value={editService.durationMinutes}
                    onChange={(e) => setEditService({ ...editService, durationMinutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Input
                  value={editService.description}
                  onChange={(e) => setEditService({ ...editService, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUpdateService} disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Pricing;
