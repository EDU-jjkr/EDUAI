-- ===================================================
-- Chalkie-Inspired Deck System: Database Schema Updates
-- Phase 1: JSON Schema & IR Enhancement
-- ===================================================

-- Add new columns to decks table for lesson metadata
ALTER TABLE decks ADD COLUMN IF NOT EXISTS meta JSONB;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS structure JSONB;

COMMENT ON COLUMN decks.meta IS 'LessonMetadata: lesson_id, topic, grade, standards[], theme, pedagogical_model, created_at';
COMMENT ON COLUMN decks.structure IS 'LearningStructure: learning_objectives[], vocabulary[], prerequisites[], bloom_progression[]';

-- Add new columns to slides table
ALTER TABLE slides ADD COLUMN IF NOT EXISTS slide_type VARCHAR(50);
ALTER TABLE slides ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(20);
ALTER TABLE slides ADD COLUMN IF NOT EXISTS speaker_notes TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS image_query TEXT;

COMMENT ON COLUMN slides.slide_type IS 'SlideType enum: INTRODUCTION, CONCEPT, ACTIVITY, ASSESSMENT, SUMMARY';
COMMENT ON COLUMN slides.bloom_level IS 'BloomLevel enum: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE';
COMMENT ON COLUMN slides.speaker_notes IS 'Teacher notes for this slide';
COMMENT ON COLUMN slides.image_query IS 'Search query for stock photo APIs (e.g., "sun shining on ocean")';

-- Create index for faster filtering by Bloom's level
CREATE INDEX IF NOT EXISTS idx_slides_bloom_level ON slides(bloom_level);

-- Create index for faster filtering by slide type
CREATE INDEX IF NOT EXISTS idx_slides_type ON slides(slide_type);

-- Optional: Create a view for easy querying of lesson decks with all metadata
CREATE OR REPLACE VIEW lesson_decks_view AS
SELECT 
    d.id,
    d.title,
    d.subject,
    d.grade_level,
    d.meta,
    d.structure,
    d.created_by,
    d.created_at,
    d.updated_at,
    COUNT(s.id) as slide_count,
    ARRAY_AGG(s.bloom_level ORDER BY s.slide_order) as bloom_progression_actual
FROM decks d
LEFT JOIN slides s ON d.id = s.deck_id
GROUP BY d.id;

COMMENT ON VIEW lesson_decks_view IS 'Aggregated view of lesson decks with metadata and slide statistics';
