-- Add source tracking columns for better caching
-- This allows us to match future requests against the original user input
-- instead of trying to match against AI-generated titles

-- Decks: Track source topics and chapter
ALTER TABLE decks ADD COLUMN IF NOT EXISTS source_topics TEXT[];
ALTER TABLE decks ADD COLUMN IF NOT EXISTS source_chapter VARCHAR(255);

-- Topics: Track source topic
ALTER TABLE topics ADD COLUMN IF NOT EXISTS source_topic VARCHAR(255);

-- Activities: Track source topic
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_topic VARCHAR(255);

-- Lesson Plans: Track source topics
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS source_topics TEXT[];

-- Create indexes for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_decks_source_chapter ON decks(source_chapter);
CREATE INDEX IF NOT EXISTS idx_decks_source_topics ON decks USING GIN(source_topics);
CREATE INDEX IF NOT EXISTS idx_topics_source_topic ON topics(source_topic);
CREATE INDEX IF NOT EXISTS idx_activities_source_topic ON activities(source_topic);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_source_topics ON lesson_plans USING GIN(source_topics);
