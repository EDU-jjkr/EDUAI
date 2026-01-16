-- ===============================================
-- CLEANUP SCRIPT - Run this first
-- ===============================================
-- This script cleans up the partial migration state
-- Run this BEFORE running the fixed master_migration.sql
-- ===============================================

-- Drop the migration_history table if it exists (from partial run)
DROP TABLE IF EXISTS migration_history CASCADE;

-- Drop views that might have conflicts
DROP VIEW IF EXISTS slides_with_visuals CASCADE;
DROP VIEW IF EXISTS lesson_decks_view CASCADE;

-- Verify cleanup
SELECT 'Cleanup complete - ready for migration' as status;
