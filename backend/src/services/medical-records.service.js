const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const path = require('path');

class MedicalRecordsService {
  async getAll(query) {
    const { petId, appointmentId } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (petId) {
      whereClause += ' AND a.pet_id = ?';
      params.push(petId);
    }
    if (appointmentId) {
      whereClause += ' AND mr.appointment_id = ?';
      params.push(appointmentId);
    }

    const [records] = await pool.query(
      `SELECT mr.*, a.scheduled_at,
              p.name as pet_name, p.species,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       JOIN pets p ON a.pet_id = p.id
       JOIN users doc ON mr.created_by_user_id = doc.id
       ${whereClause}
       ORDER BY mr.created_at DESC`,
      params
    );

    return records;
  }

  async getById(recordId) {
    const [records] = await pool.query(
      `SELECT mr.*, a.scheduled_at, a.pet_id,
              p.name as pet_name, p.species, p.breed,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM medical_records mr
       JOIN appointments a ON mr.appointment_id = a.id
       JOIN pets p ON a.pet_id = p.id
       JOIN users doc ON mr.created_by_user_id = doc.id
       WHERE mr.id = ?`,
      [recordId]
    );

    if (records.length === 0) {
      throw new NotFoundError('Medical record');
    }

    const record = records[0];

    // Get attached files
    const [files] = await pool.query(
      'SELECT * FROM medical_files WHERE medical_record_id = ? ORDER BY uploaded_at',
      [recordId]
    );
    record.files = files;

    return record;
  }

  async create(data, createdBy) {
    const { appointmentId, notes, diagnosis, treatment, prescription } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify appointment exists
      const [appointments] = await connection.query('SELECT id FROM appointments WHERE id = ?', [appointmentId]);
      if (appointments.length === 0) {
        throw new NotFoundError('Appointment');
      }

      // Insert medical record
      const [result] = await connection.query(
        `INSERT INTO medical_records (appointment_id, notes, diagnosis, treatment, prescription, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [appointmentId, notes || null, diagnosis || null, treatment || null, prescription || null, createdBy]
      );

      await connection.commit();
      return this.getById(result.insertId);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async update(recordId, data) {
    const { notes, diagnosis, treatment, prescription } = data;

    await this.getById(recordId);

    const updates = [];
    const params = [];

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (diagnosis !== undefined) {
      updates.push('diagnosis = ?');
      params.push(diagnosis);
    }
    if (treatment !== undefined) {
      updates.push('treatment = ?');
      params.push(treatment);
    }
    if (prescription !== undefined) {
      updates.push('prescription = ?');
      params.push(prescription);
    }

    if (updates.length > 0) {
      params.push(recordId);
      await pool.query(
        `UPDATE medical_records SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getById(recordId);
  }

  async delete(recordId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete files first
      await connection.query('DELETE FROM medical_files WHERE medical_record_id = ?', [recordId]);

      // Delete record
      await connection.query('DELETE FROM medical_records WHERE id = ?', [recordId]);

      await connection.commit();
      return { message: 'Medical record deleted successfully' };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async addFile(recordId, file) {
    await this.getById(recordId);

    const [result] = await pool.query(
      `INSERT INTO medical_files (medical_record_id, file_path, file_type)
       VALUES (?, ?, ?)`,
      [recordId, file.path, path.extname(file.originalname)]
    );

    const [files] = await pool.query(
      'SELECT * FROM medical_files WHERE id = ?',
      [result.insertId]
    );

    return files[0];
  }

  async deleteFile(fileId) {
    const [files] = await pool.query('SELECT * FROM medical_files WHERE id = ?', [fileId]);

    if (files.length === 0) {
      throw new NotFoundError('File');
    }

    await pool.query('DELETE FROM medical_files WHERE id = ?', [fileId]);

    return { message: 'File deleted successfully' };
  }
}

module.exports = new MedicalRecordsService();
