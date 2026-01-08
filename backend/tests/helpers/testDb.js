/**
 * Test Database Helper
 *
 * Provides utilities for integration tests:
 * - Database connection management
 * - Test data fixtures
 * - Cleanup utilities
 *
 * @file tests/helpers/testDb.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

/**
 * Test database configuration
 * Uses the same database but with test-specific cleanup
 */
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'vetcrm',
  waitForConnections: true,
  connectionLimit: 5
};

let pool = null;

/**
 * Initialize test database connection
 */
async function initTestDb() {
  if (!pool) {
    pool = mysql.createPool(testDbConfig);
  }
  return pool;
}

/**
 * Close test database connection
 */
async function closeTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Get test database pool
 */
function getTestPool() {
  return pool;
}

/**
 * Create a test user
 *
 * @param {Object} userData - User data override
 * @returns {Object} Created user with id
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '123456789',
    roleId: 4 // client
  };

  const user = { ...defaultUser, ...userData };
  const passwordHash = await bcrypt.hash(user.password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [user.email, passwordHash, user.firstName, user.lastName, user.phone, user.roleId]
  );

  return {
    id: result.insertId,
    ...user,
    passwordHash
  };
}

/**
 * Create a test pet
 *
 * @param {number} ownerId - Owner user ID
 * @param {Object} petData - Pet data override
 * @returns {Object} Created pet with id
 */
async function createTestPet(ownerId, petData = {}) {
  const defaultPet = {
    name: `TestPet_${Date.now()}`,
    species: 'Pies',
    breed: 'Labrador',
    birthDate: '2020-01-01',
    gender: 'male',
    weight: 25.5
  };

  const pet = { ...defaultPet, ...petData };

  const [result] = await pool.query(
    `INSERT INTO pets (owner_user_id, name, species, breed, birth_date, gender, weight)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, pet.name, pet.species, pet.breed, pet.birthDate, pet.gender, pet.weight]
  );

  return {
    id: result.insertId,
    ownerId,
    ...pet
  };
}

/**
 * Create a test doctor
 *
 * @param {Object} userData - User data override
 * @returns {Object} Created doctor user
 */
async function createTestDoctor(userData = {}) {
  return createTestUser({
    email: `doctor_${Date.now()}@vetcrm.pl`,
    firstName: 'Dr',
    lastName: 'TestDoctor',
    roleId: 2, // doctor role
    ...userData
  });
}

/**
 * Create test working hours for a doctor
 *
 * @param {number} doctorId - Doctor user ID
 * @param {string} dayOfWeek - Day name (monday, tuesday, etc.)
 * @param {string} startTime - Start time (HH:MM:SS)
 * @param {string} endTime - End time (HH:MM:SS)
 */
async function createTestWorkingHours(doctorId, dayOfWeek = 'monday', startTime = '08:00:00', endTime = '16:00:00') {
  const [result] = await pool.query(
    `INSERT INTO working_hours (doctor_user_id, day_of_week, start_time, end_time, is_active)
     VALUES (?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE start_time = ?, end_time = ?, is_active = TRUE`,
    [doctorId, dayOfWeek, startTime, endTime, startTime, endTime]
  );

  return {
    id: result.insertId,
    doctorId,
    dayOfWeek,
    startTime,
    endTime
  };
}

/**
 * Create a test appointment
 *
 * @param {Object} appointmentData - Appointment data
 * @returns {Object} Created appointment with id
 */
async function createTestAppointment(appointmentData) {
  const {
    petId,
    doctorId,
    clientId,
    scheduledAt,
    status = 'scheduled',
    durationMinutes = 45,
    notes = 'Test appointment'
  } = appointmentData;

  const [result] = await pool.query(
    `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [petId, doctorId, clientId, scheduledAt, status, durationMinutes, notes]
  );

  return {
    id: result.insertId,
    ...appointmentData,
    status,
    durationMinutes,
    notes
  };
}

/**
 * Create a test vaccination
 *
 * @param {Object} vaccinationData - Vaccination data
 * @returns {Object} Created vaccination with id
 */
async function createTestVaccination(vaccinationData) {
  const {
    petId,
    vaccineName = 'Test Vaccine',
    vaccinationDate = new Date().toISOString().split('T')[0],
    nextDueDate = null,
    source = 'manual',
    addedByUserId
  } = vaccinationData;

  const [result] = await pool.query(
    `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, source, added_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, vaccineName, vaccinationDate, nextDueDate, source, addedByUserId]
  );

  return {
    id: result.insertId,
    ...vaccinationData,
    vaccineName,
    vaccinationDate,
    source
  };
}

/**
 * Clean up test data by prefix
 * Removes users, pets, appointments with test_ prefix in email/name
 */
async function cleanupTestData() {
  try {
    // Delete test appointments first (foreign key constraints)
    await pool.query(
      `DELETE a FROM appointments a
       JOIN users u ON a.client_user_id = u.id
       WHERE u.email LIKE 'test_%' OR u.email LIKE 'doctor_%'`
    );

    // Delete test vaccinations
    await pool.query(
      `DELETE v FROM vaccinations v
       JOIN pets p ON v.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       WHERE u.email LIKE 'test_%'`
    );

    // Delete test pets
    await pool.query(
      `DELETE p FROM pets p
       JOIN users u ON p.owner_user_id = u.id
       WHERE u.email LIKE 'test_%'`
    );

    // Delete test working hours
    await pool.query(
      `DELETE wh FROM working_hours wh
       JOIN users u ON wh.doctor_user_id = u.id
       WHERE u.email LIKE 'doctor_%'`
    );

    // Delete test tokens
    await pool.query(
      `DELETE t FROM token_blacklist t
       JOIN users u ON t.user_id = u.id
       WHERE u.email LIKE 'test_%' OR u.email LIKE 'doctor_%'`
    );

    // Delete test password reset tokens
    await pool.query(
      `DELETE prt FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE u.email LIKE 'test_%'`
    );

    // Delete test users
    await pool.query(
      `DELETE FROM users WHERE email LIKE 'test_%' OR email LIKE 'doctor_%'`
    );
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

/**
 * Get role ID by name
 *
 * @param {string} roleName - Role name (admin, doctor, receptionist, client)
 * @returns {number} Role ID
 */
async function getRoleId(roleName) {
  const [roles] = await pool.query(
    'SELECT id FROM roles WHERE name = ?',
    [roleName]
  );

  if (roles.length === 0) {
    throw new Error(`Role '${roleName}' not found`);
  }

  return roles[0].id;
}

module.exports = {
  initTestDb,
  closeTestDb,
  getTestPool,
  createTestUser,
  createTestPet,
  createTestDoctor,
  createTestWorkingHours,
  createTestAppointment,
  createTestVaccination,
  cleanupTestData,
  getRoleId
};
