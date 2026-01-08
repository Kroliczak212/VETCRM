import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Mail, Phone, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  specialization?: string;
}

const Staff = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: 1,
      name: "Dr Anna Nowak",
      role: "doctor",
      email: "anna.nowak@vetcrm.pl",
      phone: "+48 111 222 333",
      status: "active",
      specialization: "Chirurgia weterynaryjna"
    },
    {
      id: 2,
      name: "Maria Kowalska",
      role: "receptionist",
      email: "maria.kowalska@vetcrm.pl",
      phone: "+48 222 333 444",
      status: "active"
    },
    {
      id: 3,
      name: "Dr Piotr Wiśniewski",
      role: "doctor",
      email: "piotr.wisniewski@vetcrm.pl",
      phone: "+48 333 444 555",
      status: "active",
      specialization: "Dermatologia"
    },
  ]);

  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    specialization: ""
  });

  const [editStaff, setEditStaff] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    specialization: ""
  });

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.role || !newStaff.email || !newStaff.phone) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    const staffMember: StaffMember = {
      id: staff.length + 1,
      ...newStaff,
      status: "active"
    };

    setStaff([...staff, staffMember]);
    setNewStaff({ name: "", role: "", email: "", phone: "", specialization: "" });
    setIsDialogOpen(false);
    toast.success("Pracownik został dodany");
  };

  const handleEditClick = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditStaff({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      specialization: member.specialization || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStaff = () => {
    if (!editStaff.name || !editStaff.role || !editStaff.email || !editStaff.phone) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    setStaff(staff.map(s => 
      s.id === selectedStaff?.id 
        ? { ...s, ...editStaff }
        : s
    ));
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
    toast.success("Dane pracownika zostały zaktualizowane");
  };

  const handleDeleteClick = (member: StaffMember) => {
    setSelectedStaff(member);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStaff = () => {
    if (selectedStaff) {
      setStaff(staff.filter(s => s.id !== selectedStaff.id));
      toast.success("Pracownik został usunięty");
    }
    setIsDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      admin: { label: "Administrator", className: "bg-primary/20 text-primary" },
      doctor: { label: "Lekarz", className: "bg-secondary/20 text-secondary" },
      receptionist: { label: "Recepcjonista", className: "bg-accent/20 text-accent" }
    };
    const variant = variants[role] || variants.receptionist;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <AppLayout role="admin">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Zarządzanie Personelem</h1>
                <p className="text-muted-foreground">Dodawaj i zarządzaj pracownikami przychodni</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Dodaj Pracownika
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nowy Pracownik</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Imię i Nazwisko *</Label>
                      <Input
                        id="name"
                        value={newStaff.name}
                        onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                        placeholder="Dr Jan Kowalski"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rola *</Label>
                      <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rolę" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="doctor">Lekarz</SelectItem>
                          <SelectItem value="receptionist">Recepcjonista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newStaff.role === "doctor" && (
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specjalizacja</Label>
                        <Input
                          id="specialization"
                          value={newStaff.specialization}
                          onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                          placeholder="Chirurgia weterynaryjna"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                        placeholder="email@vetcrm.pl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon *</Label>
                      <PhoneInput
                        id="phone"
                        value={newStaff.phone}
                        onChange={(value) => setNewStaff({ ...newStaff, phone: value })}
                      />
                    </div>
                    <Button onClick={handleAddStaff} className="w-full">
                      Dodaj Pracownika
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Szukaj pracownika po imieniu lub emailu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filteredStaff.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-foreground">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                          {getRoleBadge(member.role)}
                        </div>
                        {member.specialization && (
                          <p className="text-sm text-muted-foreground mb-2">{member.specialization}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {member.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteClick(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edytuj Pracownika</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Imię i Nazwisko *</Label>
                <Input
                  id="edit-name"
                  value={editStaff.name}
                  onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
                  placeholder="Dr Jan Kowalski"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rola *</Label>
                <Select value={editStaff.role} onValueChange={(value) => setEditStaff({ ...editStaff, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz rolę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="doctor">Lekarz</SelectItem>
                    <SelectItem value="receptionist">Recepcjonista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editStaff.role === "doctor" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-specialization">Specjalizacja</Label>
                  <Input
                    id="edit-specialization"
                    value={editStaff.specialization}
                    onChange={(e) => setEditStaff({ ...editStaff, specialization: e.target.value })}
                    placeholder="Chirurgia weterynaryjna"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editStaff.email}
                  onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
                  placeholder="email@vetcrm.pl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefon *</Label>
                <PhoneInput
                  id="edit-phone"
                  value={editStaff.phone}
                  onChange={(value) => setEditStaff({ ...editStaff, phone: value })}
                />
              </div>
              <Button onClick={handleUpdateStaff} className="w-full">
                Zapisz zmiany
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta akcja jest nieodwracalna. Pracownik <strong>{selectedStaff?.name}</strong> zostanie trwale usunięty z systemu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteStaff} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </AppLayout>
  );
};

export default Staff;
