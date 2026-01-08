import { useQuery } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments.service';
import { useMemo } from 'react';

interface UseAppointmentScheduleProps {
  selectedDate: Date;
  selectedDoctor: string; // "all" or doctorId
}

export const useAppointmentSchedule = ({
  selectedDate,
  selectedDoctor
}: UseAppointmentScheduleProps) => {
  const dateStr = selectedDate.toISOString().split('T')[0];

  const { data: timeRangeData, isLoading: timeRangeLoading } = useQuery({
    queryKey: ['time-range-all-doctors', dateStr],
    queryFn: () => appointmentsService.getTimeRangeForAllDoctors(dateStr),
    enabled: selectedDoctor === 'all',
  });

  const { data: doctorTimeRange, isLoading: doctorTimeRangeLoading } = useQuery({
    queryKey: ['doctor-time-range', selectedDoctor, dateStr],
    queryFn: () => appointmentsService.getDoctorTimeRange(Number(selectedDoctor), dateStr),
    enabled: selectedDoctor !== 'all',
  });

  const timeSlots = useMemo(() => {
    if (selectedDoctor === 'all') {
      if (!timeRangeData?.hasDoctors || !timeRangeData.startTime || !timeRangeData.endTime) {
        return [];
      }

      const startHour = parseInt(timeRangeData.startTime.split(':')[0]);
      const endHour = parseInt(timeRangeData.endTime.split(':')[0]);
      const slots = [];

      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }

      return slots;
    } else {
      if (!doctorTimeRange?.isWorking || !doctorTimeRange.startTime || !doctorTimeRange.endTime) {
        return [];
      }

      const startHour = parseInt(doctorTimeRange.startTime.split(':')[0]);
      const endHour = parseInt(doctorTimeRange.endTime.split(':')[0]);
      const slots = [];

      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }

      return slots;
    }
  }, [selectedDoctor, timeRangeData, doctorTimeRange]);

  const isLoading = selectedDoctor === 'all' ? timeRangeLoading : doctorTimeRangeLoading;

  return {
    timeSlots,
    isLoading,
    hasDoctors: selectedDoctor === 'all'
      ? timeRangeData?.hasDoctors ?? false
      : doctorTimeRange?.isWorking ?? false,
  };
};
