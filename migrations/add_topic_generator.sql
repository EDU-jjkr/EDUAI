-- Topic Generator Tables (Replica of Deck Generator)
-- Run this migration to add support for Topic Generator feature

-- Topics table (similar to decks)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    school_id UUID REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Topic items table (similar to slides)
CREATE TABLE IF NOT EXISTS topic_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    item_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_created_by ON topics(created_by);
CREATE INDEX IF NOT EXISTS idx_topics_school_id ON topics(school_id);
CREATE INDEX IF NOT EXISTS idx_topic_items_topic_id ON topic_items(topic_id);
