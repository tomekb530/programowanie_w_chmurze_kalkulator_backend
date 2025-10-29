const request = require('supertest');
const app = require('../server');

describe('Calculator API', () => {
  describe('POST /api/calculator/add', () => {
    test('should add two numbers correctly', async () => {
      const response = await request(app)
        .post('/api/calculator/add')
        .send({ a: 5, b: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.operation).toBe('addition');
      expect(response.body.result).toBe(8);
      expect(response.body.operands).toEqual({ a: 5, b: 3 });
    });

    test('should return error for invalid input', async () => {
      const response = await request(app)
        .post('/api/calculator/add')
        .send({ a: 'invalid', b: 3 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
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
    test('should return calculation history', async () => {
      // Najpierw wykonaj jakieś obliczenie
      await request(app)
        .post('/api/calculator/add')
        .send({ a: 1, b: 2 });

      const response = await request(app)
        .get('/api/calculator/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('DELETE /api/calculator/history', () => {
    test('should clear calculation history', async () => {
      const response = await request(app)
        .delete('/api/calculator/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Calculation history cleared successfully');
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