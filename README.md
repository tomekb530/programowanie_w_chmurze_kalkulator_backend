# Calculator REST API with Authentication

Backend w Express.js dla kalkulatora z REST API, MongoDB i systemem autoryzacji.

## 🚀 Funkcjonalności

- **Operacje matematyczne**: dodawanie, odejmowanie, mnożenie, dzielenie, potęgowanie, pierwiastek kwadratowy
- **System autoryzacji**: rejestracja, logowanie użytkowników z JWT tokenami
- **Indywidualna historia**: każdy użytkownik ma własną historię obliczeń zapisaną w MongoDB
- **Profil użytkownika**: zarządzanie profilem, zmiana hasła, statystyki
- **Walidacja danych**: sprawdzanie poprawności wprowadzonych wartości
- **Obsługa błędów**: szczegółowe komunikaty o błędach
- **Bezpieczeństwo**: Helmet, CORS, rate limiting, hashowanie haseł
- **Baza danych**: MongoDB z Mongoose ODM
- **Logowanie**: Morgan do logowania requestów

## 📋 Wymagania

- Node.js (wersja 14 lub wyższa)
- npm lub yarn
- MongoDB (lokalnie lub MongoDB Atlas)

## 🛠️ Instalacja

1. Sklonuj repozytorium i przejdź do katalogu:
```bash
git clone <repo-url>
cd calculator-rest-backend
```

2. Zainstaluj zależności:
```bash
npm install
```

3. Skonfiguruj zmienne środowiskowe w pliku `.env`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/calculator-db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

4. Upewnij się, że MongoDB jest uruchomione lokalnie lub skonfiguruj MongoDB Atlas

5. Uruchom serwer w trybie development:
```bash
npm run dev
```

6. Lub uruchom w trybie produkcyjnym:
```bash
npm start
```

Serwer będzie dostępny pod adresem: `http://localhost:3000`

## 📖 API Endpoints

### Główny endpoint
- `GET /` - Informacje o API i dostępnych endpointach

### Autoryzacja

#### Rejestracja użytkownika
- **POST** `/api/auth/register`
- **Body**: 
```json
{
  "username": "string (3-30 chars, alphanumeric + underscore)",
  "email": "string (valid email)",
  "password": "string (min 6 chars, 1 upper, 1 lower, 1 digit)",
  "firstName": "string (optional, max 50 chars)",
  "lastName": "string (optional, max 50 chars)"
}
```

#### Logowanie użytkownika
- **POST** `/api/auth/login`
- **Body**: 
```json
{
  "login": "string (username or email)",
  "password": "string"
}
```

#### Profil użytkownika
- **GET** `/api/auth/profile` (requires auth)
- **PUT** `/api/auth/profile` (requires auth)
- **PUT** `/api/auth/change-password` (requires auth)

### Operacje kalkulatora (opcjonalna autoryzacja)

#### Dodawanie
- **POST** `/api/calculator/add`
- **Body**: `{ "a": number, "b": number }`
- **Przykład**: `{ "a": 5, "b": 3 }` → Wynik: `8`
- **Historia**: Zapisywana jeśli użytkownik jest zalogowany

#### Odejmowanie  
- **POST** `/api/calculator/subtract`
- **Body**: `{ "a": number, "b": number }`
- **Przykład**: `{ "a": 10, "b": 4 }` → Wynik: `6`

#### Mnożenie
- **POST** `/api/calculator/multiply`
- **Body**: `{ "a": number, "b": number }`
- **Przykład**: `{ "a": 6, "b": 7 }` → Wynik: `42`

#### Dzielenie
- **POST** `/api/calculator/divide`
- **Body**: `{ "a": number, "b": number }`
- **Przykład**: `{ "a": 15, "b": 3 }` → Wynik: `5`

#### Potęgowanie
- **POST** `/api/calculator/power`
- **Body**: `{ "a": number, "b": number }`
- **Przykład**: `{ "a": 2, "b": 3 }` → Wynik: `8`

#### Pierwiastek kwadratowy
- **POST** `/api/calculator/sqrt`
- **Body**: `{ "a": number }`
- **Przykład**: `{ "a": 16 }` → Wynik: `4`

### Historia obliczeń (wymagana autoryzacja)

#### Pobieranie historii
- **GET** `/api/calculator/history`
- **Headers**: `Authorization: Bearer <token>`
- **Query params**: `limit`, `offset`, `operation`, `startDate`, `endDate`
- **Przykład**: `/api/calculator/history?limit=10&operation=addition`

#### Statystyki obliczeń
- **GET** `/api/calculator/stats`
- **Headers**: `Authorization: Bearer <token>`

#### Czyszczenie historii
- **DELETE** `/api/calculator/history`
- **Headers**: `Authorization: Bearer <token>`

## 📝 Przykłady użycia

### 1. Rejestracja użytkownika
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "username": "testuser",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  }
}
```

### 2. Logowanie użytkownika
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "Test123456"
  }'
```

### 3. Dodawanie dwóch liczb (z autoryzacją)
```bash
curl -X POST http://localhost:3000/api/calculator/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"a": 15, "b": 25}'
```

**Odpowiedź:**
```json
{
  "success": true,
  "operation": "addition",
  "operands": { "a": 15, "b": 25 },
  "result": 40,
  "calculation_id": "507f1f77bcf86cd799439011",
  "saved_to_history": true
}
```

### 4. Pobieranie historii użytkownika
```bash
curl -X GET http://localhost:3000/api/calculator/history \
  -H "Authorization: Bearer <your-token>"
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f191e810c19729de860ea",
      "operation": "addition",
      "operands": { "a": 15, "b": 25 },
      "result": 40,
      "timestamp": "2023-10-31T12:30:32.100Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### 5. Pobieranie statystyk użytkownika
```bash
curl -X GET http://localhost:3000/api/calculator/stats \
  -H "Authorization: Bearer <your-token>"
```

## 🔒 Obsługa błędów

API zwraca szczegółowe komunikaty o błędach:

- **400 Bad Request**: Nieprawidłowe dane wejściowe
- **404 Not Found**: Endpoint nie istnieje
- **500 Internal Server Error**: Błąd serwera

**Przykład odpowiedzi błędu:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "a",
      "message": "Parameter \"a\" must be a number"
    }
  ]
}
```

## 🏗️ Struktura projektu

```
├── config/
│   └── database.js               # Konfiguracja MongoDB
├── controllers/
│   ├── authController.js         # Logika autoryzacji
│   └── calculatorController.js   # Logika operacji kalkulatora
├── middleware/
│   ├── auth.js                   # Middleware JWT autoryzacji
│   └── errorHandler.js           # Obsługa błędów
├── models/
│   ├── User.js                   # Model użytkownika
│   └── Calculation.js            # Model obliczeń
├── routes/
│   ├── auth.js                   # Trasy autoryzacji
│   └── calculator.js             # Trasy kalkulatora
├── tests/
│   └── calculator.test.js        # Testy jednostkowe
├── .env                          # Zmienne środowiskowe
├── .gitignore                    # Pliki ignorowane przez git
├── package.json                  # Zależności i skrypty
├── README.md                     # Dokumentacja
└── server.js                     # Główny plik serwera
```

## 🔐 Autoryzacja i bezpieczeństwo

- **JWT Tokens**: Bezstanowa autoryzacja z tokenami wygasającymi po 24h
- **Hashowanie haseł**: bcryptjs z salt rounds = 12
- **Rate limiting**: Ograniczenie prób logowania i rejestracji
- **Walidacja**: Szczegółowa walidacja wszystkich danych wejściowych
- **CORS & Helmet**: Podstawowe zabezpieczenia HTTP

## 🧪 Testowanie

Uruchom testy (po dodaniu testów):
```bash
npm test
```

## 🚀 Deployment

1. Ustaw zmienne środowiskowe:
   - `PORT` - port serwera (domyślnie 3000)
   - `NODE_ENV` - środowisko (development/production)

2. Uruchom w trybie produkcyjnym:
```bash
NODE_ENV=production npm start
```

## 📄 Licencja

MIT License