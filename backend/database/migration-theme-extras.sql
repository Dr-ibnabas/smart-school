-- ============================================================
-- SMART SCHOOL — Migration additive Lot J (éditeur de thème étendu)
-- À exécuter UNE fois via phpMyAdmin ou mysql CLI.
-- Idempotente : peut être relancée sans risque.
-- ============================================================

USE `smartschool_db`;

-- ----------------------------------------------------------------
-- 1) Ajouter dark_mode à schools (si absent)
-- ----------------------------------------------------------------
DROP PROCEDURE IF EXISTS `add_dark_mode_if_missing`;
DELIMITER $$
CREATE PROCEDURE `add_dark_mode_if_missing`()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'schools' AND column_name = 'dark_mode'
  ) THEN
    ALTER TABLE `schools`
      ADD COLUMN `dark_mode` TINYINT(1) DEFAULT 0 AFTER `density`;
  END IF;
END$$
DELIMITER ;

CALL `add_dark_mode_if_missing`();
DROP PROCEDURE `add_dark_mode_if_missing`;

-- ----------------------------------------------------------------
-- 2) Vérification
-- ----------------------------------------------------------------
SELECT 'Migration Lot J appliquée' AS info,
       COUNT(*) AS schools_total,
       SUM(CASE WHEN dark_mode = 1 THEN 1 ELSE 0 END) AS schools_dark
FROM `schools`;
