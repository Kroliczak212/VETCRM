const { pool } = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

class PetsService {
  /**
   * Get all pets with pagination and filters
   * If user is a client, automatically filter by their ID
   */
  async getAll(query, user) {
    const { limit, offset, page } = parsePagination(query);
    const { ownerId, species, search } = query;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    // If user is a client, only show their pets
    if (user && user.role === 'client') {
      whereClause += ' AND p.owner_user_id = ?';
      params.push(user.id);
    } else if (ownerId) {
      // For staff, allow filtering by ownerId
      whereClause += ' AND p.owner_user_id = ?';
      params.push(ownerId);
    }

    if (species) {
      whereClause += ' AND p.species = ?';
      params.push(species);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.breed LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM pets p ${whereClause}`,
      params
    );
    const totalCount = countResult[0].total;

    // Get paginated pets with owner info
    const [pets] = await pool.query(
      `SELECT p.*,
              CONCAT(u.first_name, ' ', u.last_name) as owner_name,
              u.phone as owner_phone
       FROM pets p
       JOIN users u ON p.owner_user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: pets,
      pagination: buildPaginationMeta(totalCount, page, limit)
    };
  }

  /**
   * Get pet by ID with medical history
   */
  async getById(petId) {
    const [pets] = await pool.query(
      `SELECT p.*,
              CONCAT(u.first_name, ' ', u.last_name) as owner_name,
              u.email as owner_email,
              u.phone as owner_phone
       FROM pets p
       JOIN users u ON p.owner_user_id = u.id
       WHERE p.id = ?`,
      [petId]
    );

    if (pets.length === 0) {
      throw new NotFoundError('Pet');
    }

    const pet = pets[0];

    // Get medical history (recent appointments with medical records)
    const [medicalHistory] = await pool.query(
      `SELECT a.id as appointment_id, a.scheduled_at, a.status,
              mr.diagnosis, mr.treatment, mr.notes,
              CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointments a
       JOIN users doc ON a.doctor_user_id = doc.id
       LEFT JOIN medical_records mr ON a.id = mr.appointment_id
       WHERE a.pet_id = ?
       ORDER BY a.scheduled_at DESC
       LIMIT 10`,
      [petId]
    );

    pet.medical_history = medicalHistory;

    return pet;
  }

  /**
   * Create new pet for a client
   */
  async create(data) {
    const { ownerId, name, species, breed, sex, dateOfBirth, notes, weight, microchipNumber } = data;

    // Verify owner exists and is a client
    const [owners] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND role_id = 4',
      [ownerId]
    );

    if (owners.length === 0) {
      throw new NotFoundError('Client');
    }

    const [result] = await pool.query(
      `INSERT INTO pets (owner_user_id, name, species, breed, sex, date_of_birth, notes, weight, microchip_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, name, species, breed, sex || 'unknown', dateOfBirth || null, notes || null, weight || null, microchipNumber || null]
    );

    const petId = result.insertId;
    return this.getById(petId);
  }

  /**
   * Update pet
   */
  async update(petId, data) {
    const { name, species, breed, sex, dateOfBirth, notes, weight, microchipNumber } = data;

    // Check if pet exists
    await this.getById(petId);

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (species !== undefined) {
      updates.push('species = ?');
      params.push(species);
    }
    if (breed !== undefined) {
      updates.push('breed = ?');
      params.push(breed);
    }
    if (sex !== undefined) {
      updates.push('sex = ?');
      params.push(sex);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      params.push(dateOfBirth);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (weight !== undefined) {
      updates.push('weight = ?');
      params.push(weight);
    }
    if (microchipNumber !== undefined) {
      updates.push('microchip_number = ?');
      params.push(microchipNumber);
    }

    if (updates.length > 0) {
      params.push(petId);
      await pool.query(
        `UPDATE pets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );
    }

    return this.getById(petId);
  }

  /**
   * Delete pet
   */
  async delete(petId) {
    // Check if pet exists
    await this.getById(petId);

    // Note: FK constraints will prevent deletion if appointments exist
    await pool.query('DELETE FROM pets WHERE id = ?', [petId]);

    return { message: 'Pet deleted successfully' };
  }

  /**
   * Get available species (for dropdowns)
   */
  async getSpecies() {
    // This could come from database enum or a separate table
    // For now, return common species
    return [
      { value: 'dog', label: 'Pies' },
      { value: 'cat', label: 'Kot' },
      { value: 'bird', label: 'Ptak' },
      { value: 'rabbit', label: 'Królik' },
      { value: 'hamster', label: 'Chomik' },
      { value: 'other', label: 'Inne' }
    ];
  }
}

module.exports = new PetsService();
