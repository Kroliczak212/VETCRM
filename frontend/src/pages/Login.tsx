import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { handleApiError } from "@/lib/api-client";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });

      if (response.requiresPasswordChange) {
        toast.info("Please change your temporary password");
        navigate("/change-password");
        return;
      }

      toast.success("Zalogowano pomyślnie!");

      const roleRoutes: Record<string, string> = {
        admin: "/admin",
        receptionist: "/receptionist",
        doctor: "/doctor",
        client: "/client"
      };

      const redirectPath = roleRoutes[response.user.role_name] || "/dashboard";
      navigate(redirectPath);

    } catch (error) {
      console.error("Login error:", error);
      toast.error(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex flex-col justify-center space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-primary-foreground">V</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">VetCRM</h1>
              <p className="text-muted-foreground">System CRM dla Przychodni</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-foreground leading-tight">
              Zarządzaj przychodnią
              <span className="block bg-gradient-hero bg-clip-text text-transparent">
                efektywnie i nowocześnie
              </span>
            </h2>

            <div className="space-y-3 pt-4">
              {[
                "Kompleksowe zarządzanie wizytami",
                "Historia medyczna pacjentów",
                "Automatyczne przypomnienia",
                "Portal dla klientów",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-secondary"></div>
                  </div>
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="shadow-elevated border-border animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-foreground">Witaj ponownie</CardTitle>
            <CardDescription>
              Zaloguj się do swojego konta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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

              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="transition-all duration-300 focus:shadow-md"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-muted-foreground">Zapamiętaj mnie</span>
                </label>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/forgot-password")}
                  className="text-primary p-0 h-auto hover:underline"
                >
                  Zapomniałeś hasła?
                </Button>
              </div>

              <Button
                type="submit"
                variant="medical"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Button
                variant="link"
                onClick={() => navigate("/")}
                className="text-primary"
              >
                ← Powrót do strony głównej
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
