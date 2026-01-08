/**
 * Integration Tests for Authentication
 *
 * Tests the complete auth flow including:
 * - User registration
 * - Login (valid/invalid credentials)
 * - Password reset flow
 * - Token blacklisting
 *
 * Convention: GWT (Given-When-Then)
 *
 * @file tests/integration/auth.integration.test.js
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import app (we need to create a testable app instance)
const express = require('express');
const authRoutes = require('../../src/routes/auth.routes');
const { pool } = require('../../src/config/database');
const config = require('../../src/config');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

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

describe('Auth Integration Tests', () => {
  let app;
  let testUserEmail;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(() => {
    testUserEmail = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;
  });

  afterEach(async () => {
    // Cleanup test users
    try {
      await pool.query('DELETE FROM token_blacklist WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)', ['test_%']);
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)', ['test_%']);
      await pool.query('DELETE FROM users WHERE email LIKE ?', ['test_%']);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/auth/register', () => {
    test('Given valid registration data, When registering, Then should create user and return JWT', async () => {
      // Given
      const registrationData = {
        email: testUserEmail,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '123456789'
      };

      // When
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect('Content-Type', /json/);

      // Then
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUserEmail);
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Verify JWT is valid
      const decoded = jwt.verify(response.body.token, config.jwt.secret);
      expect(decoded).toHaveProperty('id');
      expect(decoded.email).toBe(testUserEmail);
    });

    test('Given duplicate email, When registering, Then should return 409 Conflict', async () => {
      // Given - Create user first
      const passwordHash = await bcrypt.hash('TestPass123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)',
        [testUserEmail, passwordHash, 'Existing', 'User', '999999999', 4]
      );

      const registrationData = {
        email: testUserEmail,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '123456789'
      };

      // When
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      // Then
      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Email already registered');
    });

    test('Given invalid email format, When registering, Then should return 400 Bad Request', async () => {
      // Given
      const registrationData = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '123456789'
      };

      // When
      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      // Then
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('Given valid credentials, When logging in, Then should return JWT and user data', async () => {
      // Given - Create test user
      const password = 'SecurePass123!';
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );

      // When
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: password
        })
        .expect('Content-Type', /json/);

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUserEmail);
    });

    test('Given invalid password, When logging in, Then should return 401 Unauthorized', async () => {
      // Given - Create test user
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );

      // When
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!'
        });

      // Then
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('Given non-existent email, When logging in, Then should return 401 Unauthorized', async () => {
      // Given - No user exists

      // When
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      // Then
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('Given deactivated account, When logging in, Then should return 403 Forbidden', async () => {
      // Given - Create deactivated user
      const passwordHash = await bcrypt.hash('SecurePass123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );

      // When
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'SecurePass123!'
        });

      // Then
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('Given existing email, When requesting password reset, Then should return 200 (security)', async () => {
      // Given - Create test user
      const passwordHash = await bcrypt.hash('SecurePass123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );

      // When
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      // Then
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify token was created in database
      const [tokens] = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE user_id = (SELECT id FROM users WHERE email = ?)',
        [testUserEmail]
      );
      expect(tokens.length).toBeGreaterThan(0);
    });

    test('Given non-existent email, When requesting password reset, Then should still return 200 (security)', async () => {
      // Given - No user exists with this email

      // When
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Then - Should still return 200 to prevent user enumeration
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('Given valid token, When logging out, Then should blacklist token', async () => {
      // Given - Create user and generate token
      const passwordHash = await bcrypt.hash('SecurePass123!', 10);
      const [userResult] = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );
      const userId = userResult.insertId;

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'SecurePass123!'
        });

      const token = loginResponse.body.token;

      // When
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Then
      expect(response.status).toBe(200);

      // Verify token is blacklisted
      const decoded = jwt.verify(token, config.jwt.secret);
      const [blacklisted] = await pool.query(
        'SELECT * FROM token_blacklist WHERE token_jti = ?',
        [decoded.jti]
      );
      expect(blacklisted.length).toBe(1);
    });
  });

  describe('GET /api/auth/profile', () => {
    test('Given valid token, When getting profile, Then should return user data', async () => {
      // Given - Create user and get token
      const passwordHash = await bcrypt.hash('SecurePass123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [testUserEmail, passwordHash, 'Test', 'User', '123456789', 4]
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'SecurePass123!'
        });

      const token = loginResponse.body.token;

      // When
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testUserEmail);
      expect(response.body.first_name).toBe('Test');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    test('Given no token, When getting profile, Then should return 401', async () => {
      // Given - No authorization header

      // When
      const response = await request(app)
        .get('/api/auth/profile');

      // Then
      expect(response.status).toBe(401);
    });
  });
});
