import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, Eye, Plus, Filter, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getPayments,
  getPaymentStatistics,
  type Payment,
  type PaymentStatistics,
  formatPaymentStatus,
  calculateBalance,
} from "@/services/payments.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Invoices = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partially_paid" | "unpaid">("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch payments and statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paymentsData, statsData] = await Promise.all([
          getPayments({ limit: 100 }),
          getPaymentStatistics(),
        ]);
        setPayments(paymentsData.data);
        setStatistics(statsData);
      } catch (error) {
        toast({
          title: "Błąd",
          description: "Nie udało się pobrać listy płatności",
          variant: "destructive",
        });
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const getStatusBadge = (status: Payment["status"]) => {
    const variants: Record<Payment["status"], { label: string; className: string }> = {
      paid: { label: "Opłacona", className: "bg-green-100 text-green-800 border-green-300" },
      partially_paid: { label: "Częściowo opłacona", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      unpaid: { label: "Nieopłacona", className: "bg-red-100 text-red-800 border-red-300" },
    };
    const variant = variants[status];
    return (
      <Badge className={variant.className} variant="outline">
        {variant.label}
      </Badge>
    );
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const clientName = `${payment.client_first_name || ""} ${payment.client_last_name || ""}`.toLowerCase();
    const matchesSearch =
      clientName.includes(searchTerm.toLowerCase()) ||
      payment.id.toString().includes(searchTerm) ||
      payment.appointment_id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals from filtered payments
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount_due, 0);
  const paidAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_paid, 0);
  const pendingAmount = filteredPayments
    .filter((p) => p.status === "unpaid" || p.status === "partially_paid")
    .reduce((sum, p) => sum + calculateBalance(p), 0);

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const handleDownload = (payment: Payment) => {
    // For now, show a toast. In the future, implement PDF generation
    toast({
      title: "Funkcja w przygotowaniu",
      description: `Pobieranie faktury dla płatności #${payment.id} będzie wkrótce dostępne`,
    });
  };

  const handleNewInvoice = () => {
    toast({
      title: "Funkcja w przygotowaniu",
      description: "Tworzenie nowej faktury będzie wkrótce dostępne",
    });
  };

  if (loading) {
    return (
      <AppLayout role="receptionist">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="receptionist">
      <header className="bg-card border-b border-border p-6 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Rachunki i Faktury</h1>
          <p className="text-muted-foreground">Zarządzanie rozliczeniami i płatnościami</p>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Łączna kwota</p>
                  <p className="text-2xl font-bold text-foreground">{totalAmount.toFixed(2)} zł</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Opłacone</p>
                  <p className="text-2xl font-bold text-green-600">{paidAmount.toFixed(2)} zł</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Oczekujące</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingAmount.toFixed(2)} zł</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">!</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po kliencie lub numerze płatności..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="paid">Opłacone</SelectItem>
                  <SelectItem value="partially_paid">Częściowo opłacone</SelectItem>
                  <SelectItem value="unpaid">Nieopłacone</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleNewInvoice}>
                <Plus className="mr-2 h-4 w-4" />
                Nowa faktura
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Brak płatności do wyświetlenia</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-foreground">Płatność #{payment.id}</h3>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Klient:</span>{" "}
                          {payment.client_first_name} {payment.client_last_name}
                        </p>
                        <p>
                          <span className="font-medium">Wizyta:</span> #{payment.appointment_id}
                        </p>
                        {payment.scheduled_at && (
                          <p>
                            <span className="font-medium">Data wizyty:</span>{" "}
                            {new Date(payment.scheduled_at).toLocaleDateString("pl-PL")}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Metoda płatności:</span>{" "}
                          {payment.payment_method === "cash"
                            ? "Gotówka"
                            : payment.payment_method === "card"
                            ? "Karta"
                            : "Online"}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Kwota do zapłaty</p>
                        <p className="text-2xl font-bold text-foreground">{payment.amount_due.toFixed(2)} zł</p>
                        {payment.status !== "unpaid" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Zapłacono: {payment.amount_paid.toFixed(2)} zł
                          </p>
                        )}
                        {payment.status === "partially_paid" && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Pozostało: {calculateBalance(payment).toFixed(2)} zł
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(payment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(payment)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Szczegóły płatności #{selectedPayment?.id}</DialogTitle>
            <DialogDescription>Pełne informacje o płatności</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Klient</p>
                  <p className="font-medium">
                    {selectedPayment.client_first_name} {selectedPayment.client_last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kwota do zapłaty</p>
                  <p className="font-medium">{selectedPayment.amount_due.toFixed(2)} zł</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zapłacono</p>
                  <p className="font-medium">{selectedPayment.amount_paid.toFixed(2)} zł</p>
                </div>
                {selectedPayment.status === "partially_paid" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pozostało</p>
                    <p className="font-medium text-yellow-600">
                      {calculateBalance(selectedPayment).toFixed(2)} zł
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Metoda płatności</p>
                  <p className="font-medium">
                    {selectedPayment.payment_method === "cash"
                      ? "Gotówka"
                      : selectedPayment.payment_method === "card"
                      ? "Karta"
                      : "Online"}
                  </p>
                </div>
                {selectedPayment.payment_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data płatności</p>
                    <p className="font-medium">
                      {new Date(selectedPayment.payment_date).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Data utworzenia</p>
                  <p className="font-medium">
                    {new Date(selectedPayment.created_at).toLocaleDateString("pl-PL")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Invoices;
