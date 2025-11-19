import { apiClient } from '@/lib/api-client';

export interface MedicalRecord {
  id: number;
  appointment_id: number;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  files?: MedicalFile[];
  created_at: string;
  updated_at: string;
}

export interface MedicalFile {
  id: number;
  medical_record_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface CreateMedicalRecordData {
  appointmentId: number;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

export interface UpdateMedicalRecordData {
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

class MedicalRecordsService {
  async getAll(params?: { appointmentId?: number; petId?: number }) {
    const { data } = await apiClient.get<{ data: MedicalRecord[] }>('/medical-records', { params });
    return data;
  }

  async getById(id: number) {
    const { data } = await apiClient.get<{ medicalRecord: MedicalRecord }>(`/medical-records/${id}`);
    return data.medicalRecord;
  }

  async create(recordData: CreateMedicalRecordData) {
    const { data } = await apiClient.post<{ message: string; medicalRecord: MedicalRecord }>('/medical-records', recordData);
    return data;
  }

  async update(id: number, recordData: UpdateMedicalRecordData) {
    const { data } = await apiClient.put<{ message: string; medicalRecord: MedicalRecord }>(`/medical-records/${id}`, recordData);
    return data;
  }

  async delete(id: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/medical-records/${id}`);
    return data;
  }

  async uploadFile(medicalRecordId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<{ message: string; file: MedicalFile }>(
      `/medical-records/${medicalRecordId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  async deleteFile(medicalRecordId: number, fileId: number) {
    const { data } = await apiClient.delete<{ message: string }>(`/medical-records/${medicalRecordId}/files/${fileId}`);
    return data;
  }
}

export const medicalRecordsService = new MedicalRecordsService();
