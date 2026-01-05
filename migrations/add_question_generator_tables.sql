-- Migration: Add Question Generator Tables to EDU Main Database
-- Date: 2026-01-04
-- Description: Migrates core question generator tables from TOOL backend to main EDU database
-- NOTE: Excludes auth tables (UserAccount, ApiKey, TokenBlacklist, UsageTracking, AnalyticsEvent, ExportHistory, FeedbackData)

-- ============================================
-- ENUM TYPES
-- ============================================

-- Template type enum
DO $$ BEGIN
    CREATE TYPE template_type AS ENUM ('SVG', 'CANVAS', 'HYBRID', 'MERMAID', 'LAYOUT', 'SYLLABUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Generation type enum
DO $$ BEGIN
    CREATE TYPE generation_type AS ENUM ('TEMPLATE', 'AI_GENERATED', 'HYBRID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CORE QUESTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(100) NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,  -- 'easy', 'medium', 'hard'
    type VARCHAR(100) NOT NULL,       -- 'multiple-choice', 'short-answer', 'true-false', etc.
    content TEXT NOT NULL,            -- The question text
    answer TEXT NOT NULL,             -- Correct answer
    explanation TEXT,                 -- Explanation of answer
    options JSONB,                    -- For MCQ: ["A) ...", "B) ...", ...]
    metadata JSONB,                   -- Additional metadata (difficulty_score, concepts, etc.)
    
    -- EDU integration fields
    created_by UUID REFERENCES users(id),
    school_id UUID,
    class_level VARCHAR(20),          -- 'class 8', 'class 9', etc.
    board VARCHAR(50),                -- 'icse', 'cbse', 'state'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_questions_subject ON generated_questions(subject);
CREATE INDEX IF NOT EXISTS idx_generated_questions_chapter ON generated_questions(chapter);
CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty ON generated_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_generated_questions_type ON generated_questions(type);
CREATE INDEX IF NOT EXISTS idx_generated_questions_created_by ON generated_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_questions_school ON generated_questions(school_id);

-- ============================================
-- QUESTION QUALITY METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS question_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    grammar_score DECIMAL(3,2),       -- 0.00 - 1.00
    relevance_score DECIMAL(3,2),     -- 0.00 - 1.00
    difficulty_score DECIMAL(3,2),    -- 0.00 - 1.00
    clarity_score DECIMAL(3,2),       -- 0.00 - 1.00
    pedagogical_value DECIMAL(3,2),   -- 0.00 - 1.00
    user_ratings JSONB,               -- Array of user ratings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_question ON question_quality_metrics(question_id);

-- ============================================
-- QUESTION TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS question_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    structure JSONB NOT NULL,         -- Template structure
    variables JSONB NOT NULL,         -- Customizable variables
    prompt_template TEXT NOT NULL,    -- AI prompt template
    subject VARCHAR(100),             -- Optional: subject-specific template
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_templates_type ON question_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_question_templates_subject ON question_templates(subject);

-- ============================================
-- QUESTION CACHE (for performance)
-- ============================================

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

-- ============================================
-- TEMPLATE CATEGORIES (for visual templates)
-- ============================================

CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,  -- 'mathematics', 'physics', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VISUAL TEMPLATES (SVG/Canvas templates)
-- ============================================

CREATE TABLE IF NOT EXISTS visual_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type template_type DEFAULT 'SVG',
    svg_content TEXT,                  -- Base SVG template
    structure JSONB,                   -- JSON structure for layouts
    canvas_config JSONB,               -- Canvas drawing configuration
    parameters JSONB NOT NULL,         -- Customizable parameters schema
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_templates_category ON visual_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_visual_templates_type ON visual_templates(type);

-- ============================================
-- GENERATED IMAGES (for questions with visuals)
-- ============================================

CREATE TABLE IF NOT EXISTS question_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES visual_templates(id) ON DELETE SET NULL,
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    generation_type generation_type NOT NULL,
    image_url TEXT NOT NULL,
    parameters JSONB,                  -- Parameters used for generation
    cost DECIMAL(10,4),                -- Cost for AI generation
    cache_key VARCHAR(255),            -- For caching optimization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_question ON question_generated_images(question_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_cache ON question_generated_images(cache_key);

-- ============================================
-- QUESTION SETS (for grouping questions)
-- ============================================

CREATE TABLE IF NOT EXISTS question_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    class_level VARCHAR(20),
    total_marks INTEGER,
    duration_minutes INTEGER,
    
    -- Question type distribution
    question_types JSONB,              -- {"multiple-choice": 5, "short-answer": 3, ...}
    
    created_by UUID REFERENCES users(id),
    school_id UUID,
    is_published BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_sets_created_by ON question_sets(created_by);
CREATE INDEX IF NOT EXISTS idx_question_sets_school ON question_sets(school_id);

-- ============================================
-- QUESTION SET ITEMS (linking questions to sets)
-- ============================================

CREATE TABLE IF NOT EXISTS question_set_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES generated_questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    marks INTEGER DEFAULT 1,
    section VARCHAR(50),               -- 'Section A', 'Section B', etc.
    
    UNIQUE(question_set_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_question_set_items_set ON question_set_items(question_set_id);
CREATE INDEX IF NOT EXISTS idx_question_set_items_question ON question_set_items(question_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$ BEGIN
    CREATE TRIGGER update_generated_questions_updated_at
        BEFORE UPDATE ON generated_questions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_question_templates_updated_at
        BEFORE UPDATE ON question_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_visual_templates_updated_at
        BEFORE UPDATE ON visual_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_question_sets_updated_at
        BEFORE UPDATE ON question_sets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SEED DATA: Default Template Categories
-- ============================================

INSERT INTO template_categories (name, description) VALUES
    ('mathematics', 'Mathematical diagrams, graphs, and geometric figures'),
    ('physics', 'Physics diagrams, circuits, and force diagrams'),
    ('chemistry', 'Chemical structures, molecular diagrams, and periodic table'),
    ('biology', 'Biological diagrams, cell structures, and anatomy')
ON CONFLICT (name) DO NOTHING;
