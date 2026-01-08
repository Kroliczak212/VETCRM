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

      const [appointments] = await connection.query('SELECT id FROM appointments WHERE id = ?', [appointmentId]);
      if (appointments.length === 0) {
        throw new NotFoundError('Appointment');
      }

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

      await connection.query('DELETE FROM medical_files WHERE medical_record_id = ?', [recordId]);

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

    // Check if new columns exist (migration might not be applied yet)
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'medical_files' AND TABLE_SCHEMA = DATABASE()`
    );
    const columnNames = columns.map(c => c.COLUMN_NAME);
    const hasFileNameColumn = columnNames.includes('file_name');
    const hasFileSizeColumn = columnNames.includes('file_size');

    let result;
    if (hasFileNameColumn && hasFileSizeColumn) {
      [result] = await pool.query(
        `INSERT INTO medical_files (medical_record_id, file_name, file_path, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [
          recordId,
          file.originalname,
          file.path,
          file.detectedMimeType || path.extname(file.originalname),
          file.size || file.buffer?.length || 0
        ]
      );
    } else {
      // Fallback for old schema
      [result] = await pool.query(
        `INSERT INTO medical_files (medical_record_id, file_path, file_type)
         VALUES (?, ?, ?)`,
        [recordId, file.path, path.extname(file.originalname)]
      );
    }

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

  /**
   * Get file for download with authorization check
   */
  async getFileForDownload(fileId, user) {
    const fs = require('fs');
    const { ForbiddenError } = require('../utils/errors');

    const [files] = await pool.query(`
      SELECT mf.*, mr.appointment_id, mr.created_by_user_id,
             a.pet_id, p.owner_user_id
      FROM medical_files mf
      JOIN medical_records mr ON mf.medical_record_id = mr.id
      JOIN appointments a ON mr.appointment_id = a.id
      JOIN pets p ON a.pet_id = p.id
      WHERE mf.id = ?
    `, [fileId]);

    if (files.length === 0) {
      throw new NotFoundError('File');
    }

    const file = files[0];

    // Authorization check
    // Can download if:
    // - Admin (role_id = 1)
    // - Doctor who created the medical record
    // - Client who owns the pet
    const canAccess =
      user.role_id === 1 || // Admin
      user.id === file.created_by_user_id || // Doctor who created record
      user.id === file.owner_user_id; // Pet owner

    if (!canAccess) {
      throw new ForbiddenError('You do not have access to this file');
    }

    const filePath = path.join(__dirname, '../../', file.file_path);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File not found on disk');
    }

    return { file, filePath };
  }
}

module.exports = new MedicalRecordsService();
