-- ===============================================
-- MASTER MIGRATION SCRIPT - EDU Backend
-- ===============================================
-- This script consolidates all migrations with idempotent operations
-- Safe to run multiple times - will skip already applied changes
-- Date: 2026-01-14
-- ===============================================

BEGIN;

-- ===============================================
-- MIGRATION TRACKING TABLE
-- ===============================================
-- Create a table to track which migrations have been applied
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- ===============================================
-- MIGRATION 1: Update Role Constraint
-- Source: update_role_constraint.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'update_role_constraint'
    ) THEN
        -- Drop the existing check constraint if it exists
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        
        -- Add the updated check constraint with staff role
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('student', 'teacher', 'admin', 'staff'));
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('update_role_constraint', 'Added staff role to users table');
        
        RAISE NOTICE '✓ Migration 1: Updated role constraint';
    ELSE
        RAISE NOTICE '⊘ Migration 1: Already applied (update_role_constraint)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 2: Password Reset Fields
-- Source: add_password_reset_fields.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_password_reset_fields'
    ) THEN
        -- Add password reset token field
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
        
        -- Add password reset token expiry timestamp
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
        
        -- Add department field for staff users
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
        
        -- Add index on reset_token for faster lookups
        CREATE INDEX IF NOT EXISTS idx_users_reset_token 
        ON users(reset_token) 
        WHERE reset_token IS NOT NULL;
        
        -- Add index on reset_token_expires for cleanup queries
        CREATE INDEX IF NOT EXISTS idx_users_reset_token_expires 
        ON users(reset_token_expires) 
        WHERE reset_token_expires IS NOT NULL;
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_password_reset_fields', 'Added password reset and department fields');
        
        RAISE NOTICE '✓ Migration 2: Added password reset fields';
    ELSE
        RAISE NOTICE '⊘ Migration 2: Already applied (add_password_reset_fields)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 3: Phase 1 Lesson Schema
-- Source: phase1_lesson_schema.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'phase1_lesson_schema'
    ) THEN
        -- Add new columns to decks table for lesson metadata
        ALTER TABLE decks ADD COLUMN IF NOT EXISTS meta JSONB;
        ALTER TABLE decks ADD COLUMN IF NOT EXISTS structure JSONB;
        
        -- Add new columns to slides table
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS slide_type VARCHAR(50);
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(20);
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS speaker_notes TEXT;
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS image_query TEXT;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_slides_bloom_level ON slides(bloom_level);
        CREATE INDEX IF NOT EXISTS idx_slides_type ON slides(slide_type);
        
        -- Drop and recreate view to avoid conflicts
        DROP VIEW IF EXISTS lesson_decks_view CASCADE;
        CREATE VIEW lesson_decks_view AS
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
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('phase1_lesson_schema', 'Added lesson metadata and Bloom taxonomy support');
        
        RAISE NOTICE '✓ Migration 3: Added lesson schema';
    ELSE
        RAISE NOTICE '⊘ Migration 3: Already applied (phase1_lesson_schema)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 4: Visual Metadata to Slides
-- Source: add_visual_metadata_to_slides.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_visual_metadata_to_slides'
    ) THEN
        -- Add visual-related columns to slides table
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS visual_type VARCHAR(50);
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS visual_config JSONB;
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS visual_confidence NUMERIC(5,2);
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS generated_by VARCHAR(50);
        
        -- Create index on visual_type for filtering
        CREATE INDEX IF NOT EXISTS idx_slides_visual_type ON slides(visual_type);
        
        -- Drop and recreate view to avoid column conflicts
        DROP VIEW IF EXISTS slides_with_visuals CASCADE;
        CREATE VIEW slides_with_visuals AS
        SELECT 
            s.*,
            d.title as deck_title,
            d.subject,
            d.grade_level
        FROM slides s
        JOIN decks d ON s.deck_id = d.id
        WHERE s.visual_type IS NOT NULL AND s.visual_type != 'none';
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_visual_metadata_to_slides', 'Added visual metadata columns to slides');
        
        RAISE NOTICE '✓ Migration 4: Added visual metadata';
    ELSE
        RAISE NOTICE '⊘ Migration 4: Already applied (add_visual_metadata_to_slides)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 5: Topic Generator Tables
-- Source: add_topic_generator.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_topic_generator'
    ) THEN
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
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_topic_generator', 'Added topic generator tables');
        
        RAISE NOTICE '✓ Migration 5: Added topic generator tables';
    ELSE
        RAISE NOTICE '⊘ Migration 5: Already applied (add_topic_generator)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 6: Source Tracking
-- Source: add_source_tracking.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_source_tracking'
    ) THEN
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
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_source_tracking', 'Added source tracking for better caching');
        
        RAISE NOTICE '✓ Migration 6: Added source tracking';
    ELSE
        RAISE NOTICE '⊘ Migration 6: Already applied (add_source_tracking)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 7: Question Generator Tables
-- Source: add_question_generator_tables.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_question_generator_tables'
    ) THEN
        -- Create ENUM types
        DO $enum_block$ BEGIN
            CREATE TYPE template_type AS ENUM ('SVG', 'CANVAS', 'HYBRID', 'MERMAID', 'LAYOUT', 'SYLLABUS');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $enum_block$;
        
        DO $enum_block$ BEGIN
            CREATE TYPE generation_type AS ENUM ('TEMPLATE', 'AI_GENERATED', 'HYBRID');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $enum_block$;
        
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
            school_id UUID,
            class_level VARCHAR(20),
            board VARCHAR(50),
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
            school_id UUID,
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
        
        -- Create update trigger function if not exists
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ language 'plpgsql';
        
        -- Apply triggers
        DO $trigger_block$ BEGIN
            CREATE TRIGGER update_generated_questions_updated_at
                BEFORE UPDATE ON generated_questions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $trigger_block$;
        
        DO $trigger_block$ BEGIN
            CREATE TRIGGER update_question_templates_updated_at
                BEFORE UPDATE ON question_templates
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $trigger_block$;
        
        DO $trigger_block$ BEGIN
            CREATE TRIGGER update_visual_templates_updated_at
                BEFORE UPDATE ON visual_templates
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $trigger_block$;
        
        DO $trigger_block$ BEGIN
            CREATE TRIGGER update_question_sets_updated_at
                BEFORE UPDATE ON question_sets
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $trigger_block$;
        
        -- Seed data
        INSERT INTO template_categories (name, description) VALUES
            ('mathematics', 'Mathematical diagrams, graphs, and geometric figures'),
            ('physics', 'Physics diagrams, circuits, and force diagrams'),
            ('chemistry', 'Chemical structures, molecular diagrams, and periodic table'),
            ('biology', 'Biological diagrams, cell structures, and anatomy')
        ON CONFLICT (name) DO NOTHING;
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_question_generator_tables', 'Added question generator tables and schemas');
        
        RAISE NOTICE '✓ Migration 7: Added question generator tables';
    ELSE
        RAISE NOTICE '⊘ Migration 7: Already applied (add_question_generator_tables)';
    END IF;
END $$;

-- ===============================================
-- COMMIT TRANSACTION
-- ===============================================

COMMIT;

-- ===============================================
-- VERIFICATION QUERY
-- ===============================================

-- Show all applied migrations
SELECT 
    migration_name, 
    applied_at, 
    description 
FROM migration_history 
ORDER BY applied_at;

-- Summary
SELECT 
    COUNT(*) as total_migrations_applied,
    MIN(applied_at) as first_migration,
    MAX(applied_at) as last_migration
FROM migration_history;
