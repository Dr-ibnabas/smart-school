-- ============================================================
-- SMART SCHOOL v2.0 - Schéma MySQL complet et harmonisé
-- Importez ce fichier dans phpMyAdmin sur smartschool_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS `smartschool_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smartschool_db`;

-- ============================================================
-- Table Utilisateurs (admins, enseignants)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `matricule`     VARCHAR(50)  UNIQUE NOT NULL,
  `email`         VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin', 'prof', 'eleve') DEFAULT 'prof',
  `nom`           VARCHAR(100),
  `prenom`        VARCHAR(100),
  -- Colonnes de compatibilité frontend (JSON)
  `subject`       VARCHAR(50)  DEFAULT NULL COMMENT 'ID matière principale (legacy compat)',
  `classes`       TEXT         DEFAULT NULL COMMENT 'JSON array des class_id assignées (legacy compat)',
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table Classes
-- ============================================================
CREATE TABLE IF NOT EXISTS `classes` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `nom`        VARCHAR(50)  NOT NULL,
  `niveau`     VARCHAR(50)  NOT NULL,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table Matières
-- ============================================================
CREATE TABLE IF NOT EXISTS `subjects` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nom`         VARCHAR(100) NOT NULL,
  `coefficient` FLOAT        DEFAULT 1,
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table Élèves
-- ============================================================
CREATE TABLE IF NOT EXISTS `students` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `matricule`  VARCHAR(50)  UNIQUE NOT NULL,
  `nom`        VARCHAR(100) NOT NULL,
  `prenom`     VARCHAR(100) NOT NULL,
  `genre`      ENUM('M', 'F') DEFAULT 'M',
  `class_id`   INT          DEFAULT NULL,
  `redoublant` BOOLEAN      DEFAULT FALSE,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL
);

-- ============================================================
-- Table Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS `grades` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT     NOT NULL,
  `class_id`   INT     NOT NULL,
  `subject_id` INT     NOT NULL,
  `teacher_id` INT     DEFAULT NULL,
  `term`       VARCHAR(50) NOT NULL,
  `grade1`     FLOAT   DEFAULT NULL,
  `grade2`     FLOAT   DEFAULT NULL,
  `grade3`     FLOAT   DEFAULT NULL,
  `updated_at` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_grades` (`student_id`, `class_id`, `subject_id`, `term`),
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`)   REFERENCES `classes`(`id`)  ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`)    ON DELETE SET NULL
);

-- ============================================================
-- Table Absences (colonnes harmonisées avec les routes Express)
-- ============================================================
CREATE TABLE IF NOT EXISTS `absences` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT          NOT NULL,
  `class_id`   INT          NOT NULL,
  `date`       DATE         NOT NULL,
  `statut`     VARCHAR(50)  NOT NULL DEFAULT 'absent' COMMENT 'absent | retard | justifié',
  `motif`      VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`)   REFERENCES `classes`(`id`)  ON DELETE CASCADE
);

-- ============================================================
-- Table Enseignant ↔ Matières (modèle relationnel)
-- ============================================================
CREATE TABLE IF NOT EXISTS `teacher_subjects` (
  `teacher_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  PRIMARY KEY (`teacher_id`, `subject_id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`)    ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE
);

-- ============================================================
-- Table Enseignant ↔ Classes (modèle relationnel)
-- ============================================================
CREATE TABLE IF NOT EXISTS `teacher_classes` (
  `teacher_id` INT NOT NULL,
  `class_id`   INT NOT NULL,
  PRIMARY KEY (`teacher_id`, `class_id`),
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`)   ON DELETE CASCADE,
  FOREIGN KEY (`class_id`)   REFERENCES `classes`(`id`) ON DELETE CASCADE
);

-- ============================================================
-- Table Emplois du Temps
-- ============================================================
CREATE TABLE IF NOT EXISTS `timetables` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `class_id`    INT          NOT NULL,
  `day_of_week` VARCHAR(20)  NOT NULL COMMENT 'Lundi, Mardi, ...',
  `start_time`  VARCHAR(10)  NOT NULL COMMENT 'HH:MM',
  `end_time`    VARCHAR(10)  NOT NULL COMMENT 'HH:MM',
  `subject_id`  INT          NOT NULL,
  `teacher_id`  INT          DEFAULT NULL,
  `room`        VARCHAR(50)  DEFAULT NULL,
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`)   REFERENCES `classes`(`id`)  ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`)    ON DELETE SET NULL
);

-- ============================================================
-- Table Paramètres globaux (colonnes étendues)
-- ============================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id`                   INT PRIMARY KEY DEFAULT 1,
  `platform_name`        VARCHAR(100) DEFAULT 'Smart School',
  `school_name`          VARCHAR(255) DEFAULT 'Smart School Academy',
  `logo_url`             VARCHAR(500) DEFAULT NULL,
  `stamp_url`            VARCHAR(500) DEFAULT NULL,
  `description`          TEXT         DEFAULT NULL,
  `language`             VARCHAR(10)  DEFAULT 'fr',
  `theme`                VARCHAR(20)  DEFAULT 'light',
  `current_academic_year` VARCHAR(20) DEFAULT NULL,
  `address`              VARCHAR(255) DEFAULT NULL,
  `phone`                VARCHAR(50)  DEFAULT NULL,
  `email`                VARCHAR(100) DEFAULT NULL,
  `website`              VARCHAR(255) DEFAULT NULL,
  `updated_at`           TIMESTAMP    ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Données par défaut
-- ============================================================
INSERT IGNORE INTO `settings` (`id`, `platform_name`, `school_name`)
  VALUES (1, 'Smart School', 'Smart School Academy');
