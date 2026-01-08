import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { petsService, type Pet } from "@/services/pets.service";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, FileDown, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateDocumentationDialogProps {
  pet: Pet | null;
  isOpen: boolean;
  onClose: () => void;
}

type DateRangeOption = "6months" | "1year" | "2years" | "all" | "custom";

export function GenerateDocumentationDialog({ pet, isOpen, onClose }: GenerateDocumentationDialogProps) {
  const { toast } = useToast();
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>("1year");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const generateMutation = useMutation({
    mutationFn: async ({ action }: { action: 'preview' | 'download' }) => {
      if (!pet) throw new Error("Pet not found");

      const { startDate, endDate } = calculateDateRange();

      const blob = await petsService.generateDocumentation(
        pet.id,
        startDate,
        endDate
      );

      const url = window.URL.createObjectURL(blob);

      if (action === 'preview') {
        window.open(url, '_blank');
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      } else {
        const link = document.createElement("a");
        link.href = url;
        const petName = pet.name.replace(/[^a-zA-Z0-9]/g, "_");
        const dateStr = format(new Date(), "yyyy-MM-dd");
        link.download = `dokumentacja_${petName}_${dateStr}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    },
    onSuccess: (_, variables) => {
      if (variables.action === 'preview') {
        toast({
          title: "Podgląd dokumentacji",
          description: "PDF został otwarty w nowej karcie.",
        });
      } else {
        toast({
          title: "Dokumentacja pobrana",
          description: "PDF został pobrany na Twoje urządzenie.",
        });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd generowania dokumentacji",
        description: error.response?.data?.message || "Nie udało się wygenerować dokumentacji. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  const calculateDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: string;

    switch (selectedRange) {
      case "6months": {
        const date = new Date(now);
        date.setMonth(now.getMonth() - 6);
        startDate = date.toISOString();
        break;
      }
      case "1year": {
        const date = new Date(now);
        date.setFullYear(now.getFullYear() - 1);
        startDate = date.toISOString();
        break;
      }
      case "2years": {
        const date = new Date(now);
        date.setFullYear(now.getFullYear() - 2);
        startDate = date.toISOString();
        break;
      }
      case "all": {
        const date = pet?.date_of_birth ? new Date(pet.date_of_birth) : new Date("2000-01-01");
        startDate = date.toISOString();
        break;
      }
      case "custom": {
        if (!customStartDate || !customEndDate) {
          throw new Error("Wybierz zakres dat");
        }
        startDate = customStartDate.toISOString();
        return { startDate, endDate: customEndDate.toISOString() };
      }
      default:
        startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    }

    return { startDate, endDate };
  };

  const validateDates = (): boolean => {
    if (selectedRange === "custom" && (!customStartDate || !customEndDate)) {
      toast({
        title: "Brak zakresu dat",
        description: "Wybierz datę początkową i końcową.",
        variant: "destructive",
      });
      return false;
    }

    if (selectedRange === "custom" && customStartDate && customEndDate && customStartDate > customEndDate) {
      toast({
        title: "Nieprawidłowy zakres",
        description: "Data początkowa musi być wcześniejsza niż data końcowa.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handlePreview = () => {
    try {
      if (!validateDates()) return;
      generateMutation.mutate({ action: 'preview' });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    try {
      if (!validateDates()) return;
      generateMutation.mutate({ action: 'download' });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (!generateMutation.isPending) {
      setSelectedRange("1year");
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Wygeneruj dokumentację medyczną</DialogTitle>
          <DialogDescription>
            Pupil: <span className="font-semibold">{pet?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Wybierz zakres czasowy:</Label>
            <RadioGroup value={selectedRange} onValueChange={(value) => setSelectedRange(value as DateRangeOption)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="6months" id="6months" />
                <Label htmlFor="6months" className="font-normal cursor-pointer">
                  Ostatnie 6 miesięcy
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1year" id="1year" />
                <Label htmlFor="1year" className="font-normal cursor-pointer">
                  Ostatni rok <span className="text-muted-foreground text-xs">(domyślne)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2years" id="2years" />
                <Label htmlFor="2years" className="font-normal cursor-pointer">
                  Ostatnie 2 lata
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Wszystkie wizyty
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Niestandardowy zakres
                </Label>
              </div>
            </RadioGroup>
          </div>

          {selectedRange === "custom" && (
            <div className="space-y-3 pt-2 pl-6 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm">Data początkowa</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "dd.MM.yyyy", { locale: pl })
                      ) : (
                        <span>Wybierz datę</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm">Data końcowa</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd.MM.yyyy", { locale: pl })
                      ) : (
                        <span>Wybierz datę</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                      initialFocus
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={generateMutation.isPending}>
            Anuluj
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Podgląd
              </>
            )}
          </Button>
          <Button onClick={handleDownload} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Pobierz PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
