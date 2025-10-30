const request = require('supertest');
const session = require('supertest-session');
const {
  setupE2EEnvironment,
  teardownE2EEnvironment,
  cleanDatabase,
  generateTestData,
  wait,
  checkServerHealth
} = require('./setup');

describe('E2E: Pełny przepływ użytkownika kalkulatora', () => {
  let app;
  let testSession;
  let testData;
  let authToken;
  let userId;

  beforeAll(async () => {
    app = await setupE2EEnvironment();
    testData = generateTestData();
  });

  afterAll(async () => {
    await teardownE2EEnvironment();
  });

  beforeEach(async () => {
    await cleanDatabase();
    testSession = session(app);
  });

  describe('Scenariusz 1: Nowy użytkownik - kompletny cykl życia', () => {
    test('1. Sprawdzenie dostępności API', async () => {
      const healthCheck = await checkServerHealth(testSession);
      
      expect(healthCheck.message).toBe('Calculator REST API');
      expect(healthCheck.version).toBe('1.0.0');
      expect(healthCheck.endpoints).toBeDefined();
    });

    test('2. Rejestracja nowego użytkownika', async () => {
      const response = await testSession
        .post('/api/auth/register')
        .send(testData.validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Użytkownik zarejestrowany pomyślnie');
      expect(response.body.data.user.username).toBe(testData.validUser.username);
      expect(response.body.data.user.email).toBe(testData.validUser.email);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();

      // Zapisz token i ID użytkownika
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    test('3. Próba ponownej rejestracji tego samego użytkownika (błąd)', async () => {
      // Najpierw zarejestruj użytkownika
      await testSession
        .post('/api/auth/register')
        .send(testData.validUser);

      // Próba ponownej rejestracji
      const response = await testSession
        .post('/api/auth/register')
        .send(testData.validUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Użytkownik już istnieje');
    });

    test('4. Logowanie zarejestowanego użytkownika', async () => {
      // Najpierw zarejestruj użytkownika
      await testSession
        .post('/api/auth/register')
        .send(testData.validUser);

      // Zaloguj się
      const response = await testSession
        .post('/api/auth/login')
        .send({
          login: testData.validUser.email,
          password: testData.validUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logowanie pomyślne');
      expect(response.body.data.user.username).toBe(testData.validUser.username);
      expect(response.body.data.token).toBeDefined();

      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    test('5. Pobieranie profilu użytkownika', async () => {
      // Rejestracja i logowanie
      const registerResponse = await testSession
        .post('/api/auth/register')
        .send(testData.validUser);
      
      authToken = registerResponse.body.data.token;

      // Pobierz profil
      const response = await testSession
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testData.validUser.username);
      expect(response.body.data.user.email).toBe(testData.validUser.email);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalCalculations).toBe(0);
    });
  });

  describe('Scenariusz 2: Operacje matematyczne z zapisem historii', () => {
    beforeEach(async () => {
      // Przygotuj użytkownika dla każdego testu
      const registerResponse = await testSession
        .post('/api/auth/register')
        .send(testData.validUser);
      
      authToken = registerResponse.body.data.token;
    });

    test('6. Seria obliczeń matematycznych', async () => {
      // Dodawanie
      const addResponse = await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.addition)
        .expect(200);

      expect(addResponse.body.result).toBe(15); // 10 + 5
      expect(addResponse.body.operation).toBe('addition');
      expect(addResponse.body.saved_to_history).toBe(true);

      // Odejmowanie
      const subtractResponse = await testSession
        .post('/api/calculator/subtract')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.subtraction)
        .expect(200);

      expect(subtractResponse.body.result).toBe(12); // 20 - 8
      expect(subtractResponse.body.operation).toBe('subtraction');

      // Mnożenie
      const multiplyResponse = await testSession
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.multiplication)
        .expect(200);

      expect(multiplyResponse.body.result).toBe(42); // 7 * 6
      expect(multiplyResponse.body.operation).toBe('multiplication');

      // Dzielenie
      const divideResponse = await testSession
        .post('/api/calculator/divide')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.division)
        .expect(200);

      expect(divideResponse.body.result).toBe(5); // 15 / 3
      expect(divideResponse.body.operation).toBe('division');

      // Potęgowanie
      const powerResponse = await testSession
        .post('/api/calculator/power')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.power)
        .expect(200);

      expect(powerResponse.body.result).toBe(8); // 2^3
      expect(powerResponse.body.operation).toBe('exponentiation');

      // Pierwiastek kwadratowy
      const sqrtResponse = await testSession
        .post('/api/calculator/sqrt')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData.calculations.sqrt)
        .expect(200);

      expect(sqrtResponse.body.result).toBe(5); // sqrt(25)
      expect(sqrtResponse.body.operation).toBe('square_root');
    });

    test('7. Pobieranie historii obliczeń', async () => {
      // Wykonaj kilka obliczeń
      await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 5, b: 3 });

      await testSession
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 4, b: 7 });

      await testSession
        .post('/api/calculator/subtract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 10, b: 2 });

      // Pobierz historię
      const historyResponse = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data).toHaveLength(3);
      
      // Sprawdź kolejność (najnowsze pierwsze)
      const history = historyResponse.body.data;
      expect(history[0].operation).toBe('subtraction');
      expect(history[1].operation).toBe('multiplication');
      expect(history[2].operation).toBe('addition');
    });

    test('8. Filtrowanie historii po typie operacji', async () => {
      // Wykonaj różne operacje
      await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 1 });

      await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 2, b: 2 });

      await testSession
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 3, b: 3 });

      // Filtruj tylko dodawanie
      const response = await testSession
        .get('/api/calculator/history?operation=addition')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach(calc => {
        expect(calc.operation).toBe('addition');
      });
    });

    test('9. Pobieranie statystyk użytkownika', async () => {
      // Wykonaj różne operacje dla statystyk
      await testSession.post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 1 });

      await testSession.post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 2, b: 2 });

      await testSession.post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 3, b: 3 });

      await testSession.post('/api/calculator/divide')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 8, b: 2 });

      // Pobierz statystyki
      const response = await testSession
        .get('/api/calculator/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCalculations).toBe(4);
      expect(response.body.data.operationStats).toBeDefined();
      expect(response.body.data.operationStats.length).toBeGreaterThan(0);
    });

    test('10. Czyszczenie historii obliczeń', async () => {
      // Wykonaj kilka obliczeń
      await testSession.post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 1, b: 1 });

      await testSession.post('/api/calculator/subtract')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 5, b: 3 });

      // Sprawdź że historia istnieje
      let historyResponse = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.data).toHaveLength(2);

      // Wyczyść historię
      const clearResponse = await testSession
        .delete('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(clearResponse.body.success).toBe(true);
      expect(clearResponse.body.message).toBe('Historia obliczeń wyczyszczona pomyślnie');
      expect(clearResponse.body.deletedCount).toBe(2);

      // Sprawdź że historia jest pusta
      historyResponse = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.data).toHaveLength(0);
    });
  });

  describe('Scenariusz 3: Aktualizacja profilu i zarządzanie kontem', () => {
    beforeEach(async () => {
      const registerResponse = await testSession
        .post('/api/auth/register')
        .send(testData.validUser);
      
      authToken = registerResponse.body.data.token;
    });

    test('11. Aktualizacja profilu użytkownika', async () => {
      const updateData = {
        firstName: 'NoweImie',
        lastName: 'NoweNazwisko'
      };

      const response = await testSession
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profil zaktualizowany pomyślnie');
      expect(response.body.data.user.firstName).toBe('NoweImie');
      expect(response.body.data.user.lastName).toBe('NoweNazwisko');
    });

    test('12. Zmiana hasła użytkownika', async () => {
      const changePasswordData = {
        currentPassword: testData.validUser.password,
        newPassword: 'NoweHaslo123456'
      };

      const response = await testSession
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Hasło zmienione pomyślnie');

      // Sprawdź że można się zalogować nowym hasłem
      const loginResponse = await testSession
        .post('/api/auth/login')
        .send({
          login: testData.validUser.email,
          password: 'NoweHaslo123456'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });
  });

  describe('Scenariusz 4: Współbieżne sesje użytkowników', () => {
    test('13. Dwóch użytkowników z oddzielnymi historiami', async () => {
      // Zarejestruj pierwszego użytkownika
      const user1Response = await testSession
        .post('/api/auth/register')
        .send(testData.validUser);
      
      const user1Token = user1Response.body.data.token;

      // Zarejestruj drugiego użytkownika  
      const user2Response = await testSession
        .post('/api/auth/register')
        .send(testData.secondUser);
      
      const user2Token = user2Response.body.data.token;

      // Użytkownik 1 wykonuje obliczenia
      await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ a: 10, b: 20 });

      await testSession
        .post('/api/calculator/multiply')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ a: 5, b: 4 });

      // Użytkownik 2 wykonuje inne obliczenia
      await testSession
        .post('/api/calculator/subtract')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ a: 100, b: 25 });

      // Sprawdź historie - powinny być oddzielne
      const user1History = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2History = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user1History.body.data).toHaveLength(2);
      expect(user2History.body.data).toHaveLength(1);

      // Sprawdź zawartość historii
      expect(user1History.body.data[0].operation).toBe('multiplication');
      expect(user1History.body.data[1].operation).toBe('addition');
      expect(user2History.body.data[0].operation).toBe('subtraction');
    });
  });
});
