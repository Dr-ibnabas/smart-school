-- ============================================================
-- SMART SCHOOL — Migration vers une architecture MULTI-ÉCOLES
-- ============================================================
-- À EXÉCUTER UNE SEULE FOIS via phpMyAdmin (Importer ce fichier),
-- ou ligne de commande :
--    mysql -u root smartschool_db < migration-multi-tenant.sql
--
-- Ce script est IDEMPOTENT : si vous le relancez, il ne casse rien.
-- ============================================================

USE `smartschool_db`;

-- ----------------------------------------------------------------
-- 1) Table des écoles (tenants)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schools` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `code`                VARCHAR(40)  NOT NULL UNIQUE,            -- identifiant court (ex: HOLLHOLL)
  `nom`                 VARCHAR(150) NOT NULL,                   -- nom complet de l'école
  `devise`              VARCHAR(255) DEFAULT NULL,
  `address`             VARCHAR(255) DEFAULT NULL,
  `phone`               VARCHAR(40)  DEFAULT NULL,
  `email`               VARCHAR(120) DEFAULT NULL,
  `website`             VARCHAR(150) DEFAULT NULL,
  `current_academic_year` VARCHAR(20) DEFAULT NULL,

  -- Identité visuelle / thème (éditeur complet)
  `logo_url`            VARCHAR(255) DEFAULT NULL,
  `stamp_url`           VARCHAR(255) DEFAULT NULL,
  `theme_primary`       VARCHAR(20)  DEFAULT '#1e40af',
  `theme_primary_light` VARCHAR(20)  DEFAULT '#3b82f6',
  `theme_secondary`     VARCHAR(20)  DEFAULT '#0f172a',
  `theme_background`    VARCHAR(20)  DEFAULT '#f8fafc',
  `theme_accent`        VARCHAR(20)  DEFAULT '#10b981',
  `font_family`         VARCHAR(120) DEFAULT 'Inter, system-ui, sans-serif',
  `density`             VARCHAR(20)  DEFAULT 'comfortable',      -- comfortable | compact

  `status`              ENUM('active', 'suspended', 'archived') DEFAULT 'active',
  `created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- 2) Étendre le rôle utilisateur pour accepter 'super_admin'
-- ----------------------------------------------------------------
-- MySQL n'accepte pas IF NOT EXISTS sur ALTER COLUMN, on fait via
-- un MODIFY direct (idempotent : si déjà ENUM correct, no-op).
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('super_admin', 'admin', 'prof', 'eleve') DEFAULT 'prof';

-- ----------------------------------------------------------------
-- 3) Insérer l'école par défaut à partir des settings actuels
--    (idempotent : INSERT IGNORE sur code unique)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `schools`
  (code, nom, devise, address, phone, email, website,
   current_academic_year, logo_url, stamp_url)
SELECT
  'DEFAULT'                                    AS code,
  COALESCE(NULLIF(s.school_name, ''), 'Mon École') AS nom,
  s.description                                AS devise,
  s.address, s.phone, s.email, s.website,
  s.current_academic_year, s.logo_url, s.stamp_url
FROM (
  -- Récupère la première ligne settings si elle existe, sinon valeurs vides
  SELECT * FROM `settings` ORDER BY id DESC LIMIT 1
) s
UNION
SELECT 'DEFAULT', 'Mon École', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM `settings`)
LIMIT 1;

-- Variable contenant l'ID de l'école par défaut (pour les UPDATE en cascade)
SET @default_school_id = (SELECT id FROM `schools` WHERE code = 'DEFAULT' LIMIT 1);

-- ----------------------------------------------------------------
-- 4) Ajouter school_id sur toutes les tables métier
--    Avant de toucher : on vérifie via INFORMATION_SCHEMA que la
--    colonne n'existe pas déjà (pour rester idempotent).
-- ----------------------------------------------------------------

-- Helper procédural : ajoute une colonne school_id si absente
DROP PROCEDURE IF EXISTS `add_school_id_if_missing`;
DELIMITER $$
CREATE PROCEDURE `add_school_id_if_missing`(IN tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = 'school_id'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `school_id` INT DEFAULT NULL, ADD INDEX `idx_school_id` (`school_id`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL `add_school_id_if_missing`('users');
CALL `add_school_id_if_missing`('students');
CALL `add_school_id_if_missing`('classes');
CALL `add_school_id_if_missing`('subjects');
CALL `add_school_id_if_missing`('grades');
CALL `add_school_id_if_missing`('absences');
CALL `add_school_id_if_missing`('timetables');

DROP PROCEDURE `add_school_id_if_missing`;

-- ----------------------------------------------------------------
-- 5) Backfill : tous les enregistrements existants sont rattachés
--    à l'école par défaut.
-- ----------------------------------------------------------------
UPDATE `users`      SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `students`   SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `classes`    SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `subjects`   SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `grades`     SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `absences`   SET school_id = @default_school_id WHERE school_id IS NULL;
UPDATE `timetables` SET school_id = @default_school_id WHERE school_id IS NULL;

-- ----------------------------------------------------------------
-- 6) ADMIN-001 devient SUPER ADMIN (global, sans école)
-- ----------------------------------------------------------------
UPDATE `users`
   SET role = 'super_admin',
       school_id = NULL
 WHERE matricule = 'ADMIN-001';

-- ----------------------------------------------------------------
-- 7) Créer un admin pour l'école par défaut (s'il n'existe pas déjà)
--    Hash bcrypt de 'principal123' (10 rounds) — à changer immédiatement
--    via le panneau super-admin (reset password).
-- ----------------------------------------------------------------
INSERT IGNORE INTO `users`
  (matricule, email, password_hash, role, nom, prenom, school_id)
VALUES (
  'PRINCIPAL-DEFAULT',
  'principal@default.smartschool',
  '$2b$10$rTL1eVGoKVCZJ7E/B4l6w.dvJP4nfaQymTwzN6.0bO5L8cwlfqXMK', -- = 'principal123'
  'admin',
  'Principal',
  'École par défaut',
  @default_school_id
);

-- ----------------------------------------------------------------
-- 8) Vérification post-migration (sortie informative)
-- ----------------------------------------------------------------
SELECT 'Schools créées' AS info, COUNT(*) AS n FROM `schools`
UNION ALL
SELECT 'Super admins', COUNT(*) FROM `users` WHERE role = 'super_admin'
UNION ALL
SELECT 'Admins école', COUNT(*) FROM `users` WHERE role = 'admin'
UNION ALL
SELECT 'Profs',        COUNT(*) FROM `users` WHERE role = 'prof'
UNION ALL
SELECT 'Élèves total', COUNT(*) FROM `students`;
