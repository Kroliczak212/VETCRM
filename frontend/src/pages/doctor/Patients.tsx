import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Dog, Cat, Loader2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { petsService, type Pet } from "@/services/pets.service";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";

const Patients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const currentUser = authService.getCurrentUser();
  const doctorId = currentUser?.userId;

  const { data: petsData, isLoading } = useQuery({
    queryKey: ['pets', 'all'],
    queryFn: () => petsService.getAll({ limit: 1000 }),
  });

  const allPets = petsData?.data || [];

  // Filter pets based on search term
  const filteredPatients = allPets.filter(pet =>
    pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pet.owner_name && pet.owner_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
    pet.species.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSpeciesIcon = (species: string) => {
    const lowerSpecies = species.toLowerCase();
    if (lowerSpecies.includes("pies") || lowerSpecies.includes("dog")) return Dog;
    if (lowerSpecies.includes("kot") || lowerSpecies.includes("cat")) return Cat;
    return Dog; // Default icon
  };

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return "Nieznany wiek";
    const birth = new Date(birthDate);
    const now = new Date();
    const ageYears = now.getFullYear() - birth.getFullYear();
    const ageMonths = now.getMonth() - birth.getMonth();

    if (ageYears === 0) {
      return `${ageMonths} ${ageMonths === 1 ? 'miesiąc' : 'miesięcy'}`;
    } else if (ageYears === 1) {
      return "1 rok";
    } else if (ageYears < 5) {
      return `${ageYears} lata`;
    } else {
      return `${ageYears} lat`;
    }
  };

  if (isLoading) {
    return (
      <AppLayout role="doctor">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="doctor">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Pacjenci</h1>
            <p className="text-muted-foreground">Lista pacjentów</p>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Szukaj pacjenta po imieniu, właścicielu, rasie lub gatunku..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Dog className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {filteredPatients.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Wszystkich pacjentów</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Dog className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {filteredPatients.filter(p => p.species.toLowerCase().includes('pies') || p.species.toLowerCase().includes('dog')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Psów</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Cat className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {filteredPatients.filter(p => p.species.toLowerCase().includes('kot') || p.species.toLowerCase().includes('cat')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Kotów</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? "Nie znaleziono pacjentów pasujących do wyszukiwania" : "Brak pacjentów"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPatients.map((patient) => {
                const SpeciesIcon = getSpeciesIcon(patient.species);
                return (
                  <Card
                    key={patient.id}
                    className="hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer"
                    onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                            <SpeciesIcon className="h-8 w-8 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-foreground mb-1">
                              {patient.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {patient.breed || patient.species} • {calculateAge(patient.date_of_birth)}
                            </p>
                            {patient.owner_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Właściciel: {patient.owner_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{patient.species}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {patient.notes && (
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Notatki</p>
                          <p className="font-medium text-foreground text-sm">{patient.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/doctor/patients/${patient.id}`);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Historia
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
    </AppLayout>
  );
};

export default Patients;
