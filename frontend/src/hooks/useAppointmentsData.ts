import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentsService, type CreateAppointmentData, type Appointment } from "@/services/appointments.service";
import { usersService, type User } from "@/services/users.service";
import { clientsService, type Client } from "@/services/clients.service";
import { petsService, type Pet } from "@/services/pets.service";
import { appointmentReasonsService, type AppointmentReason } from "@/services/appointment-reasons.service";
import { vaccinationTypesService, type VaccinationType } from "@/services/vaccination-types.service";
import type { ApiError } from "@/types/common";

interface UseAppointmentsDataParams {
  selectedDate: Date;
  selectedDoctor: string;
  selectedClient: string;
  selectedPetSpecies: string;
  selectedReasonIsVaccination: boolean;
  newAppointment: Partial<CreateAppointmentData>;
}

interface UseAppointmentsDataReturn {
  doctors: User[];
  appointments: Appointment[];
  clients: Client[];
  pets: Pet[];
  appointmentReasons: AppointmentReason[];
  vaccinationTypes: VaccinationType[];
  availableSlots: { time: string; available: boolean }[] | undefined;

  appointmentsLoading: boolean;
  slotsLoading: boolean;

  createAppointment: (data: CreateAppointmentData) => void;
  isCreating: boolean;

  refetchAppointments: () => void;
}

export function useAppointmentsData({
  selectedDate,
  selectedDoctor,
  selectedClient,
  selectedPetSpecies,
  selectedReasonIsVaccination,
  newAppointment,
}: UseAppointmentsDataParams): UseAppointmentsDataReturn {
  const queryClient = useQueryClient();
  const dateStr = selectedDate.toISOString().split('T')[0];

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => usersService.getAll({ role: 'doctor', limit: 100 }),
  });

  const { data: appointmentsData, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments', dateStr, selectedDoctor],
    queryFn: () => {
      const params: { date: string; limit: number; doctorId?: number } = { date: dateStr, limit: 100 };
      if (selectedDoctor !== "all") {
        params.doctorId = Number(selectedDoctor);
      }
      return appointmentsService.getAll(params);
    },
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsService.getAll({ limit: 100 }),
  });

  const { data: appointmentReasonsData } = useQuery({
    queryKey: ['appointment-reasons'],
    queryFn: () => appointmentReasonsService.getAll({ isActive: true, limit: 100 }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: vaccinationTypesData } = useQuery({
    queryKey: ['vaccination-types', selectedPetSpecies],
    queryFn: () => vaccinationTypesService.getAll({
      species: selectedPetSpecies,
      isActive: true,
      limit: 100
    }),
    enabled: !!selectedPetSpecies && !!selectedReasonIsVaccination,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: petsData } = useQuery({
    queryKey: ['pets', 'client', selectedClient],
    queryFn: () => petsService.getAll({ ownerId: Number(selectedClient) }),
    enabled: !!selectedClient,
  });

  const selectedDateForSlots = newAppointment.scheduledAt?.split('T')[0] || "";
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', newAppointment.doctorId, selectedDateForSlots],
    queryFn: () => appointmentsService.getAvailableSlots({
      doctorId: newAppointment.doctorId!,
      date: selectedDateForSlots
    }),
    enabled: !!newAppointment.doctorId && !!selectedDateForSlots,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Wizyta została umówiona pomyślnie");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error || "Nie udało się umówić wizyty");
    },
  });

  return {
    doctors: doctorsData?.data || [],
    appointments: appointmentsData?.data || [],
    clients: clientsData?.data || [],
    pets: petsData?.data || [],
    appointmentReasons: appointmentReasonsData?.data || [],
    vaccinationTypes: vaccinationTypesData?.data || [],
    availableSlots,
    appointmentsLoading,
    slotsLoading,
    createAppointment: createAppointmentMutation.mutate,
    isCreating: createAppointmentMutation.isPending,
    refetchAppointments,
  };
}
