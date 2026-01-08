import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { Stethoscope, Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        toast.error("Brak tokenu resetowania hasła");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await authService.verifyResetToken(token);
        setIsTokenValid(response.valid);

        if (!response.valid) {
          toast.error("Link do resetowania hasła jest nieprawidłowy lub wygasł");
        }
      } catch (error) {
        toast.error("Błąd podczas weryfikacji tokenu");
        setIsTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  useEffect(() => {
    setPasswordValidation({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    });
  }, [newPassword]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Brak tokenu resetowania hasła");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Hasła nie są identyczne");
      return;
    }

    if (!isPasswordValid) {
      toast.error("Hasło nie spełnia wymagań bezpieczeństwa");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword(token, newPassword);
      toast.success(response.message || "Hasło zostało pomyślnie zresetowane");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Wystąpił błąd podczas resetowania hasła");
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      {isValid ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-300" />
      )}
      <span className={`text-xs ${isValid ? "text-green-700" : "text-gray-500"}`}>
        {text}
      </span>
    </div>
  );

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Weryfikacja tokenu...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Nieprawidłowy link</CardTitle>
            <CardDescription>
              Link do resetowania hasła jest nieprawidłowy lub wygasł.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Link do resetowania hasła jest ważny tylko przez 1 godzinę.
                Jeśli Twój link wygasł, możesz poprosić o nowy.
              </p>
            </div>

            <Button
              variant="medical"
              className="w-full"
              onClick={() => navigate("/forgot-password")}
            >
              Poproś o nowy link
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
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Ustaw nowe hasło
              </h2>
              <p className="text-lg text-white/90 leading-relaxed">
                Wybierz silne hasło, które będzie chronić Twoje konto.
              </p>
            </div>
            <div className="pt-6 border-t border-white/20">
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="h-5 w-5" />
                <span className="text-sm">
                  Twoje nowe hasło musi spełniać wymogi bezpieczeństwa
                </span>
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-2 text-center lg:text-left">
            <CardTitle className="text-2xl">Resetowanie hasła</CardTitle>
            <CardDescription>
              Wprowadź nowe hasło dla swojego konta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nowe hasło</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="transition-all duration-300 focus:shadow-md"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="transition-all duration-300 focus:shadow-md"
                  autoComplete="new-password"
                />
              </div>

              {newPassword && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Wymagania dotyczące hasła:
                  </p>
                  <ValidationItem
                    isValid={passwordValidation.minLength}
                    text="Minimum 8 znaków"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasUppercase}
                    text="Przynajmniej jedna wielka litera"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasLowercase}
                    text="Przynajmniej jedna mała litera"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasNumber}
                    text="Przynajmniej jedna cyfra"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasSpecialChar}
                    text="Przynajmniej jeden znak specjalny (!@#$%^&*...)"
                  />
                </div>
              )}

              {confirmPassword && (
                <div className="text-sm">
                  {newPassword === confirmPassword ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Hasła są identyczne</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>Hasła nie są identyczne</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="medical"
                className="w-full"
                size="lg"
                disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
              >
                {isLoading ? "Resetowanie..." : "Zresetuj hasło"}
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                <Button
                  variant="link"
                  onClick={() => navigate("/login")}
                  className="text-primary"
                >
                  ← Powrót do logowania
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
