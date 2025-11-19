const { pool } = require('../config/database');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Vaccinations Service
 * Handles vaccination records with two sources:
 * 1. Manual entries (by owner/receptionist/doctor)
 * 2. Auto-generated from completed appointments
 */
class VaccinationsService {
  /**
   * Calculate vaccination status based on next_due_date
   * @private
   */
  _calculateStatus(nextDueDate) {
    if (!nextDueDate) return null;
    const today = new Date();
    const dueDate = new Date(nextDueDate);
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 30) return 'due_soon';
    return 'current';
  }

  /**
   * Get all vaccinations with pagination and filters
   * Automatically filters by user's pets if user is a client
   */
  async getAll(query, user) {
    const { limit, offset, page } = parsePagination(query);
    const { petId, status, source } = query;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    // If user is a client, only show vaccinations for their pets
    if (user && user.role === 'client') {
      whereClause += ' AND p.owner_user_id = ?';
      params.push(user.id);
    }

    if (petId) {
      whereClause += ' AND v.pet_id = ?';
      params.push(petId);
    }

    if (source) {
      whereClause += ' AND v.source = ?';
      params.push(source);
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM vaccinations v
       JOIN pets p ON v.pet_id = p.id
       ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    // Get paginated vaccinations with related data
    const [vaccinations] = await pool.query(
      `SELECT v.*,
              p.name as pet_name,
              p.species,
              CONCAT(u.first_name, ' ', u.last_name) as owner_name,
              CONCAT(doc.first_name, ' ', doc.last_name) as administered_by_name,
              CONCAT(adder.first_name, ' ', adder.last_name) as added_by_name,
              adder_role.name as added_by_role,
              vt.name as vaccination_type_name,
              vt.recommended_interval_months
       FROM vaccinations v
       JOIN pets p ON v.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       LEFT JOIN users doc ON v.administered_by_user_id = doc.id
       LEFT JOIN users adder ON v.added_by_user_id = adder.id
       LEFT JOIN roles adder_role ON adder.role_id = adder_role.id
       LEFT JOIN vaccination_types vt ON v.vaccination_type_id = vt.id
       ${whereClause}
       ORDER BY v.vaccination_date DESC, v.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Add computed status field
    const vaccinationsWithStatus = vaccinations.map(vac => ({
      ...vac,
      status: this._calculateStatus(vac.next_due_date)
    }));

    // Filter by status if requested (after computing)
    let filteredVaccinations = vaccinationsWithStatus;
    if (status) {
      filteredVaccinations = vaccinationsWithStatus.filter(v => v.status === status);
    }

    return {
      data: filteredVaccinations,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get vaccination by ID
   */
  async getById(vaccinationId, user) {
    const [vaccinations] = await pool.query(
      `SELECT v.*,
              p.name as pet_name,
              p.species,
              p.owner_user_id,
              CONCAT(u.first_name, ' ', u.last_name) as owner_name,
              CONCAT(doc.first_name, ' ', doc.last_name) as administered_by_name,
              CONCAT(adder.first_name, ' ', adder.last_name) as added_by_name,
              adder_role.name as added_by_role,
              vt.name as vaccination_type_name,
              vt.recommended_interval_months
       FROM vaccinations v
       JOIN pets p ON v.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       LEFT JOIN users doc ON v.administered_by_user_id = doc.id
       LEFT JOIN users adder ON v.added_by_user_id = adder.id
       LEFT JOIN roles adder_role ON adder.role_id = adder_role.id
       LEFT JOIN vaccination_types vt ON v.vaccination_type_id = vt.id
       WHERE v.id = ?`,
      [vaccinationId]
    );

    if (vaccinations.length === 0) {
      throw new NotFoundError('Vaccination record not found');
    }

    const vaccination = vaccinations[0];

    // Check access rights
    if (user && user.role === 'client' && vaccination.owner_user_id !== user.id) {
      throw new ForbiddenError('You can only view vaccinations for your own pets');
    }

    return {
      ...vaccination,
      status: this._calculateStatus(vaccination.next_due_date)
    };
  }

  /**
   * Create vaccination record - base method
   * @private - use createManual() or createFromAppointment() instead
   */
  async _create(data, user) {
    const {
      petId,
      vaccineName,
      vaccinationDate,
      nextDueDate,
      batchNumber,
      appointmentId,
      notes,
      vaccinationTypeId,
      source = 'manual',
      administeredByUserId,
      addedByUserId
    } = data;

    // Verify pet exists
    const [pets] = await pool.query('SELECT id, owner_user_id, species FROM pets WHERE id = ?', [petId]);
    if (pets.length === 0) {
      throw new NotFoundError('Pet not found');
    }

    // If vaccination type is provided, verify it exists and matches species
    if (vaccinationTypeId) {
      const [types] = await pool.query(
        'SELECT * FROM vaccination_types WHERE id = ? AND is_active = TRUE',
        [vaccinationTypeId]
      );
      if (types.length === 0) {
        throw new NotFoundError('Vaccination type not found');
      }

      const type = types[0];
      // Check species match (or type is for 'wszystkie')
      if (type.species !== 'wszystkie' && type.species !== pets[0].species) {
        throw new BadRequestError(`Vaccination type ${type.name} is not for ${pets[0].species}`);
      }
    }

    // Calculate next_due_date if not provided
    let calculatedNextDue = nextDueDate;
    if (!calculatedNextDue && vaccinationTypeId) {
      // Use recommended interval from vaccination type
      const [types] = await pool.query(
        'SELECT recommended_interval_months FROM vaccination_types WHERE id = ?',
        [vaccinationTypeId]
      );
      if (types[0]?.recommended_interval_months) {
        const vaccDate = new Date(vaccinationDate);
        vaccDate.setMonth(vaccDate.getMonth() + types[0].recommended_interval_months);
        calculatedNextDue = vaccDate.toISOString().split('T')[0];
      }
    }

    // Default to +1 year if still no next_due_date
    if (!calculatedNextDue) {
      const vaccDate = new Date(vaccinationDate);
      vaccDate.setFullYear(vaccDate.getFullYear() + 1);
      calculatedNextDue = vaccDate.toISOString().split('T')[0];
    }

    const [result] = await pool.query(
      `INSERT INTO vaccinations
       (pet_id, vaccine_name, vaccination_date, next_due_date, batch_number,
        administered_by_user_id, appointment_id, notes, vaccination_type_id, source, added_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        petId,
        vaccineName,
        vaccinationDate,
        calculatedNextDue,
        batchNumber || null,
        administeredByUserId || null,
        appointmentId || null,
        notes || null,
        vaccinationTypeId || null,
        source,
        addedByUserId || user.id
      ]
    );

    return this.getById(result.insertId, user);
  }

  /**
   * Create manual vaccination entry
   * Can be added by: owner, receptionist, or doctor
   * Tracks who added it via added_by_user_id
   */
  async createManual(data, user) {
    const {
      petId,
      vaccinationTypeId,
      vaccineName,
      vaccinationDate,
      nextDueDate,
      batchNumber,
      notes
    } = data;

    // Verify pet access
    const [pets] = await pool.query(
      'SELECT id, owner_user_id FROM pets WHERE id = ?',
      [petId]
    );

    if (pets.length === 0) {
      throw new NotFoundError('Pet not found');
    }

    // Only allow owner or staff to manually add vaccinations
    if (user.role === 'client' && pets[0].owner_user_id !== user.id) {
      throw new ForbiddenError('You can only add vaccinations for your own pets');
    }

    // Get vaccine name from type if not provided
    let finalVaccineName = vaccineName;
    if (!finalVaccineName && vaccinationTypeId) {
      const [types] = await pool.query(
        'SELECT name FROM vaccination_types WHERE id = ?',
        [vaccinationTypeId]
      );
      if (types.length > 0) {
        finalVaccineName = types[0].name;
      }
    }

    if (!finalVaccineName) {
      throw new BadRequestError('Either vaccinationTypeId or vaccineName must be provided');
    }

    return this._create({
      petId,
      vaccineName: finalVaccineName,
      vaccinationDate,
      nextDueDate,
      batchNumber,
      notes,
      vaccinationTypeId,
      source: 'manual',
      administeredByUserId: null, // Unknown for manual entries
      addedByUserId: user.id
    }, user);
  }

  /**
   * Create vaccination record from completed appointment
   * Called automatically when appointment with vaccination is completed
   * @param {Object} appointmentData - appointment details
   */
  async createFromAppointment(appointmentData, administeringDoctor) {
    const {
      appointmentId,
      petId,
      vaccinationTypeId,
      vaccinationDate,
      batchNumber,
      notes
    } = appointmentData;

    if (!vaccinationTypeId) {
      throw new BadRequestError('Vaccination type is required for appointment-based vaccination');
    }

    // Get vaccination type details
    const [types] = await pool.query(
      'SELECT name FROM vaccination_types WHERE id = ?',
      [vaccinationTypeId]
    );

    if (types.length === 0) {
      throw new NotFoundError('Vaccination type not found');
    }

    const vaccineName = types[0].name;

    return this._create({
      petId,
      vaccineName,
      vaccinationDate,
      batchNumber,
      notes,
      appointmentId,
      vaccinationTypeId,
      source: 'appointment',
      administeredByUserId: administeringDoctor.id,
      addedByUserId: administeringDoctor.id
    }, administeringDoctor);
  }

  /**
   * Update vaccination
   * Only staff and doctors can update
   */
  async update(vaccinationId, data, user) {
    const vaccination = await this.getById(vaccinationId, user);

    // Only staff and doctors can update
    if (!['admin', 'doctor', 'receptionist'].includes(user.role)) {
      throw new ForbiddenError('Only staff can update vaccination records');
    }

    const {
      vaccineName,
      vaccinationDate,
      nextDueDate,
      batchNumber,
      notes,
      vaccinationTypeId
    } = data;

    const updates = [];
    const params = [];

    if (vaccineName !== undefined) {
      updates.push('vaccine_name = ?');
      params.push(vaccineName);
    }
    if (vaccinationDate !== undefined) {
      updates.push('vaccination_date = ?');
      params.push(vaccinationDate);
    }
    if (nextDueDate !== undefined) {
      updates.push('next_due_date = ?');
      params.push(nextDueDate);
    }
    if (batchNumber !== undefined) {
      updates.push('batch_number = ?');
      params.push(batchNumber || null);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (vaccinationTypeId !== undefined) {
      updates.push('vaccination_type_id = ?');
      params.push(vaccinationTypeId || null);
    }

    if (updates.length > 0) {
      await pool.query(
        `UPDATE vaccinations
         SET ${updates.join(', ')}
         WHERE id = ?`,
        [...params, vaccinationId]
      );
    }

    return this.getById(vaccinationId, user);
  }

  /**
   * Delete vaccination
   * Only staff can delete
   */
  async delete(vaccinationId, user) {
    const vaccination = await this.getById(vaccinationId, user);

    // Only staff can delete
    if (!['admin', 'doctor', 'receptionist'].includes(user.role)) {
      throw new ForbiddenError('Only staff can delete vaccination records');
    }

    await pool.query('DELETE FROM vaccinations WHERE id = ?', [vaccinationId]);

    return { message: 'Vaccination deleted successfully' };
  }

  /**
   * Get upcoming vaccinations for a pet
   * Used for reminders/notifications
   */
  async getUpcomingByPet(petId, daysAhead = 90) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const [vaccinations] = await pool.query(
      `SELECT v.*,
              p.name as pet_name,
              p.species,
              vt.name as vaccination_type_name
       FROM vaccinations v
       JOIN pets p ON v.pet_id = p.id
       LEFT JOIN vaccination_types vt ON v.vaccination_type_id = vt.id
       WHERE v.pet_id = ?
         AND v.next_due_date BETWEEN ? AND ?
       ORDER BY v.next_due_date ASC`,
      [petId, today, futureDateStr]
    );

    return vaccinations.map(vac => ({
      ...vac,
      status: this._calculateStatus(vac.next_due_date)
    }));
  }
}

module.exports = new VaccinationsService();
