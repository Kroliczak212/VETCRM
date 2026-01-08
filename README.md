# Testowanie i Jakość Oprogramowania

## Autor
**Bartłomiej Król**

## Temat projektu
**VetCRM** - System zarządzania kliniką weterynaryjną

## Opis projektu

VetCRM to kompleksowy system CRM (Customer Relationship Management) dla klinik weterynaryjnych. Aplikacja umożliwia zarządzanie wizytami, pacjentami (zwierzętami), szczepieniami oraz komunikację między klientami a personelem medycznym.

### Główne funkcjonalności:
- **Zarządzanie wizytami** - umawianie, anulowanie, zmiana terminów z regułami biznesowymi (72h/48h/24h)
- **Zarządzanie pacjentami** - rejestracja pupili, historia medyczna
- **Szczepienia** - śledzenie szczepień z automatycznym obliczaniem statusu (aktualne/zbliżające się/przeterminowane)
- **System ról (RBAC)** - administrator, lekarz, recepcjonista, klient
- **Powiadomienia email** - przypomnienia o wizytach, potwierdzenia
- **Generowanie dokumentacji PDF** - historia medyczna pupila

### Architektura systemu:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│     MySQL       │
│  React + Vite   │     │   Express.js    │     │    Database     │
│   TypeScript    │     │    Node.js      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Uruchomienie projektu

### Wymagania
- Node.js v18+
- MySQL 8.0+
- Docker (opcjonalnie)

### Uruchomienie z Docker (zalecane)

```bash
# Sklonuj repozytorium
git clone <repository-url>
cd VetCRM

# Uruchom wszystkie serwisy
docker-compose up -d

# Aplikacja dostępna pod:
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Swagger Docs: http://localhost:3000/api-docs
```

### Uruchomienie lokalne

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Uruchomienie testów

```bash
cd backend

# Wszystkie testy
npm test

# Tylko testy jednostkowe
npm run test:unit

# Tylko testy integracyjne
npm run test:integration

# Testy z pokryciem kodu
npm run test:coverage
```

---

## Testy

Projekt zawiera kompleksowy zestaw testów zgodny z konwencjami **AAA (Arrange-Act-Assert)** dla testów jednostkowych oraz **GWT (Given-When-Then)** dla testów integracyjnych.

### Testy jednostkowe

Lokalizacja: `backend/tests/unit/`

| # | Nazwa testu | Plik | Opis |
|---|-------------|------|------|
| 1 | `getHoursUntilAppointment` - future | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Kalkulacja godzin do wizyty w przyszłości |
| 2 | `getHoursUntilAppointment` - past | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Zwraca ujemną wartość dla wizyt w przeszłości |
| 3 | `getCancellationType` - >72h | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Anulowanie bez kary >72h przed wizytą |
| 4 | `getCancellationType` - 48-72h | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Ostrzeżenie bez kary 48-72h przed |
| 5 | `getCancellationType` - <24h blocked | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Blokada anulowania <24h online |
| 6 | `getCancellationType` - past | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Blokada dla wizyt przeszłych |
| 7 | `formatTimeRemaining` - days | [appointmentRules.test.js](backend/tests/unit/appointmentRules.test.js) | Formatowanie czasu w dniach |
| 8 | `validatePasswordStrength` - strong | [password.test.js](backend/tests/unit/password.test.js) | Akceptacja silnego hasła |
| 9 | `validatePasswordStrength` - weak | [password.test.js](backend/tests/unit/password.test.js) | Odrzucenie krótkiego hasła |
| 10 | `validatePasswordStrength` - common | [password.test.js](backend/tests/unit/password.test.js) | Wykrywanie popularnych haseł |
| 11 | `calculateStatus` - overdue | [vaccinationStatus.test.js](backend/tests/unit/vaccinationStatus.test.js) | Status przeterminowany |
| 12 | `calculateStatus` - due_soon | [vaccinationStatus.test.js](backend/tests/unit/vaccinationStatus.test.js) | Status zbliżający się |
| 13 | `calculateStatus` - current | [vaccinationStatus.test.js](backend/tests/unit/vaccinationStatus.test.js) | Status aktualny |

### Testy integracyjne

Lokalizacja: `backend/tests/integration/`

| # | Nazwa testu | Plik | Opis |
|---|-------------|------|------|
| 1 | Register new user | [auth.integration.test.js](backend/tests/integration/auth.integration.test.js) | Rejestracja użytkownika + JWT |
| 2 | Login valid credentials | [auth.integration.test.js](backend/tests/integration/auth.integration.test.js) | Logowanie z poprawnymi danymi |
| 3 | Login invalid password | [auth.integration.test.js](backend/tests/integration/auth.integration.test.js) | Logowanie z błędnym hasłem → 401 |
| 4 | Login deactivated account | [auth.integration.test.js](backend/tests/integration/auth.integration.test.js) | Deaktywowane konto → 403 |
| 5 | Forgot password (security) | [auth.integration.test.js](backend/tests/integration/auth.integration.test.js) | Reset hasła - zawsze 200 |
| 6 | Get available slots | [appointments.integration.test.js](backend/tests/integration/appointments.integration.test.js) | Pobieranie dostępnych slotów |
| 7 | Create appointment | [appointments.integration.test.js](backend/tests/integration/appointments.integration.test.js) | Tworzenie wizyty |
| 8 | Cancel appointment >72h | [appointments.integration.test.js](backend/tests/integration/appointments.integration.test.js) | Anulowanie bez kary |
| 9 | Cancel already cancelled | [appointments.integration.test.js](backend/tests/integration/appointments.integration.test.js) | Anulowanie anulowanej → 400 |
| 10 | Create vaccination | [vaccinations.integration.test.js](backend/tests/integration/vaccinations.integration.test.js) | Dodanie szczepienia |
| 11 | Get vaccinations filtered | [vaccinations.integration.test.js](backend/tests/integration/vaccinations.integration.test.js) | Filtrowanie szczepień |
| 12 | Delete vaccination (staff) | [vaccinations.integration.test.js](backend/tests/integration/vaccinations.integration.test.js) | Usuwanie przez personel |

---

## Dokumentacja API

API jest udokumentowane za pomocą **Swagger/OpenAPI**. Po uruchomieniu backendu dokumentacja dostępna jest pod:

```
http://localhost:3000/api-docs
```

### Główne endpointy:

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/register` | Rejestracja użytkownika |
| POST | `/api/auth/login` | Logowanie |
| POST | `/api/auth/logout` | Wylogowanie (blacklist tokenu) |
| POST | `/api/auth/forgot-password` | Żądanie resetu hasła |
| GET | `/api/appointments` | Lista wizyt (filtrowana wg roli) |
| POST | `/api/appointments` | Utworzenie wizyty |
| POST | `/api/appointments/:id/cancel` | Anulowanie wizyty |
| GET | `/api/appointments/slots` | Dostępne sloty czasowe |
| GET | `/api/vaccinations` | Lista szczepień |
| POST | `/api/vaccinations` | Dodanie szczepienia |
| GET | `/api/pets` | Lista pupili |
| POST | `/api/pets` | Dodanie pupila |

---

## Przypadki testowe dla testera manualnego (TestCase)

### TC001 - Logowanie z poprawnymi danymi

| Pole | Wartość |
|------|---------|
| **ID** | TC001 |
| **Tytuł** | Logowanie z poprawnymi danymi |
| **Warunki początkowe** | Aplikacja uruchomiona, użytkownik zarejestrowany w systemie |
| **Kroki testowe** | 1. Otwórz stronę logowania (`http://localhost:5173`)<br>2. Wpisz poprawny email w polu "Email"<br>3. Wpisz poprawne hasło w polu "Hasło"<br>4. Kliknij przycisk "Zaloguj" |
| **Oczekiwany rezultat** | Użytkownik przekierowany na dashboard odpowiedni dla swojej roli |

---

### TC002 - Logowanie z błędnym hasłem

| Pole | Wartość |
|------|---------|
| **ID** | TC002 |
| **Tytuł** | Logowanie z błędnym hasłem |
| **Warunki początkowe** | Aplikacja uruchomiona, użytkownik zarejestrowany |
| **Kroki testowe** | 1. Otwórz stronę logowania<br>2. Wpisz poprawny email<br>3. Wpisz niepoprawne hasło<br>4. Kliknij "Zaloguj" |
| **Oczekiwany rezultat** | Wyświetlenie komunikatu błędu "Invalid credentials", brak przekierowania |

---

### TC003 - Reset hasła

| Pole | Wartość |
|------|---------|
| **ID** | TC003 |
| **Tytuł** | Żądanie resetu hasła |
| **Warunki początkowe** | Aplikacja uruchomiona, użytkownik ma konto |
| **Kroki testowe** | 1. Kliknij "Zapomniałem hasła" na stronie logowania<br>2. Wpisz adres email w polu<br>3. Kliknij "Wyślij link" |
| **Oczekiwany rezultat** | Komunikat o wysłaniu emaila z linkiem do resetu (wyświetlany niezależnie od istnienia konta - ze względów bezpieczeństwa) |

---

### TC004 - Dodanie nowego pupila

| Pole | Wartość |
|------|---------|
| **ID** | TC004 |
| **Tytuł** | Dodanie nowego pupila przez klienta |
| **Warunki początkowe** | Zalogowany jako klient |
| **Kroki testowe** | 1. Przejdź do sekcji "Moje pupile" w menu bocznym<br>2. Kliknij przycisk "Dodaj pupila"<br>3. Wypełnij formularz: imię, gatunek, rasa, data urodzenia, płeć<br>4. Kliknij "Zapisz" |
| **Oczekiwany rezultat** | Pupil pojawia się na liście, wyświetlenie komunikatu sukcesu "Pupil dodany pomyślnie" |

---

### TC005 - Umówienie wizyty

| Pole | Wartość |
|------|---------|
| **ID** | TC005 |
| **Tytuł** | Umówienie wizyty przez klienta |
| **Warunki początkowe** | Zalogowany jako klient, posiada co najmniej jednego pupila |
| **Kroki testowe** | 1. Przejdź do "Wizyty" w menu<br>2. Kliknij "Umów wizytę"<br>3. Wybierz pupila z listy rozwijanej<br>4. Wybierz lekarza<br>5. Wybierz datę z kalendarza<br>6. Wybierz dostępną godzinę z listy slotów<br>7. Dodaj opcjonalny opis powodu wizyty<br>8. Kliknij "Potwierdź wizytę" |
| **Oczekiwany rezultat** | Wizyta pojawia się w kalendarzu ze statusem "Zaplanowana", wyświetlenie komunikatu potwierdzającego |

---

### TC006 - Anulowanie wizyty (>72h przed)

| Pole | Wartość |
|------|---------|
| **ID** | TC006 |
| **Tytuł** | Anulowanie wizyty więcej niż 72h przed terminem |
| **Warunki początkowe** | Zalogowany jako klient, posiada wizytę zaplanowaną za więcej niż 3 dni |
| **Kroki testowe** | 1. Przejdź do listy wizyt<br>2. Kliknij na wizytę zaplanowaną za >3 dni<br>3. W szczegółach kliknij "Anuluj wizytę"<br>4. W oknie dialogowym potwierdź anulowanie |
| **Oczekiwany rezultat** | Wizyta zmienia status na "Anulowana", wyświetlenie komunikatu "Wizyta anulowana bez konsekwencji" |

---

### TC007 - Anulowanie wizyty (24-48h przed)

| Pole | Wartość |
|------|---------|
| **ID** | TC007 |
| **Tytuł** | Anulowanie wizyty 24-48h przed terminem |
| **Warunki początkowe** | Zalogowany jako klient, wizyta zaplanowana za 24-48h |
| **Kroki testowe** | 1. Przejdź do szczegółów wizyty za 24-48h<br>2. Kliknij "Anuluj wizytę"<br>3. Przeczytaj wyświetlone ostrzeżenie<br>4. Potwierdź anulowanie |
| **Oczekiwany rezultat** | Wyświetlenie ostrzeżenia "UWAGA: Anulujesz wizytę na mniej niż 2 dni przed terminem", wizyta anulowana bez opłaty |

---

### TC008 - Anulowanie wizyty (<24h przed - blokada)

| Pole | Wartość |
|------|---------|
| **ID** | TC008 |
| **Tytuł** | Próba anulowania wizyty mniej niż 24h przed terminem |
| **Warunki początkowe** | Zalogowany jako klient, wizyta zaplanowana za mniej niż 24h |
| **Kroki testowe** | 1. Przejdź do szczegółów wizyty za <24h<br>2. Kliknij "Anuluj wizytę" |
| **Oczekiwany rezultat** | Wyświetlenie komunikatu "Wizyta odbywa się za mniej niż 24h. Anulowanie online nie jest możliwe. Skontaktuj się z kliniką telefonicznie.", przycisk anulowania nieaktywny |

---

### TC009 - Dodanie szczepienia ręcznego

| Pole | Wartość |
|------|---------|
| **ID** | TC009 |
| **Tytuł** | Dodanie szczepienia ręcznego przez właściciela |
| **Warunki początkowe** | Zalogowany jako klient, posiada pupila |
| **Kroki testowe** | 1. Przejdź do szczegółów pupila<br>2. Wybierz zakładkę "Szczepienia"<br>3. Kliknij "Dodaj szczepienie"<br>4. Wypełnij formularz: nazwa szczepionki, data podania, data następnego szczepienia<br>5. Kliknij "Zapisz" |
| **Oczekiwany rezultat** | Szczepienie pojawia się na liście z odpowiednim statusem (aktualne/zbliżające się/przeterminowane w zależności od daty następnego) |

---

### TC010 - Generowanie dokumentacji PDF

| Pole | Wartość |
|------|---------|
| **ID** | TC010 |
| **Tytuł** | Generowanie dokumentacji medycznej pupila w PDF |
| **Warunki początkowe** | Zalogowany jako klient, pupil posiada historię wizyt lub szczepień |
| **Kroki testowe** | 1. Przejdź do szczegółów pupila<br>2. Kliknij przycisk "Generuj dokumentację"<br>3. W oknie dialogowym wybierz zakres dat (opcjonalnie)<br>4. Kliknij "Pobierz PDF" |
| **Oczekiwany rezultat** | Przeglądarka pobiera plik PDF zawierający: dane pupila, listę wizyt w wybranym okresie, historię szczepień, informacje o właścicielu |

---

## Technologie użyte w projekcie

### Backend
| Technologia | Wersja | Opis |
|-------------|--------|------|
| Node.js | 18+ | Środowisko uruchomieniowe |
| Express.js | 4.19 | Framework HTTP |
| MySQL2 | 3.9 | Sterownik bazy danych |
| Zod | 3.22 | Walidacja schematów |
| JWT | 9.0 | Autoryzacja tokenowa |
| bcrypt | 5.1 | Haszowanie haseł |
| nodemailer | 7.0 | Wysyłanie emaili |
| PDFKit | 0.15 | Generowanie PDF |
| Jest | 29.7 | Framework testowy |
| Supertest | 6.3 | Testy HTTP |

### Frontend
| Technologia | Wersja | Opis |
|-------------|--------|------|
| React | 18.3 | Biblioteka UI |
| TypeScript | 5.8 | Typowanie statyczne |
| Vite | 5.4 | Build tool |
| React Router | 6.30 | Routing |
| React Query | 5.83 | Zarządzanie stanem serwera |
| React Hook Form | 7.61 | Formularze |
| shadcn/ui | - | Komponenty UI |
| Tailwind CSS | 3.4 | Style |
| Axios | 1.13 | Klient HTTP |
| Recharts | 2.15 | Wykresy |

### Infrastruktura
| Technologia | Opis |
|-------------|------|
| Docker | Konteneryzacja |
| Docker Compose | Orkiestracja kontenerów |
| MySQL 8 | Baza danych |

---

## Struktura projektu

```
VetCRM/
├── backend/
│   ├── src/
│   │   ├── config/           # Konfiguracja (DB, reguły biznesowe)
│   │   ├── controllers/      # Kontrolery HTTP
│   │   ├── middleware/       # Middleware (auth, upload)
│   │   ├── routes/           # Definicje tras API
│   │   ├── services/         # Logika biznesowa
│   │   ├── validators/       # Schematy Zod
│   │   └── utils/            # Funkcje pomocnicze
│   ├── tests/
│   │   ├── unit/             # Testy jednostkowe
│   │   ├── integration/      # Testy integracyjne
│   │   └── helpers/          # Pomocnicze funkcje testowe
│   ├── jest.config.js        # Konfiguracja Jest
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Komponenty React
│   │   ├── pages/            # Strony aplikacji
│   │   ├── services/         # Usługi API
│   │   ├── hooks/            # Custom hooks
│   │   └── types/            # Typy TypeScript
│   └── package.json
├── docker-compose.yml        # Konfiguracja Docker
└── README.md                 # Dokumentacja
```

---

## Licencja

Projekt edukacyjny na potrzeby kursu "Testowanie i Jakość Oprogramowania".
