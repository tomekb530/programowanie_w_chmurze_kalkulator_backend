const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Calculation = require('../models/Calculation');

let mongoServer;
let testUser;
let authToken;

// Setup przed wszystkimi testami
beforeAll(async () => {
  // Uruchom in-memory MongoDB serwer
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Połącz z testową bazą danych
  await mongoose.connect(mongoUri);
  
  // Stwórz testowego użytkownika
  testUser = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123456',
    firstName: 'Test',
    lastName: 'User'
  });
  await testUser.save();
  
  // Pobierz token autoryzacji
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      login: 'testuser',
      password: 'Test123456'
    });
  
  authToken = loginResponse.body.data.token;
});

// Cleanup po wszystkich testach
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Cleanup po każdym teście
afterEach(async () => {
  await Calculation.deleteMany({});
});

describe('Calculator API', () => {
  describe('POST /api/calculator/add', () => {
    test('should add two numbers correctly without auth', async () => {
      const response = await request(app)
        .post('/api/calculator/add')
        .send({ a: 5, b: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('addition');
      expect(response.body.result).toBe(8);
      expect(response.body.operands).toEqual({ a: 5, b: 3 });
      expect(response.body.saved_to_history).toBe(false);
    });

    test('should add two numbers correctly with auth', async () => {
      const response = await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 10, b: 15 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('addition');
      expect(response.body.result).toBe(25);
      expect(response.body.operands).toEqual({ a: 10, b: 15 });
      expect(response.body.saved_to_history).toBe(true);
      expect(response.body.calculation_id).toBeDefined();
    });

    test('should return error for invalid input', async () => {
      const response = await request(app)
        .post('/api/calculator/add')
        .send({ a: 'invalid', b: 3 })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/calculator/subtract', () => {
    test('should subtract two numbers correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/subtract')
        .send({ a: 10, b: 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('subtraction');
      expect(response.body.result).toBe(6);
    });
  });

  describe('POST /api/calculator/multiply', () => {
    test('should multiply two numbers correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/multiply')
        .send({ a: 6, b: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('multiplication');
      expect(response.body.result).toBe(42);
    });
  });

  describe('POST /api/calculator/divide', () => {
    test('should divide two numbers correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/divide')
        .send({ a: 15, b: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('division');
      expect(response.body.result).toBe(5);
    });

    test('should return error for division by zero', async () => {
      const response = await request(app)
        .post('/api/calculator/divide')
        .send({ a: 10, b: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Division by zero');
    });
  });

  describe('POST /api/calculator/power', () => {
    test('should calculate power correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/power')
        .send({ a: 2, b: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('exponentiation');
      expect(response.body.result).toBe(8);
    });
  });

  describe('POST /api/calculator/sqrt', () => {
    test('should calculate square root correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/sqrt')
        .send({ a: 16 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('square_root');
      expect(response.body.result).toBe(4);
    });

    test('should return error for negative number', async () => {
      const response = await request(app)
        .post('/api/calculator/sqrt')
        .send({ a: -4 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid operand');
    });
  });

  describe('GET /api/calculator/history', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/calculator/history')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    test('should return user calculation history', async () => {
      // Najpierw wykonaj jakieś obliczenia z autoryzacją
      await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 2 });

      await request(app)
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 3, b: 4 });

      const response = await request(app)
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter history by operation', async () => {
      // Dodaj różne operacje
      await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 1 });

      await request(app)
        .post('/api/calculator/subtract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 5, b: 2 });

      const response = await request(app)
        .get('/api/calculator/history?operation=addition')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].operation).toBe('addition');
    });
  });

  describe('DELETE /api/calculator/history', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/calculator/history')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    test('should clear user calculation history', async () => {
      // Dodaj jakieś obliczenia
      await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 2 });

      const response = await request(app)
        .delete('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Calculation history cleared successfully');
      expect(response.body.deletedCount).toBe(1);
    });
  });

  describe('GET /api/calculator/stats', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/calculator/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    test('should return user statistics', async () => {
      // Dodaj różne operacje
      await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 2 });

      await request(app)
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 3, b: 4 });

      await request(app)
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 2, b: 3 });

      const response = await request(app)
        .get('/api/calculator/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCalculations).toBe(3);
      expect(response.body.data.operationStats).toBeDefined();
    });
  });

  describe('GET /', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('Calculator REST API');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('404 handling', () => {
    test('should return 404 for unknown endpoint', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});