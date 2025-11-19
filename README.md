# Testowanie i Jakość Oprogramowania
**Autor:** Bartłomiej Król - 36384
**Temat projektu:** VetCRM - System Zarządzania Kliniką Weterynaryjną

## 1. Opis Projektu
VetCRM to kompleksowa aplikacja webowa wspierająca codzienne funkcjonowanie kliniki weterynaryjnej. System umożliwia zarządzanie personelem, klientami, pacjentami (zwierzętami), wizytami oraz dokumentacją medyczną. Aplikacja została zaprojektowana z myślą o trzech głównych rolach użytkowników: Administratorze, Recepcjoniście oraz Lekarzu Weterynarii.

**Główne funkcjonalności:**
*   **Uwierzytelnianie i Autoryzacja:** Bezpieczne logowanie, role użytkowników, wymuszanie zmiany hasła.
*   **Zarządzanie Wizytami:** Interaktywny kalendarz, wykrywanie konfliktów terminów, statusy wizyt.
*   **Dokumentacja Medyczna:** Historia leczenia, diagnozy, recepty, załączniki.
*   **Finanse:** Śledzenie płatności za wizyty.

## 2. Technologie
Projekt został zrealizowany przy użyciu nowoczesnego stosu technologicznego:

**Backend:**
*   Node.js (Express.js)
*   MySQL 8.0
*   JWT (JSON Web Tokens)
*   Zod (Walidacja)
*   Swagger (Dokumentacja API)

**Frontend:**
*   React 18 (TypeScript)
*   Vite
*   Shadcn/UI & Tailwind CSS
*   React Query

**DevOps:**
*   Docker & Docker Compose

## 3. Uruchomienie Projektu
Projekt jest w pełni skonteneryzowany. Do uruchomienia wymagany jest jedynie Docker Desktop.

### Instrukcja:
1.  Otwórz terminal w głównym katalogu projektu.
2.  Uruchom komendę:
    ```bash
    docker-compose up --build
    ```
3.  Aplikacja będzie dostępna pod adresem: **http://localhost:5173**
4.  API Backend dostępne pod adresem: **http://localhost:3000**

*Uwaga: Baza danych zostanie automatycznie zainicjalizowana przy pierwszym uruchomieniu.*

## 4. Testy
*Status: W trakcie implementacji (Work in Progress)*

Planowane jest wdrożenie kompleksowych testów weryfikujących logikę biznesową oraz API.

### 4.1. Testy Jednostkowe (Unit Tests)
*Lokalizacja docelowa:* `backend/tests/unit/`
*Stan:* 🚧 W przygotowaniu

### 4.2. Testy Integracyjne (Integration Tests)
*Lokalizacja docelowa:* `backend/tests/integration/`
*Stan:* 🚧 W przygotowaniu

## 5. Dokumentacja API
Pełna dokumentacja endpointów API jest dostępna w formacie Swagger (OpenAPI).
*   **Adres:** `http://localhost:3000/api-docs`
*   (Dostępne po uruchomieniu projektu)


