const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../../app');

let mongoServer;

/**
 * Konfiguracja środowiska testowego E2E
 */
const setupE2EEnvironment = async () => {
  // Ustawienia dla testów E2E
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-e2e';
  
  try {
    // Rozpocznij MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Połącz z testową bazą danych
    await mongoose.connect(mongoUri);
    console.log('E2E: Połączono z testową bazą danych MongoDB');
    
    return app;
  } catch (error) {
    console.error('E2E Setup Error:', error);
    throw error;
  }
};

/**
 * Czyszczenie środowiska testowego E2E
 */
const teardownE2EEnvironment = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('E2E: Środowisko testowe oczyszczone');
  } catch (error) {
    console.error('E2E Teardown Error:', error);
  }
};

/**
 * Czyszczenie wszystkich kolekcji (między testami)
 */
const cleanDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('E2E: Baza danych wyczyszczona');
  } catch (error) {
    console.error('E2E Clean Database Error:', error);
  }
};

/**
 * Generowanie danych testowych
 */
const generateTestData = () => {
  // Proste generowanie danych testowych bez faker
  const generateRandomString = (length = 8) => {
    return Math.random().toString(36).substring(2, 2 + length);
  };
  
  const generateUsername = () => `user_${generateRandomString(6)}`;
  const generateEmail = () => `test_${generateRandomString(8)}@example.com`;
  const generateFirstName = () => {
    const names = ['Anna', 'Jan', 'Maria', 'Piotr', 'Katarzyna', 'Tomasz', 'Agnieszka', 'Michał'];
    return names[Math.floor(Math.random() * names.length)];
  };
  const generateLastName = () => {
    const surnames = ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński'];
    return surnames[Math.floor(Math.random() * surnames.length)];
  };
  
  return {
    // Dane użytkownika
    validUser: {
      username: generateUsername(),
      email: generateEmail(),
      password: 'TestPassword123',
      firstName: generateFirstName(),
      lastName: generateLastName()
    },
    
    // Drugie dane użytkownika
    secondUser: {
      username: generateUsername(),
      email: generateEmail(),
      password: 'AnotherPassword123',
      firstName: generateFirstName(),
      lastName: generateLastName()
    },
    
    // Dane do obliczeń
    calculations: {
      addition: { a: 10, b: 5 },
      subtraction: { a: 20, b: 8 },
      multiplication: { a: 7, b: 6 },
      division: { a: 15, b: 3 },
      power: { a: 2, b: 3 },  // a^b = 2^3 = 8
      sqrt: { a: 25 }
    },
    
    // Nieprawidłowe dane
    invalidData: {
      email: 'invalid-email',
      password: '123', // Za krótkie
      username: 'ab', // Za krótkie
      divisionByZero: { a: 10, b: 0 },
      negativeSquareRoot: { a: -4 }
    }
  };
};

/**
 * Helper do oczekiwania na określony czas
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sprawdzenie stanu serwera
 */
const checkServerHealth = async (request) => {
  const response = await request
    .get('/')
    .expect(200);
    
  return response.body;
};

module.exports = {
  setupE2EEnvironment,
  teardownE2EEnvironment,
  cleanDatabase,
  generateTestData,
  wait,
  checkServerHealth
};