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

  async downloadFile(fileId: number): Promise<void> {
    const response = await apiClient.get(`/medical-records/files/${fileId}/download`, {
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    let filename = `file-${fileId}`;

    console.log('Content-Disposition header:', contentDisposition);

    if (contentDisposition) {
      const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (encodedMatch) {
        filename = decodeURIComponent(encodedMatch[1].trim());
        console.log('Using RFC 5987 filename:', filename);
      } else {
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
        const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i);

        if (quotedMatch) {
          filename = quotedMatch[1].trim();
          console.log('Using quoted filename:', filename);
        } else if (unquotedMatch) {
          filename = unquotedMatch[1].trim();
          console.log('Using unquoted filename:', filename);
        }
      }
    } else {
      console.log('No Content-Disposition header found, using default:', filename);
    }

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async previewFile(fileId: number): Promise<void> {
    const response = await apiClient.get(`/medical-records/files/${fileId}/download`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });
    const url = window.URL.createObjectURL(blob);

    window.open(url, '_blank');

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }

  getFilePreviewUrl(fileId: number): string {
    const token = localStorage.getItem('auth_token');
    return `${apiClient.defaults.baseURL}/medical-records/files/${fileId}/download?token=${token}`;
  }
}

export const medicalRecordsService = new MedicalRecordsService();
