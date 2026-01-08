const { pool } = require('../config/database');
const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const penaltiesService = require('./penalties.service');
const vaccinationsService = require('./vaccinations.service');
const medicalRecordsService = require('./medical-records.service');
const APPOINTMENT_RULES = require('../config/appointmentRules');

const slotAvailabilityService = require('./slot-availability.service');
const appointmentCancellationService = require('./appointment-cancellation.service');
const appointmentRescheduleService = require('./appointment-reschedule.service');

class AppointmentsService {
  /**
   * Get all appointments with filters
   */
  async getAll(query, user) {
    const { limit, offset, page } = parsePagination(query);
    const { doctorId, petId, status, date } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    // Role-based filtering
    // Doctors can see all appointments when viewing a specific pet's details
    // but only their own appointments when viewing general appointments list
    if (user.role === 'doctor' && !petId) {
      whereClause += ' AND a.doctor_user_id = ?';
      params.push(user.id);
    } else if (user.role === 'client') {
      whereClause += ' AND p.owner_user_id = ?';
      params.push(user.id);
    }

    if (doctorId) {
      whereClause += ' AND a.doctor_user_id = ?';
      params.push(doctorId);
    }
    if (petId) {
      whereClause += ' AND a.pet_id = ?';
      params.push(petId);
    }
    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    if (date) {
      whereClause += ' AND DATE(a.scheduled_at) = ?';
      params.push(date);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    const [appointments] = await pool.query(
      `SELECT a.*,
              p.name as pet_name, p.species, p.breed,
              CONCAT(owner.first_name, ' ', owner.last_name) as client_name,
              owner.phone as client_phone,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name,
              CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
              ar.name as reason_name,
              ar.is_vaccination as reason_is_vaccination,
              vt.name as vaccination_type_name,
              mr.id as medical_record_id,
              mr.diagnosis as medical_record_diagnosis,
              mr.treatment as medical_record_treatment,
              mr.prescription as medical_record_prescription,
              mr.notes as medical_record_notes
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users owner ON p.owner_user_id = owner.id
       JOIN users doc ON a.doctor_user_id = doc.id
       JOIN users creator ON a.created_by_user_id = creator.id
       LEFT JOIN appointment_reasons ar ON a.reason_id = ar.id
       LEFT JOIN vaccination_types vt ON a.vaccination_type_id = vt.id
       LEFT JOIN medical_records mr ON a.id = mr.appointment_id
       ${whereClause}
       ORDER BY a.scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison

    for (const appointment of appointments) {
      const [services] = await pool.query(
        `SELECT s.id, s.name, s.category, aps.quantity, aps.unit_price,
                (aps.quantity * aps.unit_price) as total
         FROM appointment_services aps
         JOIN services s ON aps.service_id = s.id
         WHERE aps.appointment_id = ?`,
        [appointment.id]
      );
      appointment.services = services;

      // Process medical record into nested object
      if (appointment.medical_record_id) {
        appointment.medical_record = {
          id: appointment.medical_record_id,
          diagnosis: appointment.medical_record_diagnosis,
          treatment: appointment.medical_record_treatment,
          prescription: appointment.medical_record_prescription,
          notes: appointment.medical_record_notes
        };

        const [files] = await pool.query(
          'SELECT * FROM medical_files WHERE medical_record_id = ? ORDER BY uploaded_at',
          [appointment.medical_record_id]
        );
        appointment.medical_record.files = files;
      } else {
        appointment.medical_record = null;
      }

      delete appointment.medical_record_id;
      delete appointment.medical_record_diagnosis;
      delete appointment.medical_record_treatment;
      delete appointment.medical_record_prescription;
      delete appointment.medical_record_notes;

      const appointmentDate = new Date(appointment.scheduled_at);
      appointmentDate.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        appointment.time_status = 'past';
      } else if (appointmentDate.getTime() === today.getTime()) {
        appointment.time_status = 'today';
      } else {
        appointment.time_status = 'future';
      }
    }

    return {
      data: appointments,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get appointment by ID
   */
  async getById(appointmentId) {
    const [appointments] = await pool.query(
      `SELECT a.*,
              p.id as pet_id, p.name as pet_name, p.species, p.breed, p.sex, p.date_of_birth,
              p.owner_user_id as client_id,
              CONCAT(owner.first_name, ' ', owner.last_name) as client_name,
              owner.email as client_email,
              owner.phone as client_phone,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name,
              CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
              ar.name as reason_name,
              ar.is_vaccination as reason_is_vaccination,
              vt.name as vaccination_type_name,
              vt.species as vaccination_type_species
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users owner ON p.owner_user_id = owner.id
       JOIN users doc ON a.doctor_user_id = doc.id
       JOIN users creator ON a.created_by_user_id = creator.id
       LEFT JOIN appointment_reasons ar ON a.reason_id = ar.id
       LEFT JOIN vaccination_types vt ON a.vaccination_type_id = vt.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      throw new NotFoundError('Appointment');
    }

    const appointment = appointments[0];

    const [services] = await pool.query(
      `SELECT s.id, s.name, s.category, aps.quantity, aps.unit_price,
              (aps.quantity * aps.unit_price) as total
       FROM appointment_services aps
       JOIN services s ON aps.service_id = s.id
       WHERE aps.appointment_id = ?`,
      [appointmentId]
    );
    appointment.services = services;

    const [medicalRecords] = await pool.query(
      'SELECT * FROM medical_records WHERE appointment_id = ?',
      [appointmentId]
    );

    if (medicalRecords[0]) {
      appointment.medical_record = medicalRecords[0];
      const [files] = await pool.query(
        'SELECT * FROM medical_files WHERE medical_record_id = ? ORDER BY uploaded_at',
        [medicalRecords[0].id]
      );
      appointment.medical_record.files = files;
    } else {
      appointment.medical_record = null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.scheduled_at);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      appointment.time_status = 'past';
    } else if (appointmentDate.getTime() === today.getTime()) {
      appointment.time_status = 'today';
    } else {
      appointment.time_status = 'future';
    }

    return appointment;
  }

  /**
   * Create new appointment with conflict detection
   */
  async create(data, creatingUser) {
    const { petId, doctorId, scheduledAt, durationMinutes, reason, location, services, reasonId, vaccinationTypeId } = data;

    // Convert ISO 8601 datetime to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const mysqlDatetime = new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ');

    // Determine status based on user role:
    // - Staff (admin/receptionist/doctor) → 'confirmed' (direct booking)
    // - Client → 'proposed' (requires approval)
    const initialStatus = creatingUser.role === 'client' ? 'proposed' : 'confirmed';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (reasonId) {
        const [reasons] = await connection.query(
          'SELECT is_vaccination FROM appointment_reasons WHERE id = ? AND is_active = TRUE',
          [reasonId]
        );

        if (reasons.length === 0) {
          throw new NotFoundError('Appointment reason not found');
        }

        if (reasons[0].is_vaccination && !vaccinationTypeId) {
          throw new ValidationError('Vaccination type is required when booking a vaccination appointment');
        }
      }

      // Validate vaccination type matches pet species
      if (vaccinationTypeId) {
        const [pets] = await connection.query('SELECT species FROM pets WHERE id = ?', [petId]);
        if (pets.length === 0) {
          throw new NotFoundError('Pet');
        }

        const [types] = await connection.query(
          'SELECT species FROM vaccination_types WHERE id = ? AND is_active = TRUE',
          [vaccinationTypeId]
        );

        if (types.length === 0) {
          throw new NotFoundError('Vaccination type not found');
        }

        const vaccineSpecies = types[0].species;
        const petSpecies = pets[0].species;

        // Allow vaccines that are: specific to species, for all species, or for "inne" (other) category
        if (vaccineSpecies !== 'wszystkie' && vaccineSpecies !== 'inne' && vaccineSpecies !== petSpecies) {
          throw new ValidationError(`Selected vaccination type is not compatible with ${petSpecies}`);
        }
      }

      // Check for scheduling conflicts (overlapping appointments)
      // Not just exact time, but also appointments that overlap with this time slot
      const endTime = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60000)
        .toISOString().slice(0, 19).replace('T', ' ');

      const [conflicts] = await connection.query(
        `SELECT id FROM appointments
         WHERE doctor_user_id = ?
         AND status NOT IN ('cancelled', 'cancelled_late')
         AND (
           (scheduled_at <= ? AND DATE_ADD(scheduled_at, INTERVAL duration_minutes MINUTE) > ?)
           OR (scheduled_at < ? AND scheduled_at >= ?)
         )`,
        [doctorId, mysqlDatetime, mysqlDatetime, endTime, mysqlDatetime]
      );

      if (conflicts.length > 0) {
        throw new ConflictError('Doctor is not available at this time - there is a scheduling conflict');
      }

      // Verify pet exists
      const [pets] = await connection.query('SELECT owner_user_id FROM pets WHERE id = ?', [petId]);
      if (pets.length === 0) {
        throw new NotFoundError('Pet');
      }

      // Verify doctor exists and has doctor role
      const [doctors] = await connection.query(
        'SELECT id FROM users WHERE id = ? AND role_id = 3',
        [doctorId]
      );
      if (doctors.length === 0) {
        throw new NotFoundError('Doctor');
      }

      // Insert appointment with dynamic status
      const [result] = await connection.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, scheduled_at, duration_minutes,
         status, reason, location, created_by_user_id, reason_id, vaccination_type_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [petId, doctorId, mysqlDatetime, durationMinutes, initialStatus, reason || null, location || null, creatingUser.id, reasonId || null, vaccinationTypeId || null]
      );

      const appointmentId = result.insertId;

      if (services && services.length > 0) {
        const serviceValues = services.map(s => [
          appointmentId,
          s.serviceId,
          s.quantity || 1,
          s.unitPrice
        ]);

        await connection.query(
          'INSERT INTO appointment_services (appointment_id, service_id, quantity, unit_price) VALUES ?',
          [serviceValues]
        );
        // Note: Payment tracking removed - handled outside system
      }

      await connection.commit();
      return this.getById(appointmentId);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update appointment
   */
  async update(appointmentId, data) {
    const { scheduledAt, durationMinutes, reason, location, services, reasonId, vaccinationTypeId } = data;

    // Convert ISO 8601 datetime to MySQL DATETIME format if provided
    const mysqlDatetime = scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ') : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const appointment = await this.getById(appointmentId);

      if (reasonId !== undefined) {
        if (reasonId !== null) {
          const [reasons] = await connection.query(
            'SELECT is_vaccination FROM appointment_reasons WHERE id = ? AND is_active = TRUE',
            [reasonId]
          );

          if (reasons.length === 0) {
            throw new NotFoundError('Appointment reason not found');
          }

          if (reasons[0].is_vaccination && !vaccinationTypeId && !appointment.vaccination_type_id) {
            throw new ValidationError('Vaccination type is required when booking a vaccination appointment');
          }
        }
      }

      // Validate vaccination type matches pet species
      if (vaccinationTypeId !== undefined && vaccinationTypeId !== null) {
        const [types] = await connection.query(
          'SELECT species FROM vaccination_types WHERE id = ? AND is_active = TRUE',
          [vaccinationTypeId]
        );

        if (types.length === 0) {
          throw new NotFoundError('Vaccination type not found');
        }

        const vaccineSpecies = types[0].species;
        const petSpecies = appointment.species;

        // Allow vaccines that are: specific to species, for all species, or for "inne" (other) category
        if (vaccineSpecies !== 'wszystkie' && vaccineSpecies !== 'inne' && vaccineSpecies !== petSpecies) {
          throw new ValidationError(`Selected vaccination type is not compatible with ${petSpecies}`);
        }
      }

      if (mysqlDatetime && mysqlDatetime !== appointment.scheduled_at) {
        const [conflicts] = await connection.query(
          `SELECT id FROM appointments
           WHERE doctor_user_id = ?
           AND scheduled_at = ?
           AND id != ?
           AND status NOT IN ('cancelled', 'cancelled_late')`,
          [appointment.doctor_user_id, mysqlDatetime, appointmentId]
        );

        if (conflicts.length > 0) {
          throw new ConflictError('Doctor is not available at this time');
        }
      }

      const updates = [];
      const params = [];

      if (mysqlDatetime !== null && mysqlDatetime !== undefined) {
        updates.push('scheduled_at = ?');
        params.push(mysqlDatetime);
      }
      if (durationMinutes !== undefined) {
        updates.push('duration_minutes = ?');
        params.push(durationMinutes);
      }
      if (reason !== undefined) {
        updates.push('reason = ?');
        params.push(reason);
      }
      if (location !== undefined) {
        updates.push('location = ?');
        params.push(location);
      }
      if (reasonId !== undefined) {
        updates.push('reason_id = ?');
        params.push(reasonId);
      }
      if (vaccinationTypeId !== undefined) {
        updates.push('vaccination_type_id = ?');
        params.push(vaccinationTypeId);
      }

      if (updates.length > 0) {
        params.push(appointmentId);
        await connection.query(
          `UPDATE appointments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
      }

      if (services !== undefined) {
        await connection.query('DELETE FROM appointment_services WHERE appointment_id = ?', [appointmentId]);

        if (services.length > 0) {
          const serviceValues = services.map(s => [
            appointmentId,
            s.serviceId,
            s.quantity || 1,
            s.unitPrice
          ]);

          await connection.query(
            'INSERT INTO appointment_services (appointment_id, service_id, quantity, unit_price) VALUES ?',
            [serviceValues]
          );
        }
      }

      await connection.commit();
      return this.getById(appointmentId);

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update appointment status
   * @param {number} appointmentId
   * @param {string} status
   * @param {object} options - Optional parameters
   * @param {boolean} options.vaccinationPerformed - If true, create vaccination record (for vaccination appointments)
   */
  async updateStatus(appointmentId, status, options = {}) {
    // Validate status
    const validStatuses = ['proposed', 'confirmed', 'in_progress', 'completed', 'cancelled', 'cancelled_late'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    const appointment = await this.getById(appointmentId);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, appointmentId]
      );

      // Auto-create penalty for late cancellations
      if (status === 'cancelled_late') {
        await penaltiesService.createLateCancellationPenalty(
          appointmentId,
          appointment.client_id,
          appointment.scheduled_at
        );
      }

    let vaccinationCreated = false;
    let vaccinationId = null;
    let vaccinationError = null;
    let medicalRecordCreated = false;
    let medicalRecordId = null;

    // Auto-create vaccination record when vaccination appointment is completed
    // ONLY if doctor explicitly confirms vaccination was performed
    if (status === 'completed' &&
        appointment.reason_is_vaccination &&
        appointment.vaccination_type_id &&
        options.vaccinationPerformed === true) {

      try {
        const [doctors] = await pool.query(
          'SELECT id, first_name, last_name FROM users WHERE id = ?',
          [appointment.doctor_user_id]
        );

        if (doctors.length > 0) {
          const administeringDoctor = {
            id: doctors[0].id,
            first_name: doctors[0].first_name,
            last_name: doctors[0].last_name,
            role: 'doctor'
          };

          // Create vaccination record
          const vaccinationDate = new Date(appointment.scheduled_at).toISOString().split('T')[0];
          const vaccination = await vaccinationsService.createFromAppointment(
            {
              appointmentId: appointmentId,
              petId: appointment.pet_id,
              vaccinationTypeId: appointment.vaccination_type_id,
              vaccinationDate: vaccinationDate,
              batchNumber: null,
              notes: appointment.reason || null
            },
            administeringDoctor
          );

          vaccinationCreated = true;
          vaccinationId = vaccination.id;
          console.log(`[Auto-Vaccination] Created vaccination record ${vaccinationId} for appointment ${appointmentId}`);

          try {
            const [vaccinationTypes] = await pool.query(
              'SELECT name FROM vaccination_types WHERE id = ?',
              [appointment.vaccination_type_id]
            );

            const vaccinationTypeName = vaccinationTypes.length > 0 ? vaccinationTypes[0].name : 'szczepienie';

            const medicalRecord = await medicalRecordsService.create(
              {
                appointmentId: appointmentId,
                notes: `Wizyta szczepienia: ${vaccinationTypeName}\n\nSzczepienie zostało wykonane pomyślnie.`,
                diagnosis: `Szczepienie: ${vaccinationTypeName}`,
                treatment: `Podano szczepionkę: ${vaccinationTypeName}`,
                prescription: null
              },
              appointment.doctor_user_id
            );

            medicalRecordCreated = true;
            medicalRecordId = medicalRecord.id;
            console.log(`[Auto-Medical-Record] Created medical record ${medicalRecordId} for performed vaccination in appointment ${appointmentId}`);
          } catch (medRecordError) {
            console.error(`[Auto-Medical-Record] Failed to create medical record for performed vaccination in appointment ${appointmentId}:`, medRecordError);
          }
        }
      } catch (error) {
        // Log error but don't fail the status update
        vaccinationError = error.message;
        console.error(`[Auto-Vaccination] Failed to create vaccination record for appointment ${appointmentId}:`, error);
      }
    } else if (status === 'completed' &&
               appointment.reason_is_vaccination &&
               appointment.vaccination_type_id &&
               options.vaccinationPerformed === false) {
      // Auto-create medical record documenting that vaccination was NOT performed
      try {
        const [vaccinationTypes] = await pool.query(
          'SELECT name FROM vaccination_types WHERE id = ?',
          [appointment.vaccination_type_id]
        );

        const vaccinationTypeName = vaccinationTypes.length > 0 ? vaccinationTypes[0].name : 'szczepienie';

        const medicalRecord = await medicalRecordsService.create(
          {
            appointmentId: appointmentId,
            notes: `Wizyta szczepienia: ${vaccinationTypeName}\n\nSzczepienie NIE zostało wykonane podczas tej wizyty.`,
            diagnosis: null,
            treatment: null,
            prescription: null
          },
          appointment.doctor_user_id
        );

        medicalRecordCreated = true;
        medicalRecordId = medicalRecord.id;
        console.log(`[Auto-Medical-Record] Created medical record ${medicalRecordId} for non-performed vaccination in appointment ${appointmentId}`);
      } catch (error) {
        console.error(`[Auto-Medical-Record] Failed to create medical record for non-performed vaccination in appointment ${appointmentId}:`, error);
      }
    }

      await connection.commit();

      const updatedAppointment = await this.getById(appointmentId);

      // Add vaccination and medical record metadata to response
      return {
        ...updatedAppointment,
        vaccinationCreated,
        vaccinationId,
        vaccinationError,
        medicalRecordCreated,
        medicalRecordId
      };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete appointment
   */
  async delete(appointmentId) {
    await this.getById(appointmentId);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('DELETE FROM appointment_services WHERE appointment_id = ?', [appointmentId]);

      await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);

      await connection.commit();
      return { message: 'Appointment deleted successfully' };

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Check doctor availability at specific time
   */
  async checkAvailability(doctorId, scheduledAt, durationMinutes, excludeAppointmentId = null) {
    return slotAvailabilityService.checkAvailability(doctorId, scheduledAt, durationMinutes, excludeAppointmentId);
  }

  /**
   * Get available time slots for a doctor on a specific date
   * Delegates to SlotAvailabilityService
   *
   * @param {number} doctorId - Doctor's user ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {object|null} user - User object for role-based time blocking
   * @returns {Promise<Array<{time: string, available: boolean}>>} Array of time slots
   */
  async getAvailableSlots(doctorId, date, user = null) {
    return slotAvailabilityService.getAvailableSlots(doctorId, date, user);
  }

  /**
   * Cancel appointment with business logic (time-based rules)
   * @param {number} appointmentId
   * @param {object} user - User object from auth
   * @returns {object} - Cancellation result
   */
  async cancelAppointment(appointmentId, user) {
    // Get appointment details
    const appointment = await this.getById(appointmentId);

    // Check ownership (client can only cancel their own appointments)
    if (user.role === 'client' && appointment.client_id !== user.id) {
      throw new ForbiddenError('You can only cancel your own appointments');
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled' || appointment.status === 'cancelled_late') {
      throw new ValidationError('Appointment is already cancelled');
    }

    // Check if completed
    if (appointment.status === 'completed') {
      throw new ValidationError('Cannot cancel completed appointment');
    }

    // Apply business rules
    const cancellationType = APPOINTMENT_RULES.getCancellationType(appointment.scheduled_at);

    if (!cancellationType.canCancel) {
      throw new ValidationError(cancellationType.message);
    }

    // Update appointment status
    const updateData = {
      status: cancellationType.status,
    };

    // If late cancellation with fee
    if (cancellationType.hasFee) {
      const hoursUntil = APPOINTMENT_RULES.getHoursUntilAppointment(appointment.scheduled_at);
      updateData.late_cancellation_fee = cancellationType.fee;
      updateData.late_cancellation_fee_paid = false;
      updateData.late_cancellation_fee_note = `Anulowano ${hoursUntil.toFixed(1)}h przed wizytą`;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);

      await connection.query(
        `UPDATE appointments SET ${updateFields}, updated_at = NOW() WHERE id = ?`,
        [...updateValues, appointmentId]
      );

      await connection.commit();

      return {
        message: 'Appointment cancelled successfully',
        status: cancellationType.status,
        hasFee: cancellationType.hasFee,
        fee: cancellationType.fee || null,
        warning: cancellationType.message,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Request to reschedule appointment
   * @param {number} appointmentId
   * @param {string} newScheduledAt - New requested time
   * @param {object} user - User object from auth
   * @param {string} clientNote - Optional note from client
   * @returns {object} - Reschedule request
   */
  async requestReschedule(appointmentId, newScheduledAt, user, clientNote = null) {
    const appointment = await this.getById(appointmentId);

    if (user.role === 'client' && appointment.client_id !== user.id) {
      throw new ForbiddenError('You can only reschedule your own appointments');
    }

    if (['cancelled', 'cancelled_late', 'completed'].includes(appointment.status)) {
      throw new ValidationError(`Cannot reschedule ${appointment.status} appointment`);
    }

    const rescheduleCheck = APPOINTMENT_RULES.canReschedule(appointment.scheduled_at);

    if (!rescheduleCheck.canReschedule) {
      throw new ValidationError(rescheduleCheck.message);
    }

    const newDateTime = new Date(newScheduledAt);
    if (newDateTime < new Date()) {
      throw new ValidationError('New appointment time must be in the future');
    }

    const [existingRequests] = await pool.query(
      `SELECT id FROM appointment_reschedule_requests
       WHERE appointment_id = ? AND status = 'pending'`,
      [appointmentId]
    );

    if (existingRequests.length > 0) {
      throw new ValidationError('There is already a pending reschedule request for this appointment');
    }

    const [result] = await pool.query(
      `INSERT INTO appointment_reschedule_requests
       (appointment_id, old_scheduled_at, new_scheduled_at, requested_by, client_note)
       VALUES (?, ?, ?, ?, ?)`,
      [appointmentId, appointment.scheduled_at, newScheduledAt, user.id, clientNote]
    );

    return {
      message: 'Reschedule request submitted successfully. Awaiting receptionist approval.',
      requestId: result.insertId,
      oldTime: appointment.scheduled_at,
      newTime: newScheduledAt,
      status: 'pending',
    };
  }

  /**
   * Get all reschedule requests (for receptionist)
   * @param {string} status - Filter by status (optional)
   * @returns {array} - List of reschedule requests
   */
  async getRescheduleRequests(status = null) {
    let query = `
      SELECT
        rr.*,
        a.reason as appointment_reason,
        CONCAT(client.first_name, ' ', client.last_name) as client_name,
        client.phone as client_phone,
        CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name,
        p.name as pet_name,
        p.species,
        CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name
      FROM appointment_reschedule_requests rr
      JOIN appointments a ON rr.appointment_id = a.id
      JOIN users client ON rr.requested_by = client.id
      JOIN users doctor ON a.doctor_user_id = doctor.id
      JOIN pets p ON a.pet_id = p.id
      LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND rr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY rr.requested_at DESC';

    const [requests] = await pool.query(query, params);
    return requests;
  }

  /**
   * Approve reschedule request
   * @param {number} requestId
   * @param {number} reviewerUserId - Receptionist user ID
   * @returns {object} - Approval result
   */
  async approveReschedule(requestId, reviewerUserId) {
    const [requests] = await pool.query(
      `SELECT rr.*, a.status as appointment_status
       FROM appointment_reschedule_requests rr
       JOIN appointments a ON rr.appointment_id = a.id
       WHERE rr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      throw new NotFoundError('Reschedule request not found');
    }

    const request = requests[0];

    if (request.status !== 'pending') {
      throw new ValidationError(`Request has already been ${request.status}`);
    }

    if (['cancelled', 'cancelled_late', 'completed'].includes(request.appointment_status)) {
      throw new ValidationError(`Cannot reschedule ${request.appointment_status} appointment`);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE appointments
         SET scheduled_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [request.new_scheduled_at, request.appointment_id]
      );

      await connection.query(
        `UPDATE appointment_reschedule_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reviewerUserId, requestId]
      );

      await connection.commit();

      return {
        message: 'Reschedule request approved successfully',
        appointmentId: request.appointment_id,
        newTime: request.new_scheduled_at,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject reschedule request
   * @param {number} requestId
   * @param {number} reviewerUserId - Receptionist user ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {object} - Rejection result
   */
  async rejectReschedule(requestId, reviewerUserId, rejectionReason = null) {
    const [requests] = await pool.query(
      'SELECT * FROM appointment_reschedule_requests WHERE id = ?',
      [requestId]
    );

    if (requests.length === 0) {
      throw new NotFoundError('Reschedule request not found');
    }

    const request = requests[0];

    if (request.status !== 'pending') {
      throw new ValidationError(`Request has already been ${request.status}`);
    }

    // Update request status
    await pool.query(
      `UPDATE appointment_reschedule_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
      [reviewerUserId, rejectionReason, requestId]
    );

    return {
      message: 'Reschedule request rejected',
      appointmentId: request.appointment_id,
      reason: rejectionReason,
    };
  }

  /**
   * Force reschedule appointment by staff (receptionist/admin)
   * Directly changes the appointment time and notifies the client via email
   * @param {number} appointmentId
   * @param {string} newScheduledAt - New appointment time (ISO string)
   * @param {number} staffUserId - Staff member performing the reschedule
   * @param {string} reason - Optional reason for rescheduling
   * @param {number} newDoctorId - Optional new doctor ID (if changing doctor)
   * @returns {object} - Result with old and new times
   */
  async forceReschedule(appointmentId, newScheduledAt, staffUserId, reason = null, newDoctorId = null) {
    return appointmentRescheduleService.forceReschedule(
      appointmentId,
      newScheduledAt,
      staffUserId,
      reason,
      newDoctorId
    );
  }
}

module.exports = new AppointmentsService();
