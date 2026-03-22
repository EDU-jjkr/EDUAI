-- Add source_topics column to lesson_plans table
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS source_topics TEXT[];

-- Verify column addition (optional, but good for debugging)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lesson_plans' AND column_name = 'source_topics';
