const request = require('supertest');
const session = require('supertest-session');
const {
  setupE2EEnvironment,
  teardownE2EEnvironment,
  cleanDatabase,
  generateTestData,
  checkServerHealth
} = require('./setup');

describe('E2E: Użytkownik anonimowy (bez rejestracji)', () => {
  let app;
  let testSession;
  let testData;

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

  describe('Dostępne operacje dla użytkownika anonimowego', () => {
    test('1. Sprawdzenie informacji o API', async () => {
      const response = await checkServerHealth(testSession);
      
      expect(response.message).toBe('Calculator REST API');
      expect(response.version).toBe('1.0.0');
      expect(response.endpoints).toBeDefined();
      
      // Sprawdź czy wszystkie endpointy są wymienione
      const endpoints = response.endpoints;
      expect(endpoints.add).toBe('POST /api/calculator/add');
      expect(endpoints.subtract).toBe('POST /api/calculator/subtract');
      expect(endpoints.multiply).toBe('POST /api/calculator/multiply');
      expect(endpoints.divide).toBe('POST /api/calculator/divide');
      expect(endpoints.power).toBe('POST /api/calculator/power');
      expect(endpoints.sqrt).toBe('POST /api/calculator/sqrt');
    });

    test('2. Operacje matematyczne bez zapisywania historii', async () => {
      // Dodawanie
      const addResponse = await testSession
        .post('/api/calculator/add')
        .send(testData.calculations.addition)
        .expect(200);

      expect(addResponse.body.result).toBe(15);
      expect(addResponse.body.operation).toBe('addition');
      expect(addResponse.body.saved_to_history).toBe(false);
      expect(addResponse.body.calculation_id).toBeUndefined();

      // Odejmowanie
      const subtractResponse = await testSession
        .post('/api/calculator/subtract')
        .send(testData.calculations.subtraction)
        .expect(200);

      expect(subtractResponse.body.result).toBe(12);
      expect(subtractResponse.body.operation).toBe('subtraction');
      expect(subtractResponse.body.saved_to_history).toBe(false);

      // Mnożenie
      const multiplyResponse = await testSession
        .post('/api/calculator/multiply')
        .send(testData.calculations.multiplication)
        .expect(200);

      expect(multiplyResponse.body.result).toBe(42);
      expect(multiplyResponse.body.operation).toBe('multiplication');
      expect(multiplyResponse.body.saved_to_history).toBe(false);

      // Dzielenie
      const divideResponse = await testSession
        .post('/api/calculator/divide')
        .send(testData.calculations.division)
        .expect(200);

      expect(divideResponse.body.result).toBe(5);
      expect(divideResponse.body.operation).toBe('division');
      expect(divideResponse.body.saved_to_history).toBe(false);

      // Potęgowanie
      const powerResponse = await testSession
        .post('/api/calculator/power')
        .send(testData.calculations.power)
        .expect(200);

      expect(powerResponse.body.result).toBe(8);
      expect(powerResponse.body.operation).toBe('exponentiation');
      expect(powerResponse.body.saved_to_history).toBe(false);

      // Pierwiastek kwadratowy
      const sqrtResponse = await testSession
        .post('/api/calculator/sqrt')
        .send(testData.calculations.sqrt)
        .expect(200);

      expect(sqrtResponse.body.result).toBe(5);
      expect(sqrtResponse.body.operation).toBe('square_root');
      expect(sqrtResponse.body.saved_to_history).toBe(false);
    });

    test('3. Operacje z błędnymi danymi', async () => {
      // Dzielenie przez zero
      const divideByZeroResponse = await testSession
        .post('/api/calculator/divide')
        .send(testData.invalidData.divisionByZero)
        .expect(400);

      expect(divideByZeroResponse.body.success).toBe(false);
      expect(divideByZeroResponse.body.error).toBe('Dzielenie przez zero');
      expect(divideByZeroResponse.body.message).toBe('Nie można dzielić przez zero');

      // Pierwiastek z liczby ujemnej
      const negativeSquareRootResponse = await testSession
        .post('/api/calculator/sqrt')
        .send(testData.invalidData.negativeSquareRoot)
        .expect(400);

      expect(negativeSquareRootResponse.body.success).toBe(false);
      expect(negativeSquareRootResponse.body.error).toBe('Nieprawidłowy argument');
      expect(negativeSquareRootResponse.body.message).toBe('Nie można obliczyć pierwiastka kwadratowego z liczby ujemnej');
    });

    test('4. Walidacja danych wejściowych', async () => {
      // Brakujące parametry
      const missingParamsResponse = await testSession
        .post('/api/calculator/add')
        .send({ a: 5 }) // Brakuje 'b'
        .expect(400);

      expect(missingParamsResponse.body.error).toBe('Błąd walidacji');
      expect(missingParamsResponse.body.details).toBeDefined();

      // Nieprawidłowe typy danych
      const invalidTypeResponse = await testSession
        .post('/api/calculator/multiply')
        .send({ a: "text", b: 5 })
        .expect(400);

      expect(invalidTypeResponse.body.error).toBe('Błąd walidacji');
      expect(invalidTypeResponse.body.details).toBeDefined();

      // Pustość w danych
      const emptyDataResponse = await testSession
        .post('/api/calculator/subtract')
        .send({})
        .expect(400);

      expect(emptyDataResponse.body.error).toBe('Błąd walidacji');
    });
  });

  describe('Ograniczenia dla użytkownika anonimowego', () => {
    test('5. Brak dostępu do historii obliczeń', async () => {
      const historyResponse = await testSession
        .get('/api/calculator/history')
        .expect(401);

      expect(historyResponse.body.success).toBe(false);
      expect(historyResponse.body.error).toBe('Dostęp zabroniony');
      expect(historyResponse.body.message).toBe('Brak tokenu. Proszę się zalogować.');
    });

    test('6. Brak dostępu do statystyk', async () => {
      const statsResponse = await testSession
        .get('/api/calculator/stats')
        .expect(401);

      expect(statsResponse.body.success).toBe(false);
      expect(statsResponse.body.error).toBe('Dostęp zabroniony');
      expect(statsResponse.body.message).toBe('Brak tokenu. Proszę się zalogować.');
    });

    test('7. Brak dostępu do czyszczenia historii', async () => {
      const clearHistoryResponse = await testSession
        .delete('/api/calculator/history')
        .expect(401);

      expect(clearHistoryResponse.body.success).toBe(false);
      expect(clearHistoryResponse.body.error).toBe('Dostęp zabroniony');
    });

    test('8. Brak dostępu do profilu użytkownika', async () => {
      const profileResponse = await testSession
        .get('/api/auth/profile')
        .expect(401);

      expect(profileResponse.body.success).toBe(false);
      expect(profileResponse.body.error).toBe('Dostęp zabroniony');
    });

    test('9. Brak dostępu do aktualizacji profilu', async () => {
      const updateProfileResponse = await testSession
        .put('/api/auth/profile')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(updateProfileResponse.body.success).toBe(false);
      expect(updateProfileResponse.body.error).toBe('Dostęp zabroniony');
    });

    test('10. Brak dostępu do zmiany hasła', async () => {
      const changePasswordResponse = await testSession
        .put('/api/auth/change-password')
        .send({
          currentPassword: 'old',
          newPassword: 'new'
        })
        .expect(401);

      expect(changePasswordResponse.body.success).toBe(false);
      expect(changePasswordResponse.body.error).toBe('Dostęp zabroniony');
    });
  });

  describe('Przejście z anonimowego na zalogowanego', () => {
    test('11. Obliczenia anonimowe -> rejestracja -> obliczenia z historią', async () => {
      // Wykonaj obliczenia jako anonimowy
      const anonymousCalc = await testSession
        .post('/api/calculator/add')
        .send({ a: 10, b: 5 })
        .expect(200);

      expect(anonymousCalc.body.saved_to_history).toBe(false);

      // Zarejestruj się
      const registerResponse = await testSession
        .post('/api/auth/register')
        .send(testData.validUser)
        .expect(201);

      const authToken = registerResponse.body.data.token;

      // Wykonaj obliczenia jako zalogowany
      const authenticatedCalc = await testSession
        .post('/api/calculator/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ a: 20, b: 15 })
        .expect(200);

      expect(authenticatedCalc.body.saved_to_history).toBe(true);
      expect(authenticatedCalc.body.calculation_id).toBeDefined();

      // Sprawdź historię - powinna zawierać tylko obliczenia z autoryzacją
      const historyResponse = await testSession
        .get('/api/calculator/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.data).toHaveLength(1);
      expect(historyResponse.body.data[0].result).toBe(35);
    });
  });

  describe('Testowanie różnych formatów danych', () => {
    test('12. Operacje z liczbami dziesiętnymi', async () => {
      const response = await testSession
        .post('/api/calculator/multiply')
        .send({ a: 3.14, b: 2.5 })
        .expect(200);

      expect(response.body.result).toBeCloseTo(7.85, 2);
    });

    test('13. Operacje z liczbami ujemnymi', async () => {
      const response = await testSession
        .post('/api/calculator/subtract')
        .send({ a: -10, b: -5 })
        .expect(200);

      expect(response.body.result).toBe(-5); // -10 - (-5) = -5
    });

    test('14. Operacje z bardzo dużymi liczbami', async () => {
      const response = await testSession
        .post('/api/calculator/add')
        .send({ a: 999999999, b: 1 })
        .expect(200);

      expect(response.body.result).toBe(1000000000);
    });

    test('15. Operacje z zerami', async () => {
      const addResponse = await testSession
        .post('/api/calculator/add')
        .send({ a: 0, b: 0 })
        .expect(200);

      expect(addResponse.body.result).toBe(0);

      const multiplyResponse = await testSession
        .post('/api/calculator/multiply')
        .send({ a: 100, b: 0 })
        .expect(200);

      expect(multiplyResponse.body.result).toBe(0);
    });
  });

  describe('Testowanie responsywności API', () => {
    test('16. Wykonywanie wielu obliczeń równocześnie', async () => {
      const promises = [];
      
      // Wykonaj 10 obliczeń równocześnie
      for (let i = 0; i < 10; i++) {
        promises.push(
          testSession
            .post('/api/calculator/add')
            .send({ a: i, b: i + 1 })
        );
      }

      const responses = await Promise.all(promises);

      // Sprawdź że wszystkie się powiodły
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.result).toBe(index + (index + 1));
      });
    });
  });
});