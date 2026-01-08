import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { Stethoscope, Mail } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Wprowadź adres email");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      toast.success(response.message || "Link do resetowania hasła został wysłany na podany adres email");
      setEmailSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col justify-center p-8 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Stethoscope className="h-8 w-8" />
              </div>
              <h1 className="text-4xl font-bold">VetCRM</h1>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold leading-tight">
                Resetowanie hasła
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                Nie martw się! Podaj swój adres email, a wyślemy Ci link do utworzenia nowego hasła.
              </p>
            </div>
            <div className="pt-6 border-t border-white/20">
              <div className="flex items-center gap-2 text-white/80">
                <Mail className="h-5 w-5" />
                <span className="text-sm">
                  Sprawdź swoją skrzynkę email po wysłaniu formularza
                </span>
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-2 text-center lg:text-left">
            <CardTitle className="text-2xl">Zapomniałeś hasła?</CardTitle>
            <CardDescription>
              {emailSent
                ? "Email został wysłany. Sprawdź swoją skrzynkę pocztową."
                : "Wprowadź swój adres email, aby otrzymać link do resetowania hasła."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adres email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all duration-300 focus:shadow-md"
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  variant="medical"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
                </Button>

                <div className="text-center text-sm text-muted-foreground pt-2">
                  Pamiętasz hasło?{" "}
                  <Button
                    variant="link"
                    onClick={() => navigate("/login")}
                    className="text-primary p-0 h-auto"
                  >
                    Zaloguj się
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Jeśli podany adres email istnieje w naszym systemie, otrzymasz wiadomość z linkiem do resetowania hasła.
                    Link będzie ważny przez 1 godzinę.
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Nie otrzymałeś emaila?</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Sprawdź folder SPAM</li>
                    <li>Upewnij się, że podałeś poprawny adres email</li>
                    <li>Poczekaj kilka minut - dostarczenie może chwilę potrwać</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                >
                  Wyślij ponownie
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/login")}
                    className="text-primary"
                  >
                    ← Powrót do logowania
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
