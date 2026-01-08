/**
 * Integration Tests for Vaccinations
 *
 * Tests vaccination management including:
 * - Creating manual vaccinations
 * - Getting vaccinations with filters
 * - Role-based access control
 * - Status calculation
 *
 * Convention: GWT (Given-When-Then)
 *
 * @file tests/integration/vaccinations.integration.test.js
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');

const vaccinationsRoutes = require('../../src/routes/vaccinations.routes');
const { pool } = require('../../src/config/database');
const config = require('../../src/config');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
      } catch (err) {
        // Invalid token
      }
    }
    next();
  });

  app.use('/api/vaccinations', vaccinationsRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    });
  });

  return app;
};

describe('Vaccinations Integration Tests', () => {
  let app;
  let testClient;
  let testDoctor;
  let testPet;
  let clientToken;
  let doctorToken;

  // Helper to generate JWT
  const generateTestToken = (user) => {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        jti: `test_${Date.now()}`
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  };

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    const timestamp = Date.now();

    // Create test client
    const clientPasswordHash = await bcrypt.hash('ClientPass123!', 10);
    const [clientResult] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, 4, TRUE)`,
      [`test_client_${timestamp}@example.com`, clientPasswordHash, 'Test', 'Client', '111111111']
    );
    testClient = {
      id: clientResult.insertId,
      email: `test_client_${timestamp}@example.com`,
      role: 'client'
    };
    clientToken = generateTestToken(testClient);

    // Create test doctor
    const doctorPasswordHash = await bcrypt.hash('DoctorPass123!', 10);
    const [doctorResult] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, 2, TRUE)`,
      [`doctor_${timestamp}@vetcrm.pl`, doctorPasswordHash, 'Dr', 'Test', '222222222']
    );
    testDoctor = {
      id: doctorResult.insertId,
      email: `doctor_${timestamp}@vetcrm.pl`,
      role: 'doctor'
    };
    doctorToken = generateTestToken(testDoctor);

    // Create test pet
    const [petResult] = await pool.query(
      `INSERT INTO pets (owner_user_id, name, species, breed, date_of_birth, sex)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testClient.id, `TestPet_${timestamp}`, 'Pies', 'Labrador', '2020-01-01', 'male']
    );
    testPet = {
      id: petResult.insertId,
      name: `TestPet_${timestamp}`
    };
  });

  afterEach(async () => {
    try {
      // Cleanup in order
      await pool.query('DELETE FROM vaccinations WHERE pet_id = ?', [testPet?.id]);
      await pool.query('DELETE FROM pets WHERE owner_user_id = ?', [testClient?.id]);
      await pool.query('DELETE FROM users WHERE id IN (?, ?)', [testClient?.id, testDoctor?.id]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/vaccinations', () => {
    test('Given valid vaccination data, When creating as pet owner, Then should create vaccination', async () => {
      // Given
      const vaccinationData = {
        petId: testPet.id,
        vaccineName: 'Nobivac DHPPi',
        vaccinationDate: '2024-06-15',
        nextDueDate: '2025-06-15',
        notes: 'Annual vaccination'
      };

      // When
      const response = await request(app)
        .post('/api/vaccinations')
        .send(vaccinationData)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect('Content-Type', /json/);

      // Then
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vaccine_name).toBe('Nobivac DHPPi');
      expect(response.body.source).toBe('manual');
      expect(response.body.pet_id).toBe(testPet.id);
    });

    test('Given pet owned by another user, When creating vaccination, Then should return 403', async () => {
      // Given - Create another client
      const otherClientHash = await bcrypt.hash('OtherPass123!', 10);
      const [otherResult] = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active)
         VALUES (?, ?, ?, ?, ?, 4, TRUE)`,
        [`test_other_${Date.now()}@example.com`, otherClientHash, 'Other', 'Client', '333333333']
      );
      const otherClient = {
        id: otherResult.insertId,
        email: `test_other_${Date.now()}@example.com`,
        role: 'client'
      };
      const otherToken = generateTestToken(otherClient);

      const vaccinationData = {
        petId: testPet.id, // Pet owned by testClient
        vaccineName: 'Test Vaccine',
        vaccinationDate: '2024-06-15'
      };

      // When
      const response = await request(app)
        .post('/api/vaccinations')
        .send(vaccinationData)
        .set('Authorization', `Bearer ${otherToken}`);

      // Then
      expect(response.status).toBe(403);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = ?', [otherClient.id]);
    });

    test('Given doctor user, When creating vaccination for any pet, Then should succeed', async () => {
      // Given
      const vaccinationData = {
        petId: testPet.id,
        vaccineName: 'Rabies Vaccine',
        vaccinationDate: '2024-06-15',
        batchNumber: 'BATCH123'
      };

      // When
      const response = await request(app)
        .post('/api/vaccinations')
        .send(vaccinationData)
        .set('Authorization', `Bearer ${doctorToken}`);

      // Then
      expect(response.status).toBe(201);
      expect(response.body.vaccine_name).toBe('Rabies Vaccine');
      expect(response.body.batch_number).toBe('BATCH123');
    });
  });

  describe('GET /api/vaccinations', () => {
    test('Given vaccinations exist, When getting list as owner, Then should return own pet vaccinations', async () => {
      // Given - Create test vaccination
      await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Test Vaccine', '2024-06-15', testClient.id]
      );

      // When
      const response = await request(app)
        .get('/api/vaccinations')
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // All vaccinations should be for client's pets
      response.body.data.forEach(vac => {
        expect(vac.pet_id).toBe(testPet.id);
      });
    });

    test('Given petId filter, When getting vaccinations, Then should filter by pet', async () => {
      // Given - Create vaccination
      await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Filtered Vaccine', '2024-06-15', testClient.id]
      );

      // When
      const response = await request(app)
        .get('/api/vaccinations')
        .query({ petId: testPet.id })
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      response.body.data.forEach(vac => {
        expect(vac.pet_id).toBe(testPet.id);
      });
    });

    test('Given source filter, When getting vaccinations, Then should filter by source', async () => {
      // Given - Create manual vaccination
      await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Manual Vaccine', '2024-06-15', testClient.id]
      );

      // When
      const response = await request(app)
        .get('/api/vaccinations')
        .query({ source: 'manual' })
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      response.body.data.forEach(vac => {
        expect(vac.source).toBe('manual');
      });
    });
  });

  describe('GET /api/vaccinations/:id', () => {
    test('Given valid vaccination ID, When getting details as owner, Then should return full data', async () => {
      // Given
      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, source, added_by_user_id, notes)
         VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
        [testPet.id, 'Detail Vaccine', '2024-06-15', '2025-06-15', testClient.id, 'Test notes']
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .get(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(vaccinationId);
      expect(response.body.vaccine_name).toBe('Detail Vaccine');
      expect(response.body.notes).toBe('Test notes');
      expect(response.body).toHaveProperty('status'); // Computed status field
    });

    test('Given vaccination for another user pet, When getting details as client, Then should return 403', async () => {
      // Given - Create another client with pet and vaccination
      const otherHash = await bcrypt.hash('OtherPass123!', 10);
      const [otherResult] = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active)
         VALUES (?, ?, ?, ?, ?, 4, TRUE)`,
        [`test_other2_${Date.now()}@example.com`, otherHash, 'Other2', 'Client', '444444444']
      );
      const otherClientId = otherResult.insertId;

      const [otherPetResult] = await pool.query(
        `INSERT INTO pets (owner_user_id, name, species, breed, date_of_birth, sex)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [otherClientId, 'OtherPet', 'Kot', 'Persian', '2021-01-01', 'female']
      );
      const otherPetId = otherPetResult.insertId;

      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [otherPetId, 'Other Vaccine', '2024-06-15', otherClientId]
      );
      const vaccinationId = vacResult.insertId;

      // When - testClient tries to access otherClient's vaccination
      const response = await request(app)
        .get(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(403);

      // Cleanup
      await pool.query('DELETE FROM vaccinations WHERE id = ?', [vaccinationId]);
      await pool.query('DELETE FROM pets WHERE id = ?', [otherPetId]);
      await pool.query('DELETE FROM users WHERE id = ?', [otherClientId]);
    });
  });

  describe('DELETE /api/vaccinations/:id', () => {
    test('Given vaccination exists, When deleting as doctor, Then should succeed', async () => {
      // Given
      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [testPet.id, 'To Delete', '2024-06-15', testClient.id]
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .delete(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const [remaining] = await pool.query('SELECT id FROM vaccinations WHERE id = ?', [vaccinationId]);
      expect(remaining.length).toBe(0);
    });

    test('Given vaccination exists, When deleting as client (non-staff), Then should return 403', async () => {
      // Given
      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, source, added_by_user_id)
         VALUES (?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Cannot Delete', '2024-06-15', testClient.id]
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .delete(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('staff');
    });
  });

  describe('Vaccination Status Calculation', () => {
    test('Given vaccination with past due date, When getting, Then status should be overdue', async () => {
      // Given - Past due date
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, source, added_by_user_id)
         VALUES (?, ?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Overdue Vaccine', '2023-01-15', pastDateStr, testClient.id]
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .get(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('overdue');
    });

    test('Given vaccination with due date in 2 weeks, When getting, Then status should be due_soon', async () => {
      // Given - Due in 14 days
      const dueSoonDate = new Date();
      dueSoonDate.setDate(dueSoonDate.getDate() + 14);
      const dueSoonDateStr = dueSoonDate.toISOString().split('T')[0];

      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, source, added_by_user_id)
         VALUES (?, ?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Due Soon Vaccine', '2023-06-15', dueSoonDateStr, testClient.id]
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .get(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('due_soon');
    });

    test('Given vaccination with due date in 3 months, When getting, Then status should be current', async () => {
      // Given - Due in 90 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const [vacResult] = await pool.query(
        `INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, source, added_by_user_id)
         VALUES (?, ?, ?, ?, 'manual', ?)`,
        [testPet.id, 'Current Vaccine', '2024-01-15', futureDateStr, testClient.id]
      );
      const vaccinationId = vacResult.insertId;

      // When
      const response = await request(app)
        .get(`/api/vaccinations/${vaccinationId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('current');
    });
  });
});
