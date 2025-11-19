import { Button } from "@/components/ui/button";
import { Calendar, Users, FileText, Settings, LogOut, Menu, Stethoscope, Home, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/services/auth.service";

interface SidebarProps {
  role: "admin" | "receptionist" | "doctor" | "client";
}

const Sidebar = ({ role }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = {
    admin: [
      { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Users, label: "Personel", path: "/admin/staff" },
      { icon: ClipboardList, label: "Cennik", path: "/admin/pricing" },
      { icon: Settings, label: "Ustawienia", path: "/admin/settings" },
    ],
    receptionist: [
      { icon: Home, label: "Dashboard", path: "/receptionist/dashboard" },
      { icon: Calendar, label: "Kalendarz Wizyt", path: "/receptionist/appointments" },
      { icon: Users, label: "Klienci", path: "/receptionist/clients" },
      { icon: Stethoscope, label: "Lekarze", path: "/receptionist/doctors" },
      { icon: FileText, label: "Rachunki", path: "/receptionist/invoices" },
    ],
    doctor: [
      { icon: Home, label: "Dashboard", path: "/doctor/dashboard" },
      { icon: Calendar, label: "Moje Wizyty", path: "/doctor/appointments" },
      { icon: Users, label: "Pacjenci", path: "/doctor/patients" },
      { icon: FileText, label: "Historia Medyczna", path: "/doctor/medical-history" },
    ],
    client: [
      { icon: Home, label: "Portal", path: "/client/portal" },
      { icon: Users, label: "Moje Zwierzęta", path: "/client/pets" },
      { icon: Calendar, label: "Wizyty", path: "/client/appointments" },
    ],
  };

  const items = menuItems[role];

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } bg-card border-r border-border transition-all duration-300 flex flex-col fixed h-full z-40`}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">V</span>
            </div>
            <span className="font-bold text-foreground">VetCRM</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {items.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={index}
              variant={isActive ? "default" : "ghost"}
              className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} transition-all duration-300`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span className="ml-2">{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"} text-destructive hover:text-destructive hover:bg-destructive/10`}
        >
          <LogOut className="h-5 w-5" />
          {sidebarOpen && <span className="ml-2">Wyloguj</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
