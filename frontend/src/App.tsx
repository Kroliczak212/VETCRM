import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import ReceptionistDashboard from "./pages/receptionist/ReceptionistDashboard";
import Clients from "./pages/receptionist/Clients";
import Doctors from "./pages/receptionist/Doctors";
import Appointments from "./pages/receptionist/Appointments";
import ProposedAppointments from "./pages/receptionist/ProposedAppointments";
import RescheduleRequests from "./pages/receptionist/RescheduleRequests";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Staff from "./pages/admin/Staff";
import Pricing from "./pages/admin/Pricing";
import AppointmentReasons from "./pages/admin/AppointmentReasons";
import VaccinationTypes from "./pages/admin/VaccinationTypes";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import Patients from "./pages/doctor/Patients";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorWorkingHours from "./pages/doctor/DoctorWorkingHours";
import DoctorSchedule from "./pages/doctor/DoctorSchedule";
import DoctorCalendar from "./pages/doctor/DoctorCalendar";
import ClientPortal from "./pages/client/ClientPortal";
import Pets from "./pages/client/Pets";
import ClientAppointments from "./pages/client/ClientAppointments";
import Settings from "./pages/admin/Settings";
import Invoices from "./pages/receptionist/Invoices";
import NotFound from "./pages/NotFound";
import ClientDetails from "./pages/receptionist/ClientDetails";
import PatientDetails from "./pages/doctor/PatientDetails";
import StaffManagement from "./pages/admin/StaffManagement";
import WorkingHours from "./pages/admin/WorkingHours";
import ScheduleApprovals from "./pages/admin/ScheduleApprovals";
import PetDetails from "./pages/client/PetDetails";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin']}><Staff /></ProtectedRoute>} />
          <Route path="/admin/staff-management" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
          <Route path="/admin/working-hours" element={<ProtectedRoute allowedRoles={['admin']}><WorkingHours /></ProtectedRoute>} />
          <Route path="/admin/schedule-approvals" element={<ProtectedRoute allowedRoles={['admin']}><ScheduleApprovals /></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute allowedRoles={['admin']}><Pricing /></ProtectedRoute>} />
          <Route path="/admin/appointment-reasons" element={<ProtectedRoute allowedRoles={['admin']}><AppointmentReasons /></ProtectedRoute>} />
          <Route path="/admin/vaccination-types" element={<ProtectedRoute allowedRoles={['admin']}><VaccinationTypes /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

          {/* Receptionist Routes */}
          <Route path="/receptionist" element={<Navigate to="/receptionist/dashboard" replace />} />
          <Route path="/receptionist/dashboard" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><ReceptionistDashboard /></ProtectedRoute>} />
          <Route path="/receptionist/clients" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><Clients /></ProtectedRoute>} />
          <Route path="/receptionist/clients/:id" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><ClientDetails /></ProtectedRoute>} />
          <Route path="/receptionist/doctors" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><Doctors /></ProtectedRoute>} />
          <Route path="/receptionist/appointments" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><Appointments /></ProtectedRoute>} />
          <Route path="/receptionist/proposed-appointments" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><ProposedAppointments /></ProtectedRoute>} />
          <Route path="/receptionist/reschedule-requests" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><RescheduleRequests /></ProtectedRoute>} />
          <Route path="/receptionist/invoices" element={<ProtectedRoute allowedRoles={['receptionist', 'admin']}><Invoices /></ProtectedRoute>} />

          {/* Doctor Routes */}
          <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['doctor']}><Patients /></ProtectedRoute>} />
          <Route path="/doctor/patients/:id" element={<ProtectedRoute allowedRoles={['doctor']}><PatientDetails /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorAppointments /></ProtectedRoute>} />
          <Route path="/doctor/working-hours" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorWorkingHours /></ProtectedRoute>} />
          <Route path="/doctor/schedule" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorSchedule /></ProtectedRoute>} />
          <Route path="/doctor/calendar" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorCalendar /></ProtectedRoute>} />

          {/* Client Routes */}
          <Route path="/client" element={<Navigate to="/client/portal" replace />} />
          <Route path="/client/portal" element={<ProtectedRoute allowedRoles={['client']}><ClientPortal /></ProtectedRoute>} />
          <Route path="/client/pets" element={<ProtectedRoute allowedRoles={['client']}><Pets /></ProtectedRoute>} />
          <Route path="/client/pets/:id" element={<ProtectedRoute allowedRoles={['client']}><PetDetails /></ProtectedRoute>} />
          <Route path="/client/appointments" element={<ProtectedRoute allowedRoles={['client']}><ClientAppointments /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
