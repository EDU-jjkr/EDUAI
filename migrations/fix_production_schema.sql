-- ===============================================
-- FIX MIGRATION: Apply missing AI/Source Tracking features
-- ===============================================

BEGIN;

-- 1. Add Source Tracking Columns (Migration 11)
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

-- 2. Add Question Generator Tables (Migration 12)

-- Create ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE template_type AS ENUM ('SVG', 'CANVAS', 'HYBRID', 'MERMAID', 'LAYOUT', 'SYLLABUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE generation_type AS ENUM ('TEMPLATE', 'AI_GENERATED', 'HYBRID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core question table
CREATE TABLE IF NOT EXISTS generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    options JSONB,
    metadata JSONB,
    created_by UUID REFERENCES users(id),
    school_id UUID REFERENCES schools(id),
    class_level VARCHAR(20),
    board VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for generated_questions
CREATE INDEX IF NOT EXISTS idx_generated_questions_subject ON generated_questions(subject);
CREATE INDEX IF NOT EXISTS idx_generated_questions_chapter ON generated_questions(chapter);
CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty ON generated_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_generated_questions_type ON generated_questions(type);
CREATE INDEX IF NOT EXISTS idx_generated_questions_created_by ON generated_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_questions_school ON generated_questions(school_id);

-- Question quality metrics
CREATE TABLE IF NOT EXISTS question_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    grammar_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    difficulty_score DECIMAL(3,2),
    clarity_score DECIMAL(3,2),
    pedagogical_value DECIMAL(3,2),
    user_ratings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_question ON question_quality_metrics(question_id);

-- Question templates
CREATE TABLE IF NOT EXISTS question_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    structure JSONB NOT NULL,
    variables JSONB NOT NULL,
    prompt_template TEXT NOT NULL,
    subject VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_templates_type ON question_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_question_templates_subject ON question_templates(subject);

-- Question cache
CREATE TABLE IF NOT EXISTS question_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    question_data JSONB NOT NULL,
    hit_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_cache_key ON question_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_question_cache_expires ON question_cache(expires_at);

-- Template categories
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visual templates
CREATE TABLE IF NOT EXISTS visual_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type template_type DEFAULT 'SVG',
    svg_content TEXT,
    structure JSONB,
    canvas_config JSONB,
    parameters JSONB NOT NULL,
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_templates_category ON visual_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_visual_templates_type ON visual_templates(type);

-- Generated images
CREATE TABLE IF NOT EXISTS question_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES visual_templates(id) ON DELETE SET NULL,
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    generation_type generation_type NOT NULL,
    image_url TEXT NOT NULL,
    parameters JSONB,
    cost DECIMAL(10,4),
    cache_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_question ON question_generated_images(question_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_cache ON question_generated_images(cache_key);

-- Question sets
CREATE TABLE IF NOT EXISTS question_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    class_level VARCHAR(20),
    total_marks INTEGER,
    duration_minutes INTEGER,
    question_types JSONB,
    created_by UUID REFERENCES users(id),
    school_id UUID REFERENCES schools(id),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_sets_created_by ON question_sets(created_by);
CREATE INDEX IF NOT EXISTS idx_question_sets_school ON question_sets(school_id);

-- Question set items
CREATE TABLE IF NOT EXISTS question_set_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    marks INTEGER DEFAULT 1,
    section VARCHAR(50),
    UNIQUE(question_set_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_question_set_items_set ON question_set_items(question_set_id);
CREATE INDEX IF NOT EXISTS idx_question_set_items_question ON question_set_items(question_id);

COMMIT;
