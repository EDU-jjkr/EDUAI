-- Migration: Add visual metadata columns to slides table
-- Purpose: Support smart visual routing system for educational slide generation
-- Date: 2025-12-12

-- Add visual-related columns to slides table
ALTER TABLE slides 
ADD COLUMN IF NOT EXISTS visual_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS visual_config JSONB,
ADD COLUMN IF NOT EXISTS visual_confidence NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS generated_by VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN slides.visual_type IS 'Type of visual: diagram, chart, math, illustration, none';
COMMENT ON COLUMN slides.visual_config IS 'JSON configuration for visual generation tool';
COMMENT ON COLUMN slides.visual_confidence IS 'Confidence score (0-100) for visual classification';
COMMENT ON COLUMN slides.generated_by IS 'Tool that generated the visual: mermaid, chartjs, latex, dalle3';

-- Create index on visual_type for filtering
CREATE INDEX IF NOT EXISTS idx_slides_visual_type ON slides(visual_type);

-- Optional: Create a view for slides with visuals
CREATE OR REPLACE VIEW slides_with_visuals AS
SELECT 
    s.*,
    d.title as deck_title,
    d.subject,
    d.grade_level
FROM slides s
JOIN decks d ON s.deck_id = d.id
WHERE s.visual_type IS NOT NULL AND s.visual_type != 'none';

COMMENT ON VIEW slides_with_visuals IS 'View of all slides that have visual content generated';
