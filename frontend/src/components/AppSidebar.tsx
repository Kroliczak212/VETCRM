import { Home, Users, Calendar, FileText, Settings, LogOut, Stethoscope, ClipboardList, ClipboardCheck, Clock, CalendarDays, CalendarClock, MessageSquare, Syringe } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  role: "admin" | "receptionist" | "doctor" | "client";
}

const menuItems = {
  admin: [
    { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
    { icon: Users, label: "Personel", path: "/admin/staff" },
    { icon: ClipboardList, label: "Cennik", path: "/admin/pricing" },
    { icon: MessageSquare, label: "Powody wizyt", path: "/admin/appointment-reasons" },
    { icon: Syringe, label: "Typy szczepień", path: "/admin/vaccination-types" },
    { icon: Settings, label: "Ustawienia", path: "/admin/settings" },
  ],
  receptionist: [
    { icon: Home, label: "Dashboard", path: "/receptionist/dashboard" },
    { icon: Calendar, label: "Kalendarz Wizyt", path: "/receptionist/appointments" },
    { icon: ClipboardCheck, label: "Propozycje Wizyt", path: "/receptionist/proposed-appointments" },
    { icon: CalendarClock, label: "Zmiany Terminów", path: "/receptionist/reschedule-requests" },
    { icon: Users, label: "Klienci", path: "/receptionist/clients" },
    { icon: Stethoscope, label: "Lekarze", path: "/receptionist/doctors" },
    { icon: FileText, label: "Rachunki", path: "/receptionist/invoices" },
  ],
  doctor: [
    { icon: Home, label: "Dashboard", path: "/doctor/dashboard" },
    { icon: Calendar, label: "Moje Wizyty", path: "/doctor/appointments" },
    { icon: Users, label: "Pacjenci", path: "/doctor/patients" },
    { icon: Clock, label: "Moje godziny pracy", path: "/doctor/working-hours" },
    { icon: ClipboardList, label: "Zmiany grafiku", path: "/doctor/schedule" },
    { icon: CalendarDays, label: "Mój grafik", path: "/doctor/calendar" },
  ],
  client: [
    { icon: Home, label: "Portal", path: "/client/portal" },
    { icon: Users, label: "Moje Zwierzęta", path: "/client/pets" },
    { icon: Calendar, label: "Wizyty", path: "/client/appointments" },
  ],
};

export function AppSidebar({ role }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  
  const items = menuItems[role];
  const isCollapsed = state === "collapsed";

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">V</span>
          </div>
          {!isCollapsed && <span className="font-bold text-sidebar-foreground">VetCRM</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Wyloguj" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-5 w-5" />
              <span>Wyloguj</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
