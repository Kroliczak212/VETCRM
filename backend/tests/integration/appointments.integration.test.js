/**
 * Integration Tests for Appointments
 *
 * Tests appointment management including:
 * - Creating appointments
 * - Getting available slots
 * - Cancellation with business rules
 * - Status updates
 *
 * Convention: GWT (Given-When-Then)
 *
 * @file tests/integration/appointments.integration.test.js
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');

const appointmentsRoutes = require('../../src/routes/appointments.routes');
const authMiddleware = require('../../src/middleware/auth');
const { pool } = require('../../src/config/database');
const config = require('../../src/config');
const APPOINTMENT_RULES = require('../../src/config/appointmentRules');

// Create test app with auth middleware
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth for tests - inject user from token
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
      } catch (err) {
        // Invalid token - continue without user
      }
    }
    next();
  });

  app.use('/api/appointments', appointmentsRoutes);

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

describe('Appointments Integration Tests', () => {
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

  // Helper to create future date
  const getFutureDate = (daysFromNow, hour = 10) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString().slice(0, 19).replace('T', ' ');
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

    // Create working hours for doctor (Monday-Friday 8:00-16:00)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const day of days) {
      await pool.query(
        `INSERT INTO working_hours (doctor_user_id, day_of_week, start_time, end_time, is_active)
         VALUES (?, ?, '08:00:00', '16:00:00', TRUE)`,
        [testDoctor.id, day]
      );
    }

    // Create test pet for client
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
      // Cleanup in order (foreign key constraints)
      await pool.query('DELETE FROM appointments WHERE client_user_id = ?', [testClient?.id]);
      await pool.query('DELETE FROM pets WHERE owner_user_id = ?', [testClient?.id]);
      await pool.query('DELETE FROM working_hours WHERE doctor_user_id = ?', [testDoctor?.id]);
      await pool.query('DELETE FROM users WHERE id IN (?, ?)', [testClient?.id, testDoctor?.id]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/appointments/slots', () => {
    test('Given valid doctor and date, When getting slots, Then should return available time slots', async () => {
      // Given
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 1 week from now

      // Find a weekday
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      const dateStr = futureDate.toISOString().split('T')[0];

      // When
      const response = await request(app)
        .get('/api/appointments/slots')
        .query({
          doctorId: testDoctor.id,
          date: dateStr
        })
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('slots');
      expect(Array.isArray(response.body.slots)).toBe(true);

      // Should have slots from 8:00 to 16:00
      if (response.body.slots.length > 0) {
        expect(response.body.slots[0]).toHaveProperty('time');
        expect(response.body.slots[0]).toHaveProperty('available');
      }
    });

    test('Given weekend date, When getting slots, Then should return empty array', async () => {
      // Given - Find next Saturday
      const saturday = new Date();
      while (saturday.getDay() !== 6) {
        saturday.setDate(saturday.getDate() + 1);
      }
      const dateStr = saturday.toISOString().split('T')[0];

      // When
      const response = await request(app)
        .get('/api/appointments/slots')
        .query({
          doctorId: testDoctor.id,
          date: dateStr
        })
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.slots).toHaveLength(0);
    });
  });

  describe('POST /api/appointments', () => {
    test('Given valid appointment data, When creating appointment, Then should return created appointment', async () => {
      // Given
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Find a weekday
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      futureDate.setHours(10, 0, 0, 0);
      const scheduledAt = futureDate.toISOString();

      const appointmentData = {
        petId: testPet.id,
        doctorId: testDoctor.id,
        scheduledAt: scheduledAt,
        reason: 'Routine checkup'
      };

      // When
      const response = await request(app)
        .post('/api/appointments')
        .send(appointmentData)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect('Content-Type', /json/);

      // Then
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.pet_id).toBe(testPet.id);
      expect(response.body.doctor_user_id).toBe(testDoctor.id);
      expect(response.body.status).toBe('scheduled');
    });

    test('Given conflicting time slot, When creating appointment, Then should return 400 error', async () => {
      // Given - Create first appointment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      futureDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'scheduled', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );

      // When - Try to create at same time
      const response = await request(app)
        .post('/api/appointments')
        .send({
          petId: testPet.id,
          doctorId: testDoctor.id,
          scheduledAt: futureDate.toISOString(),
          reason: 'Another appointment'
        })
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not available');
    });
  });

  describe('POST /api/appointments/:id/cancel', () => {
    test('Given appointment more than 72h away, When cancelling, Then should cancel without fee', async () => {
      // Given - Create appointment 5 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }

      futureDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      const [appointmentResult] = await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'scheduled', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );
      const appointmentId = appointmentResult.insertId;

      // When
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('cancelled');
      expect(response.body.hasFee).toBe(false);

      // Verify in database
      const [updated] = await pool.query('SELECT status FROM appointments WHERE id = ?', [appointmentId]);
      expect(updated[0].status).toBe('cancelled');
    });

    test('Given appointment already cancelled, When cancelling again, Then should return 400', async () => {
      // Given - Create already cancelled appointment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      const [appointmentResult] = await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'cancelled', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );
      const appointmentId = appointmentResult.insertId;

      // When
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already cancelled');
    });

    test('Given appointment completed, When cancelling, Then should return 400', async () => {
      // Given - Create completed appointment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      pastDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = pastDate.toISOString().slice(0, 19).replace('T', ' ');

      const [appointmentResult] = await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'completed', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );
      const appointmentId = appointmentResult.insertId;

      // When
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('completed');
    });
  });

  describe('GET /api/appointments', () => {
    test('Given client with appointments, When getting list, Then should return only own appointments', async () => {
      // Given - Create appointment for test client
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'scheduled', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );

      // When
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All appointments should belong to test client
      response.body.data.forEach(apt => {
        expect(apt.client_user_id).toBe(testClient.id);
      });
    });

    test('Given doctor, When getting appointments, Then should return doctor appointments', async () => {
      // Given - Create appointment with test doctor
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(11, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes)
         VALUES (?, ?, ?, ?, 'scheduled', 45)`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );

      // When
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');

      // All appointments should have test doctor
      response.body.data.forEach(apt => {
        expect(apt.doctor_user_id).toBe(testDoctor.id);
      });
    });
  });

  describe('GET /api/appointments/:id', () => {
    test('Given valid appointment ID, When getting details, Then should return full appointment data', async () => {
      // Given
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(10, 0, 0, 0);
      const mysqlDatetime = futureDate.toISOString().slice(0, 19).replace('T', ' ');

      const [appointmentResult] = await pool.query(
        `INSERT INTO appointments (pet_id, doctor_user_id, client_user_id, scheduled_at, status, duration_minutes, notes)
         VALUES (?, ?, ?, ?, 'scheduled', 45, 'Test notes')`,
        [testPet.id, testDoctor.id, testClient.id, mysqlDatetime]
      );
      const appointmentId = appointmentResult.insertId;

      // When
      const response = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(appointmentId);
      expect(response.body.pet_id).toBe(testPet.id);
      expect(response.body.notes).toBe('Test notes');
    });

    test('Given non-existent appointment ID, When getting details, Then should return 404', async () => {
      // Given
      const nonExistentId = 999999;

      // When
      const response = await request(app)
        .get(`/api/appointments/${nonExistentId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      // Then
      expect(response.status).toBe(404);
    });
  });
});
