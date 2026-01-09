-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql:3306
-- Generation Time: Lis 19, 2025 at 06:11 PM
-- Wersja serwera: 8.0.44
-- Wersja PHP: 8.3.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Baza danych: `vetcrm`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `appointments`
--

CREATE TABLE `appointments` (
  `id` int NOT NULL,
  `pet_id` int NOT NULL,
  `doctor_user_id` int NOT NULL,
  `status` enum('proposed','confirmed','in_progress','completed','cancelled','cancelled_late') NOT NULL DEFAULT 'proposed',
  `scheduled_at` datetime NOT NULL,
  `duration_minutes` int NOT NULL DEFAULT '45' COMMENT 'Standard appointment duration: 45 min + 15 min break = 60 min time slot',
  `created_by_user_id` int NOT NULL,
  `reason` text,
  `location` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `late_cancellation_fee` decimal(10,2) DEFAULT NULL COMMENT 'Fee amount for late cancellation (if applicable)',
  `late_cancellation_fee_paid` tinyint(1) DEFAULT '0' COMMENT 'Whether the late cancellation fee has been paid',
  `late_cancellation_fee_note` varchar(500) DEFAULT NULL COMMENT 'Note about late cancellation (e.g., hours before cancellation)',
  `reason_id` int DEFAULT NULL COMMENT 'FK to appointment_reasons',
  `vaccination_type_id` int DEFAULT NULL COMMENT 'FK to vaccination_types (if reason is vaccination)',
  `reminder_24h_sent` tinyint(1) DEFAULT '0' COMMENT 'Whether 24h reminder email was sent',
  `reminder_2h_sent` tinyint(1) DEFAULT '0' COMMENT 'Whether 2h reminder email was sent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `appointments`
--

INSERT INTO `appointments` (`id`, `pet_id`, `doctor_user_id`, `status`, `scheduled_at`, `duration_minutes`, `created_by_user_id`, `reason`, `location`, `created_at`, `updated_at`, `late_cancellation_fee`, `late_cancellation_fee_paid`, `late_cancellation_fee_note`, `reason_id`, `vaccination_type_id`, `reminder_24h_sent`, `reminder_2h_sent`) VALUES
(1, 2, 4, 'cancelled', '2025-11-14 12:00:00', 45, 3, 'sdfasdasda', 'asdasd', '2025-11-04 14:14:49', '2025-11-14 17:09:44', NULL, 0, NULL, NULL, NULL, 0, 0),
(2, 3, 5, 'cancelled', '2025-11-04 14:00:00', 45, 3, 'sdfdsfsdfsdfsdf', 'sdfsfdsfsdfd', '2025-11-04 14:15:23', '2025-11-13 22:11:09', NULL, 0, NULL, NULL, NULL, 0, 0),
(3, 1, 5, 'cancelled', '2025-11-06 14:00:00', 45, 3, 'Testowa wizyta', 'gabinet 1', '2025-11-05 12:32:11', '2025-11-13 22:11:09', NULL, 0, NULL, NULL, NULL, 0, 0),
(4, 6, 4, 'cancelled', '2025-11-15 09:00:00', 45, 3, 'sdfdsfsdfsdfsdf', 'sdfsfdsfsdfd', '2025-11-12 14:35:56', '2025-11-19 12:03:00', NULL, 0, NULL, NULL, NULL, 0, 0),
(5, 6, 4, 'completed', '2025-11-18 09:00:00', 45, 3, 'sdfasdasda', 'gabinet 1', '2025-11-12 14:38:34', '2025-11-14 17:10:28', NULL, 0, NULL, NULL, NULL, 0, 0),
(6, 1, 5, 'completed', '2025-11-18 09:00:00', 45, 3, 'Testowa wizyta', 'gabinet 1', '2025-11-12 14:39:00', '2025-11-13 22:13:36', NULL, 0, NULL, NULL, NULL, 0, 0),
(7, 6, 4, 'cancelled', '2025-11-14 11:00:00', 45, 3, 'Testowa wizyta', 'adasdasd', '2025-11-13 10:51:15', '2025-11-14 17:09:44', NULL, 0, NULL, NULL, NULL, 0, 0),
(8, 2, 4, 'completed', '2025-11-20 12:00:00', 45, 3, 'Testowa wizyta', 'gabinet 1', '2025-11-13 22:16:38', '2025-11-13 22:25:25', NULL, 0, NULL, NULL, NULL, 0, 0),
(9, 2, 4, 'cancelled', '2025-11-20 11:00:00', 30, 7, NULL, NULL, '2025-11-15 08:56:14', '2025-11-16 09:54:41', NULL, 0, NULL, NULL, NULL, 0, 0),
(10, 3, 4, 'cancelled', '2025-11-21 14:00:00', 30, 7, NULL, NULL, '2025-11-15 08:56:25', '2025-11-15 09:03:40', NULL, 0, NULL, NULL, NULL, 0, 0),
(11, 3, 5, 'confirmed', '2025-11-20 14:00:00', 30, 7, NULL, NULL, '2025-11-15 08:56:31', '2025-11-19 15:00:02', NULL, 0, NULL, NULL, NULL, 1, 0),
(12, 2, 4, 'cancelled', '2025-11-17 11:00:00', 30, 7, NULL, NULL, '2025-11-15 08:58:02', '2025-11-16 09:54:33', NULL, 0, NULL, NULL, NULL, 0, 0),
(13, 7, 4, 'completed', '2025-11-20 15:00:00', 30, 11, NULL, NULL, '2025-11-16 11:03:53', '2025-11-19 15:26:09', NULL, 0, NULL, NULL, NULL, 1, 0),
(14, 7, 4, 'completed', '2025-11-28 14:00:00', 30, 11, NULL, NULL, '2025-11-16 11:11:31', '2025-11-19 14:35:30', NULL, 0, NULL, NULL, NULL, 0, 0),
(15, 7, 5, 'cancelled', '2025-11-18 13:00:00', 30, 11, NULL, NULL, '2025-11-16 11:11:38', '2025-11-19 15:54:21', NULL, 0, NULL, NULL, NULL, 0, 0),
(16, 7, 5, 'confirmed', '2025-11-21 13:00:00', 30, 11, NULL, NULL, '2025-11-16 11:11:45', '2025-11-16 11:14:32', NULL, 0, NULL, NULL, NULL, 0, 0),
(18, 3, 4, 'completed', '2025-11-20 13:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 11:57:26', '2025-11-19 15:23:10', NULL, 0, NULL, NULL, NULL, 0, 0),
(19, 7, 4, 'completed', '2025-11-19 14:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 12:02:31', '2025-11-19 14:35:27', NULL, 0, NULL, NULL, NULL, 0, 0),
(22, 7, 4, 'cancelled', '2025-11-19 16:00:00', 45, 3, NULL, NULL, '2025-11-19 15:51:44', '2025-11-19 15:51:54', NULL, 0, NULL, NULL, NULL, 0, 0),
(25, 7, 4, 'confirmed', '2025-11-25 16:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 16:10:17', '2025-11-19 16:10:17', NULL, 0, NULL, 3, NULL, 0, 0),
(26, 7, 4, 'completed', '2025-11-27 14:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 16:11:53', '2025-11-19 16:13:53', NULL, 0, NULL, 1, 2, 0, 0),
(27, 7, 4, 'cancelled', '2025-11-17 13:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 16:18:46', '2025-11-19 16:19:16', NULL, 0, NULL, 3, NULL, 0, 0),
(28, 7, 4, 'completed', '2025-11-21 10:00:00', 45, 3, NULL, 'gabinet 1', '2025-11-19 16:20:00', '2025-11-19 16:20:24', NULL, 0, NULL, 1, 2, 0, 0),
(30, 4, 4, 'confirmed', '2025-11-21 19:00:00', 30, 6, 'test', 'gabinet 1', '2025-11-19 17:30:01', '2025-11-19 17:30:48', NULL, 0, NULL, 1, 6, 0, 0);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `appointment_reasons`
--

CREATE TABLE `appointment_reasons` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Reason name (e.g., Szczepienie, Konsultacja)',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Detailed description',
  `is_vaccination` tinyint(1) DEFAULT '0' COMMENT 'Is this a vaccination reason?',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '999' COMMENT 'Sort order in UI',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Appointment reasons (Szczepienie, Konsultacja, etc.)';

--
-- Zrzut danych tabeli `appointment_reasons`
--

INSERT INTO `appointment_reasons` (`id`, `name`, `description`, `is_vaccination`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'Szczepienie', 'Wizyta szczepienia profilaktycznego', 1, 1, 1, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(2, 'Konsultacja', 'Konsultacja lekarska', 0, 1, 2, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(3, 'Kontrola', 'Wizyta kontrolna', 0, 1, 3, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(4, 'Zabieg chirurgiczny', 'Zabieg chirurgiczny', 0, 1, 4, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(5, 'Badania diagnostyczne', 'Badania laboratoryjne lub obrazowe', 0, 1, 5, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(6, 'Wizyta ratunkowa', 'NagÅ‚y przypadek wymagajÄ…cy pilnej interwencji', 0, 1, 6, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(7, 'PielÄ™gnacja', 'UsÅ‚ugi groomerskie i pielÄ™gnacyjne', 0, 1, 7, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(8, 'Pobieranie krwi', 'Pobranie prÃ³bek do badaÅ„', 0, 1, 8, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(9, 'Stomatologia', 'Czyszczenie zÄ™bÃ³w, ekstrakcja', 0, 1, 9, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(10, 'Rehabilitacja', 'Wizyty rehabilitacyjne', 0, 1, 10, '2025-11-19 10:50:42', '2025-11-19 10:50:42');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `appointment_reschedule_requests`
--

CREATE TABLE `appointment_reschedule_requests` (
  `id` int NOT NULL,
  `appointment_id` int NOT NULL,
  `old_scheduled_at` datetime NOT NULL COMMENT 'Original appointment time',
  `new_scheduled_at` datetime NOT NULL COMMENT 'Requested new appointment time',
  `requested_by` int NOT NULL COMMENT 'User ID (client) who requested the change',
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'When the request was made',
  `client_note` varchar(500) DEFAULT NULL COMMENT 'Optional note from client explaining reason for reschedule',
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Status of the reschedule request',
  `reviewed_by` int DEFAULT NULL COMMENT 'User ID of receptionist who reviewed the request',
  `reviewed_at` datetime DEFAULT NULL COMMENT 'When the request was reviewed',
  `rejection_reason` varchar(500) DEFAULT NULL COMMENT 'Reason for rejection (if rejected)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Stores client requests to reschedule appointments';

--
-- Zrzut danych tabeli `appointment_reschedule_requests`
--

INSERT INTO `appointment_reschedule_requests` (`id`, `appointment_id`, `old_scheduled_at`, `new_scheduled_at`, `requested_by`, `requested_at`, `client_note`, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`, `updated_at`) VALUES
(1, 11, '2025-11-20 14:00:00', '2025-11-20 15:00:00', 7, '2025-11-16 09:54:57', 'a', 'pending', NULL, NULL, NULL, '2025-11-16 09:54:57', '2025-11-16 09:54:57');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `appointment_services`
--

CREATE TABLE `appointment_services` (
  `appointment_id` int NOT NULL,
  `service_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `client_details`
--

CREATE TABLE `client_details` (
  `user_id` int NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `client_details`
--

INSERT INTO `client_details` (`user_id`, `address`, `notes`) VALUES
(6, 'ul. Dobra 1, 31-000 Kraków', 'Preferuje kontakt mailowy'),
(7, 'ul. Leśna 2, 31-100 Kraków', 'Zgoda na powiadomienia SMS'),
(8, 'ul testowa', 'ma psa'),
(9, 'Radlna 82B', 'aa'),
(10, 'test', 'test'),
(11, 'testowa 2', 'test');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `doctor_details`
--

CREATE TABLE `doctor_details` (
  `user_id` int NOT NULL,
  `specialization` varchar(100) NOT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `experience_years` smallint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `doctor_details`
--

INSERT INTO `doctor_details` (`user_id`, `specialization`, `license_number`, `experience_years`) VALUES
(4, 'Chirurgia i ortopedia', 'DOC-PL-0001', 7),
(5, 'Dermatologia i stomatologia', 'DOC-PL-0002', 5);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `medical_files`
--

CREATE TABLE `medical_files` (
  `id` int NOT NULL,
  `medical_record_id` int NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_size` int UNSIGNED DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `medical_records`
--

CREATE TABLE `medical_records` (
  `id` int NOT NULL,
  `appointment_id` int NOT NULL,
  `notes` text,
  `diagnosis` text,
  `treatment` text,
  `prescription` text,
  `created_by_user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `medical_records`
--

INSERT INTO `medical_records` (`id`, `appointment_id`, `notes`, `diagnosis`, `treatment`, `prescription`, `created_by_user_id`, `created_at`) VALUES
(1, 6, NULL, NULL, NULL, NULL, 5, '2025-11-13 22:13:35'),
(2, 8, NULL, 'asdasd', 'asd', NULL, 4, '2025-11-13 22:25:23'),
(3, 19, 'a', 'a', 'a', 'a', 4, '2025-11-19 14:35:27'),
(4, 18, 'test', 'test', 'test', 'test', 4, '2025-11-19 15:23:08'),
(5, 13, 'asd', 'asd', 'asd', 'asd', 4, '2025-11-19 15:26:09'),
(6, 26, 'Zostało wykonane szczepienie ', NULL, NULL, NULL, 4, '2025-11-19 16:13:53'),
(7, 28, 'szczepienie', NULL, NULL, NULL, 4, '2025-11-19 16:20:24');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('reminder','system','warning','info') NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `email_queue`
--

CREATE TABLE `email_queue` (
  `id` int NOT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `html_body` text NOT NULL,
  `retry_count` int DEFAULT '0',
  `max_retries` int DEFAULT '3',
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'User requesting password reset',
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Secure random token',
  `expires_at` timestamp NOT NULL COMMENT 'Token expiration time',
  `used_at` timestamp NULL DEFAULT NULL COMMENT 'When token was used',
  `cancelled_at` timestamp NULL DEFAULT NULL COMMENT 'When token was cancelled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When token was created',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address of requester'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `token_blacklist`
--

CREATE TABLE `token_blacklist` (
  `id` int NOT NULL,
  `token_jti` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT ID',
  `user_id` int NOT NULL COMMENT 'User who owns this token',
  `revoked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the token was revoked',
  `expires_at` timestamp NOT NULL COMMENT 'When the token expires',
  `reason` enum('logout','password_change','security','admin_action') COLLATE utf8mb4_unicode_ci DEFAULT 'logout'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `penalties`
--

CREATE TABLE `penalties` (
  `id` int NOT NULL,
  `client_user_id` int NOT NULL,
  `appointment_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `pets`
--

CREATE TABLE `pets` (
  `id` int NOT NULL,
  `owner_user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `species` varchar(50) NOT NULL,
  `breed` varchar(50) DEFAULT NULL,
  `sex` enum('male','female','unknown') NOT NULL DEFAULT 'unknown',
  `date_of_birth` date DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `weight` decimal(6,2) DEFAULT NULL COMMENT 'Weight in kg',
  `microchip_number` varchar(50) DEFAULT NULL COMMENT 'Microchip identification number'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `pets`
--

INSERT INTO `pets` (`id`, `owner_user_id`, `name`, `species`, `breed`, `sex`, `date_of_birth`, `notes`, `created_at`, `updated_at`, `weight`, `microchip_number`) VALUES
(1, 6, 'Frodo', 'pies', 'mieszaniec', 'male', '2021-04-10', 'Żywienie BARF', '2025-11-03 21:57:01', '2025-11-03 21:57:01', NULL, NULL),
(2, 7, 'Mila', 'kot', 'brytyjski', 'female', '2020-09-01', 'Spokojna, wrażliwa', '2025-11-03 21:57:01', '2025-11-03 21:57:01', NULL, NULL),
(3, 7, 'Borys', 'pies', 'labrador', 'male', '2019-05-15', 'Aktywny, alergik', '2025-11-03 21:57:01', '2025-11-03 21:57:01', NULL, NULL),
(4, 6, 'filemon', 'kot', 'nieznana', 'male', '1999-12-31', 'ładny', '2025-11-03 22:46:40', '2025-11-13 22:15:59', 7.00, 'asdadssad'),
(6, 8, 'filemon', 'Kot', 'chodnikowy', 'male', '2025-10-31', 'czarny', '2025-11-05 12:33:20', '2025-11-13 15:28:46', 6.00, 'sadasd'),
(7, 11, 'burek', 'pies', 'dog', 'male', '2025-11-06', 'asd', '2025-11-16 11:02:10', '2025-11-16 11:02:10', 6.00, 'asdasd'),
(8, 7, 'yrdy', 'yrdy', 'yrdy', 'female', '2025-11-07', NULL, '2025-11-16 22:48:42', '2025-11-16 22:48:42', 65.00, '6');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `receptionist_details`
--

CREATE TABLE `receptionist_details` (
  `user_id` int NOT NULL,
  `start_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `receptionist_details`
--

INSERT INTO `receptionist_details` (`user_id`, `start_date`) VALUES
(3, '2025-11-03');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `roles`
--

INSERT INTO `roles` (`id`, `name`) VALUES
(1, 'admin'),
(4, 'client'),
(3, 'doctor'),
(2, 'receptionist');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `schedules`
--

CREATE TABLE `schedules` (
  `id` int NOT NULL,
  `doctor_user_id` int NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
  `repeat_pattern` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected') DEFAULT 'approved',
  `requested_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `notes` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `schedules`
--

INSERT INTO `schedules` (`id`, `doctor_user_id`, `date`, `start_time`, `end_time`, `is_recurring`, `repeat_pattern`, `created_at`, `updated_at`, `status`, `requested_by_user_id`, `approved_by_user_id`, `notes`) VALUES
(1, 4, '2025-11-12', '08:00:00', '17:00:00', 0, NULL, '2025-11-12 14:09:30', '2025-11-12 14:09:30', 'approved', NULL, NULL, NULL),
(2, 4, '2025-11-13', '10:00:00', '18:00:00', 0, NULL, '2025-11-12 14:09:53', '2025-11-12 14:09:53', 'approved', NULL, NULL, NULL),
(3, 4, '2025-11-12', '20:00:00', '23:00:00', 0, NULL, '2025-11-12 14:20:39', '2025-11-12 14:20:39', 'approved', NULL, NULL, NULL),
(4, 4, '2025-11-12', '11:00:00', '19:00:00', 0, NULL, '2025-11-12 14:24:41', '2025-11-12 14:27:09', 'approved', 4, 2, '\n[Admin: test]'),
(5, 4, '2025-11-20', '10:00:00', '18:00:00', 0, NULL, '2025-11-12 22:00:12', '2025-11-12 22:00:12', 'approved', 4, 4, 'a'),
(6, 4, '2025-11-20', '10:00:00', '18:00:00', 0, NULL, '2025-11-12 22:03:41', '2025-11-12 22:03:41', 'approved', 4, 4, 'aaaa'),
(7, 4, '2025-11-20', '10:00:00', '18:00:00', 0, NULL, '2025-11-12 22:05:30', '2025-11-12 22:05:30', 'approved', 4, 4, 'saqsa'),
(8, 4, '2025-11-21', '05:00:00', '20:00:00', 0, NULL, '2025-11-12 22:08:34', '2025-11-12 22:08:34', 'approved', 4, 4, 'y'),
(9, 4, '2025-11-25', '11:00:00', '20:00:00', 0, NULL, '2025-11-12 22:10:03', '2025-11-12 22:10:03', 'approved', 4, 4, NULL),
(10, 4, '2025-11-20', '10:00:00', '16:00:00', 0, NULL, '2025-11-13 22:25:58', '2025-11-13 22:25:58', 'approved', 4, 4, 'wywiadówka');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `services`
--

CREATE TABLE `services` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_minutes` int NOT NULL,
  `description` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `services`
--

INSERT INTO `services` (`id`, `name`, `category`, `price`, `duration_minutes`, `description`) VALUES
(1, 'konsultacja', 'konsultacja', 100.00, 45, NULL);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `settings`
--

CREATE TABLE `settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `settings`
--

INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `updated_at`) VALUES
('appointment_reminder_hours', '24', 'number', 'Liczba godzin przed wizytą do wysłania przypomnienia', '2025-11-04 09:19:37'),
('cancellation_policy_hours', '24', 'number', 'Minimalna liczba godzin przed wizytą do odwołania bez opłaty', '2025-11-04 09:19:37'),
('clinic_address', 'ul. Przykładowa 1, 00-001 Warszawa', 'string', 'Adres kliniki', '2025-11-04 09:19:37'),
('clinic_email', 'kontakt@klinika.pl', 'string', 'Email kontaktowy', '2025-11-04 09:19:37'),
('clinic_name', 'Klinika Weterynaryjna', 'string', 'Nazwa kliniki', '2025-11-04 09:19:37'),
('clinic_phone', '+48 123 456 789', 'string', 'Telefon kontaktowy', '2025-11-04 09:19:37'),
('default_appointment_duration', '30', 'number', 'Domyślny czas trwania wizyty (minuty)', '2025-11-04 09:19:37'),
('email_notifications_enabled', '1', 'boolean', 'Powiadomienia email włączone', '2025-11-04 09:19:37'),
('late_cancellation_fee', '50', 'number', 'Opłata za późne odwołanie wizyty (PLN)', '2025-11-04 09:19:37'),
('sms_notifications_enabled', '0', 'boolean', 'Powiadomienia SMS włączone', '2025-11-04 09:19:37'),
('working_hours', '{\"monday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"tuesday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"wednesday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"thursday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"friday\":{\"open\":\"08:00\",\"close\":\"18:00\"},\"saturday\":{\"open\":\"09:00\",\"close\":\"14:00\"},\"sunday\":{\"open\":null,\"close\":null}}', 'json', 'Godziny otwarcia kliniki', '2025-11-04 09:19:37');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Whether user account is active (only admin can change)',
  `must_change_password` tinyint(1) DEFAULT '0' COMMENT 'Forces user to change password on next login',
  `password_changed_at` datetime DEFAULT NULL COMMENT 'Timestamp of last password change',
  `deleted_at` datetime DEFAULT NULL COMMENT 'Timestamp when user was soft-deleted',
  `deleted_by_user_id` int DEFAULT NULL COMMENT 'ID of admin who deleted this user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Zrzut danych tabeli `users`
--

INSERT INTO `users` (`id`, `role_id`, `first_name`, `last_name`, `email`, `phone`, `password_hash`, `created_at`, `updated_at`, `is_active`, `must_change_password`, `password_changed_at`) VALUES
(2, 1, 'Admin', 'Owner', 'admin@test.pl', '+48 600 000 000', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 15:54:37', 1, 0, NULL),
(3, 2, 'Kasia', 'Recep', 'rec@test.pl', '+48 600 000 001', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 15:54:37', 1, 0, NULL),
(4, 3, 'Jan', 'Kowalski', 'doc1@test.pl', '+48 600 000 002', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 15:54:37', 1, 0, NULL),
(5, 3, 'Anna', 'Nowak', 'doc2@test.pl', '+48 600 000 003', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 15:54:37', 1, 0, NULL),
(6, 4, 'Michal', 'Klient', 'client1@test.pl', '+48 600 000 004', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 22:46:12', 1, 0, NULL),
(7, 4, 'Agnieszka', 'Klient', 'client2@test.pl', '+48 600 000 005', '$2b$10$QtBKn6C7SfdjIb590Mx7quchU1C6FjeJ3y/I1qpkg87KPviW5nIym', '2025-11-03 15:33:42', '2025-11-03 15:54:37', 1, 0, NULL),
(8, 4, 'adam', 'noga', 'test@test.pl', '+786897678', '$2b$12$NTrWlFMTOEPsK538IgGj9.bqeg7OW68bGCrSjoy9at8Qi3RnReIIa', '2025-11-04 14:32:59', '2025-11-05 12:33:41', 1, 0, NULL),
(9, 4, 'szymon', 'adamczyk', 'test@teast.pl', '+48111333333', '$2b$12$0r1M/O1w8acBIqPCDEmSLuYuGg3CGvjtC6iPu0NvigYwEvHGBBTzq', '2025-11-13 10:49:40', '2025-11-13 10:49:40', 1, 0, NULL),
(10, 4, 'test', 'test', 'test1@test.pl', '+48111111111', '$2b$12$jnyb5SJYUL54tlr/q.VWXOuWoY9lKdpk.GmPlxx9B5liFjWs1YWPm', '2025-11-14 21:13:11', '2025-11-14 21:14:13', 1, 0, '2025-11-14 21:14:13'),
(11, 4, 'BARTŁOMIEJ', 'KRÓL', 'bartlomiej.raffle@gmail.com', '+48111111111', '$2b$12$QlMgzq6M8Q3sR1fiA9Lww.cCXdXKcjiLUrpqNt9fJpvhj048TuXca', '2025-11-16 11:01:33', '2025-11-16 11:02:45', 1, 0, '2025-11-16 11:02:45');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `vaccinations`
--

CREATE TABLE `vaccinations` (
  `id` int NOT NULL,
  `pet_id` int NOT NULL,
  `vaccine_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vaccination_date` date NOT NULL,
  `next_due_date` date NOT NULL,
  `batch_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `administered_by_user_id` int DEFAULT NULL,
  `appointment_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `added_by_user_id` int DEFAULT NULL COMMENT 'User who added this record (for manual entries)',
  `source` enum('appointment','manual') COLLATE utf8mb4_unicode_ci DEFAULT 'appointment' COMMENT 'How was this vaccination added?',
  `vaccination_type_id` int DEFAULT NULL COMMENT 'FK to vaccination_types',
  `reminder_sent` tinyint(1) DEFAULT '0' COMMENT 'Whether vaccination reminder email was sent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `vaccinations`
--

INSERT INTO `vaccinations` (`id`, `pet_id`, `vaccine_name`, `vaccination_date`, `next_due_date`, `batch_number`, `administered_by_user_id`, `appointment_id`, `notes`, `created_at`, `updated_at`, `added_by_user_id`, `source`, `vaccination_type_id`, `reminder_sent`) VALUES
(1, 7, 'DHPP (5w1)', '2025-11-21', '2026-11-21', NULL, 4, 28, NULL, '2025-11-19 16:20:24', '2025-11-19 16:20:24', 4, 'appointment', 2, 0);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `vaccination_types`
--

CREATE TABLE `vaccination_types` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Vaccine name',
  `species` enum('pies','kot','gryzoÅ„','ptak','inne','wszystkie') COLLATE utf8mb4_unicode_ci DEFAULT 'wszystkie' COMMENT 'Target species or "wszystkie" for all',
  `description` text COLLATE utf8mb4_unicode_ci,
  `recommended_interval_months` int DEFAULT NULL COMMENT 'Recommended interval for booster (e.g., 12 for yearly)',
  `is_required` tinyint(1) DEFAULT '0' COMMENT 'Is this vaccine legally required?',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '999',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vaccination types per species';

--
-- Zrzut danych tabeli `vaccination_types`
--

INSERT INTO `vaccination_types` (`id`, `name`, `species`, `description`, `recommended_interval_months`, `is_required`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'WÅ›cieklizna', 'pies', 'ObowiÄ…zkowe szczepienie przeciwko wÅ›ciekliÅºnie', 12, 1, 1, 1, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(2, 'DHPP (5w1)', 'pies', 'NosÃ³wka, zapalenie wÄ…troby, parwowiroza, parainfluenza', 12, 0, 1, 2, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(3, 'Bordetella', 'pies', 'Zapalenie tchawicy i oskrzeli (kennelowy kaszel)', 12, 0, 1, 3, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(4, 'Leishmania', 'pies', 'Leiszmanioza - szczepienie przed podrÃ³Å¼Ä…', 12, 0, 1, 4, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(5, 'Wścieklizna', 'kot', 'ObowiÄ…zkowe szczepienie przeciwko wÅ›ciekliÅºnie', 12, 1, 1, 1, '2025-11-19 10:50:42', '2025-11-19 11:30:11'),
(6, 'FVRCP (3w1)', 'kot', 'Koci katar, kaliciwiroza, panleukopenia', 12, 0, 1, 2, '2025-11-19 10:50:42', '2025-11-19 10:50:42'),
(7, 'FeLV', 'kot', 'BiaÅ‚aczka kotÃ³w - dla kotÃ³w z dostÄ™pem na zewnÄ…trz', 12, 0, 1, 3, '2025-11-19 10:50:42', '2025-11-19 10:50:42');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `working_hours`
--

CREATE TABLE `working_hours` (
  `id` int NOT NULL,
  `doctor_user_id` int NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `working_hours`
--

INSERT INTO `working_hours` (`id`, `doctor_user_id`, `day_of_week`, `start_time`, `end_time`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 5, 'monday', '08:00:00', '16:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(2, 5, 'tuesday', '08:00:00', '16:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(3, 5, 'wednesday', '08:00:00', '16:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(4, 5, 'thursday', '08:00:00', '16:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(5, 5, 'friday', '08:00:00', '16:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(6, 4, 'monday', '09:00:00', '17:00:00', 0, '2025-11-04 18:52:14', '2025-11-12 14:23:30'),
(7, 4, 'tuesday', '10:00:00', '17:00:00', 1, '2025-11-04 18:52:14', '2025-11-12 22:24:04'),
(8, 4, 'wednesday', '10:00:00', '17:00:00', 1, '2025-11-04 18:52:14', '2025-11-13 11:00:19'),
(9, 4, 'thursday', '09:00:00', '17:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(10, 4, 'friday', '09:00:00', '17:00:00', 1, '2025-11-04 18:52:14', '2025-11-04 18:52:14'),
(14, 4, 'monday', '11:00:00', '17:00:00', 1, '2025-11-13 22:25:41', '2025-11-13 22:25:41');

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_appointments_doctor_time` (`doctor_user_id`,`scheduled_at`),
  ADD KEY `fk_appointments_created_by` (`created_by_user_id`),
  ADD KEY `idx_appointments_pet` (`pet_id`),
  ADD KEY `idx_appointments_status` (`status`),
  ADD KEY `idx_appointments_date` (`scheduled_at`),
  ADD KEY `idx_appointments_reason` (`reason_id`),
  ADD KEY `idx_appointments_vaccination_type` (`vaccination_type_id`),
  ADD KEY `idx_appointments_24h_reminder` (`reminder_24h_sent`,`scheduled_at`,`status`),
  ADD KEY `idx_appointments_2h_reminder` (`reminder_2h_sent`,`scheduled_at`,`status`);

--
-- Indeksy dla tabeli `appointment_reasons`
--
ALTER TABLE `appointment_reasons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active_order` (`is_active`,`display_order`),
  ADD KEY `idx_vaccination` (`is_vaccination`,`is_active`);

--
-- Indeksy dla tabeli `appointment_reschedule_requests`
--
ALTER TABLE `appointment_reschedule_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_reschedule_status` (`status`,`requested_at`),
  ADD KEY `idx_reschedule_appointment` (`appointment_id`),
  ADD KEY `idx_reschedule_client` (`requested_by`);

--
-- Indeksy dla tabeli `appointment_services`
--
ALTER TABLE `appointment_services`
  ADD PRIMARY KEY (`appointment_id`,`service_id`),
  ADD KEY `fk_appt_services_service` (`service_id`);

--
-- Indeksy dla tabeli `client_details`
--
ALTER TABLE `client_details`
  ADD PRIMARY KEY (`user_id`);

--
-- Indeksy dla tabeli `doctor_details`
--
ALTER TABLE `doctor_details`
  ADD PRIMARY KEY (`user_id`);

--
-- Indeksy dla tabeli `medical_files`
--
ALTER TABLE `medical_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_med_files_record` (`medical_record_id`);

--
-- Indeksy dla tabeli `medical_records`
--
ALTER TABLE `medical_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_appointment_id` (`appointment_id`),
  ADD KEY `fk_med_records_creator` (`created_by_user_id`);

--
-- Indeksy dla tabeli `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`),
  ADD KEY `idx_notifications_type` (`type`);

--
-- Indeksy dla tabeli `email_queue`
--
ALTER TABLE `email_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status_retry` (`status`,`next_retry_at`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indeksy dla tabeli `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_user_expires` (`user_id`,`expires_at`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indeksy dla tabeli `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token_jti` (`token_jti`),
  ADD KEY `idx_token_jti` (`token_jti`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indeksy dla tabeli `penalties`
--
ALTER TABLE `penalties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_penalties_appt` (`appointment_id`),
  ADD KEY `idx_penalties_client` (`client_user_id`);

--
-- Indeksy dla tabeli `pets`
--
ALTER TABLE `pets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pets_owner` (`owner_user_id`);

--
-- Indeksy dla tabeli `receptionist_details`
--
ALTER TABLE `receptionist_details`
  ADD PRIMARY KEY (`user_id`);

--
-- Indeksy dla tabeli `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indeksy dla tabeli `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_schedules_doctor_date` (`doctor_user_id`,`date`),
  ADD KEY `idx_schedules_date_range` (`date`,`doctor_user_id`),
  ADD KEY `fk_schedules_approved_by` (`approved_by_user_id`),
  ADD KEY `idx_schedules_status` (`status`),
  ADD KEY `idx_schedules_requested_by` (`requested_by_user_id`);

--
-- Indeksy dla tabeli `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_services_name` (`name`),
  ADD KEY `idx_services_category` (`category`);

--
-- Indeksy dla tabeli `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indeksy dla tabeli `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_email_active` (`email`,`deleted_at`),
  ADD KEY `fk_users_role` (`role_id`),
  ADD KEY `idx_users_active` (`is_active`),
  ADD KEY `idx_users_password_status` (`must_change_password`,`is_active`),
  ADD KEY `idx_deleted_at` (`deleted_at`),
  ADD KEY `fk_users_deleted_by` (`deleted_by_user_id`);

--
-- Indeksy dla tabeli `vaccinations`
--
ALTER TABLE `vaccinations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_vaccinations_doctor` (`administered_by_user_id`),
  ADD KEY `fk_vaccinations_appointment` (`appointment_id`),
  ADD KEY `idx_vaccinations_pet` (`pet_id`),
  ADD KEY `idx_vaccinations_next_due` (`next_due_date`),
  ADD KEY `idx_vaccinations_added_by` (`added_by_user_id`),
  ADD KEY `idx_vaccinations_source` (`source`),
  ADD KEY `idx_vaccinations_type` (`vaccination_type_id`),
  ADD KEY `idx_vaccinations_reminder` (`reminder_sent`,`next_due_date`);

--
-- Indeksy dla tabeli `vaccination_types`
--
ALTER TABLE `vaccination_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_species_active` (`species`,`is_active`),
  ADD KEY `idx_required` (`is_required`,`is_active`);

--
-- Indeksy dla tabeli `working_hours`
--
ALTER TABLE `working_hours`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_doctor_day_time` (`doctor_user_id`,`day_of_week`,`start_time`,`end_time`),
  ADD KEY `idx_doctor` (`doctor_user_id`),
  ADD KEY `idx_day` (`day_of_week`),
  ADD KEY `idx_active` (`is_active`);

--
-- AUTO_INCREMENT dla zrzuconych tabel
--

--
-- AUTO_INCREMENT dla tabeli `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT dla tabeli `appointment_reasons`
--
ALTER TABLE `appointment_reasons`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT dla tabeli `appointment_reschedule_requests`
--
ALTER TABLE `appointment_reschedule_requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT dla tabeli `medical_files`
--
ALTER TABLE `medical_files`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `medical_records`
--
ALTER TABLE `medical_records`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT dla tabeli `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `email_queue`
--
ALTER TABLE `email_queue`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `token_blacklist`
--
ALTER TABLE `token_blacklist`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `penalties`
--
ALTER TABLE `penalties`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `pets`
--
ALTER TABLE `pets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT dla tabeli `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT dla tabeli `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT dla tabeli `services`
--
ALTER TABLE `services`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT dla tabeli `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT dla tabeli `vaccinations`
--
ALTER TABLE `vaccinations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT dla tabeli `vaccination_types`
--
ALTER TABLE `vaccination_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT dla tabeli `working_hours`
--
ALTER TABLE `working_hours`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Ograniczenia dla zrzutów tabel
--

--
-- Ograniczenia dla tabeli `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_reason` FOREIGN KEY (`reason_id`) REFERENCES `appointment_reasons` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_appointments_vaccination_type` FOREIGN KEY (`vaccination_type_id`) REFERENCES `vaccination_types` (`id`) ON DELETE SET NULL;

--
-- Ograniczenia dla tabeli `appointment_reschedule_requests`
--
ALTER TABLE `appointment_reschedule_requests`
  ADD CONSTRAINT `appointment_reschedule_requests_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointment_reschedule_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointment_reschedule_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ograniczenia dla tabeli `appointment_services`
--
ALTER TABLE `appointment_services`
  ADD CONSTRAINT `fk_appt_services_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appt_services_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `client_details`
--
ALTER TABLE `client_details`
  ADD CONSTRAINT `fk_client_details_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `doctor_details`
--
ALTER TABLE `doctor_details`
  ADD CONSTRAINT `fk_doctor_details_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `medical_files`
--
ALTER TABLE `medical_files`
  ADD CONSTRAINT `fk_med_files_record` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `medical_records`
--
ALTER TABLE `medical_records`
  ADD CONSTRAINT `fk_med_records_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_med_records_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD CONSTRAINT `fk_token_blacklist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `penalties`
--
ALTER TABLE `penalties`
  ADD CONSTRAINT `fk_penalties_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_penalties_client` FOREIGN KEY (`client_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `pets`
--
ALTER TABLE `pets`
  ADD CONSTRAINT `fk_pets_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `receptionist_details`
--
ALTER TABLE `receptionist_details`
  ADD CONSTRAINT `fk_receptionist_details_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `fk_schedules_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_schedules_doctor` FOREIGN KEY (`doctor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_schedules_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ograniczenia dla tabeli `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_deleted_by` FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `vaccinations`
--
ALTER TABLE `vaccinations`
  ADD CONSTRAINT `fk_vaccinations_added_by` FOREIGN KEY (`added_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_vaccinations_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vaccinations_doctor` FOREIGN KEY (`administered_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vaccinations_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vaccinations_type` FOREIGN KEY (`vaccination_type_id`) REFERENCES `vaccination_types` (`id`) ON DELETE SET NULL;

--
-- Ograniczenia dla tabeli `working_hours`
--
ALTER TABLE `working_hours`
  ADD CONSTRAINT `working_hours_ibfk_1` FOREIGN KEY (`doctor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
