const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');

let mongoServer;

// Setup przed wszystkimi testami
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Cleanup po wszystkich testach
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Cleanup po każdym teście
afterEach(async () => {
  await User.deleteMany({});
  // Czekaj chwilę aby uniknąć rate limiting
  await new Promise(resolve => setTimeout(resolve, 100));
});

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewUser123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.username).toBe('newuser');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.password).toBeUndefined(); // Hasło nie powinno być zwrócone
      expect(response.body.data.token).toBeDefined();
    });

    test('should return error for duplicate username', async () => {
      // Najpierw zarejestruj użytkownika
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test1@example.com',
          password: 'Test123456'
        });

      // Próbuj zarejestrować użytkownika z tym samym username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'Test123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });

    test('should return error for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user1',
          email: 'same@example.com',
          password: 'Test123456'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'same@example.com',
          password: 'Test123456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });

    test('should return validation errors for invalid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Too short
          email: 'invalid-email', // Invalid email
          password: '123' // Too short and no uppercase/lowercase
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Stwórz testowego użytkownika przed każdym testem logowania
      const user = new User({
        username: 'logintest',
        email: 'logintest@example.com',
        password: 'LoginTest123'
      });
      await user.save();
    });

    test('should login with username successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'logintest',
          password: 'LoginTest123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.username).toBe('logintest');
      expect(response.body.data.token).toBeDefined();
    });

    test('should login with email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'logintest@example.com',
          password: 'LoginTest123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('logintest@example.com');
    });

    test('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'logintest',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'nonexistent',
          password: 'SomePassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: '',
          password: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Stwórz i zaloguj użytkownika
      const user = new User({
        username: 'profiletest',
        email: 'profiletest@example.com',
        password: 'ProfileTest123',
        firstName: 'Profile',
        lastName: 'Test'
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'profiletest',
          password: 'ProfileTest123'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('profiletest');
      expect(response.body.data.user.email).toBe('profiletest@example.com');
      expect(response.body.data.user.firstName).toBe('Profile');
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.stats).toBeDefined();
    });

    test('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    test('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = new User({
        username: 'updatetest',
        email: 'updatetest@example.com',
        password: 'UpdateTest123'
      });
      await user.save();
      userId = user._id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'updatetest',
          password: 'UpdateTest123'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
      expect(response.body.data.user.email).toBe('updated@example.com');
    });

    test('should return error for duplicate email', async () => {
      // Stwórz innego użytkownika
      await User.create({
        username: 'another',
        email: 'another@example.com',
        password: 'Another123'
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'another@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      const user = new User({
        username: 'passwordtest',
        email: 'passwordtest@example.com',
        password: 'OldPassword123'
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'passwordtest',
          password: 'OldPassword123'
        });

      authToken = loginResponse.body.data.token;
    });

    test('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Sprawdź czy można się zalogować nowym hasłem
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'passwordtest',
          password: 'NewPassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    test('should return error for incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid password');
    });
  });
});