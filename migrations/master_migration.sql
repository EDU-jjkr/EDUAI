-- ===============================================
-- MASTER MIGRATION SCRIPT - EDU Platform
-- ===============================================
-- This script consolidates ALL migrations with idempotent operations
-- Safe to run multiple times - will skip already applied changes
-- Includes: LMS features + AI/Content features
-- Date: 2026-01-24
-- ===============================================

BEGIN;

-- ===============================================
-- MIGRATION TRACKING TABLE
-- ===============================================
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
-- MIGRATION 2: Add Grade Levels and Subjects
-- Source: 002_add_grade_and_subjects.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_grade_and_subjects'
    ) THEN
        -- Add grade_level for students
        ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level VARCHAR(20);
        
        -- Add subjects_teaching for teachers
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subjects_teaching JSONB DEFAULT '[]'::jsonb;
        
        -- Add profile completion tracking
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
        
        -- Add student's grade level to doubts table
        ALTER TABLE doubts ADD COLUMN IF NOT EXISTS student_grade VARCHAR(20);
        
        -- Add AI confidence score
        ALTER TABLE doubts ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.85;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_grade_level 
        ON users(grade_level) 
        WHERE role = 'student';
        
        CREATE INDEX IF NOT EXISTS idx_doubts_student_grade 
        ON doubts(student_grade);
        
        CREATE INDEX IF NOT EXISTS idx_doubts_subject_grade 
        ON doubts(subject, student_grade);
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_grade_and_subjects', 'Added grade levels and subjects to users');
        
        RAISE NOTICE '✓ Migration 2: Added grade levels and subjects';
    ELSE
        RAISE NOTICE '⊘ Migration 2: Already applied (add_grade_and_subjects)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 3: Add Attendance System
-- Source: 003_add_attendance_system.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_attendance_system'
    ) THEN
        -- Add section field for students
        ALTER TABLE users ADD COLUMN IF NOT EXISTS section VARCHAR(1);
        
        -- Add class teacher assignment for teachers
        ALTER TABLE users ADD COLUMN IF NOT EXISTS class_teacher_of VARCHAR(20);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_section VARCHAR(1);
        
        -- Add check constraint for valid sections
        DO $section_check$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_section'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT check_valid_section 
                CHECK (section IS NULL OR section IN ('A', 'B', 'C', 'D'));
            END IF;
        END $section_check$;
        
        -- Update existing attendance table structure (drop and recreate)
        DROP TABLE IF EXISTS attendance CASCADE;
        
        CREATE TABLE attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            teacher_id UUID NOT NULL REFERENCES users(id),
            class VARCHAR(20) NOT NULL,
            section VARCHAR(1) NOT NULL,
            date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent')),
            marked_at TIMESTAMP DEFAULT NOW(),
            school_id UUID REFERENCES schools(id),
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_student_date UNIQUE(student_id, date)
        );
        
        -- Add indexes for attendance
        CREATE INDEX idx_attendance_date ON attendance(date);
        CREATE INDEX idx_attendance_class_section ON attendance(class, section, date);
        CREATE INDEX idx_attendance_teacher ON attendance(teacher_id, date);
        CREATE INDEX idx_attendance_student ON attendance(student_id, date);
        CREATE INDEX idx_attendance_school ON attendance(school_id, date);
        
        -- Create teacher_attendance table
        CREATE TABLE IF NOT EXISTS teacher_attendance (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent')),
            marked_at TIMESTAMP DEFAULT NOW(),
            marked_by UUID REFERENCES users(id),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_teacher_date UNIQUE(teacher_id, date)
        );
        
        -- Add indexes for teacher attendance
        CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
        CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id, date);
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_attendance_system', 'Added attendance system for students and teachers');
        
        RAISE NOTICE '✓ Migration 3: Added attendance system';
    ELSE
        RAISE NOTICE '⊘ Migration 3: Already applied (add_attendance_system)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 4: Add Homework, Exams, and Materials
-- Source: 003_add_homework_results_materials.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_homework_exams_materials'
    ) THEN
        -- Create homework table
        CREATE TABLE IF NOT EXISTS homework (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            description TEXT,
            class_name VARCHAR(50) NOT NULL,
            section VARCHAR(50),
            due_date DATE NOT NULL,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Indexes for homework
        CREATE INDEX IF NOT EXISTS idx_homework_class ON homework(class_name, section);
        CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);
        CREATE INDEX IF NOT EXISTS idx_homework_assigned_by ON homework(assigned_by);
        CREATE INDEX IF NOT EXISTS idx_homework_school ON homework(school_id);
        
        -- Create homework submissions table
        CREATE TABLE IF NOT EXISTS homework_submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
            student_id UUID REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late')),
            submitted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(homework_id, student_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_hw_submissions_student ON homework_submissions(student_id);
        
        -- Create exams table
        CREATE TABLE IF NOT EXISTS exams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            exam_type VARCHAR(100) NOT NULL CHECK (exam_type IN ('Unit Test', 'Mid-Term', 'Final Exam', 'Quiz', 'Practical')),
            class_name VARCHAR(50) NOT NULL,
            section VARCHAR(50),
            total_marks INTEGER NOT NULL,
            exam_date DATE,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_name, section);
        CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
        CREATE INDEX IF NOT EXISTS idx_exams_school ON exams(school_id);
        
        -- Create results table
        CREATE TABLE IF NOT EXISTS results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
            student_id UUID REFERENCES users(id) ON DELETE CASCADE,
            marks_obtained INTEGER NOT NULL,
            remarks TEXT,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(exam_id, student_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
        CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_id);
        
        -- Create study materials table
        CREATE TABLE IF NOT EXISTS study_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(500) NOT NULL,
            file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'doc', 'image', 'video', 'other')),
            subject VARCHAR(100) NOT NULL,
            file_url TEXT NOT NULL,
            file_size VARCHAR(50),
            class_name VARCHAR(50) NOT NULL,
            section VARCHAR(50),
            description TEXT,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_materials_class ON study_materials(class_name, section);
        CREATE INDEX IF NOT EXISTS idx_materials_subject ON study_materials(subject);
        CREATE INDEX IF NOT EXISTS idx_materials_school ON study_materials(school_id);
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_homework_exams_materials', 'Added homework, exams, results, and study materials');
        
        RAISE NOTICE '✓ Migration 4: Added homework, exams, and materials';
    ELSE
        RAISE NOTICE '⊘ Migration 4: Already applied (add_homework_exams_materials)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 5: Add Announcements and Notifications
-- Source: 004_add_announcements_notifications.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_announcements_notifications'
    ) THEN
        -- Create announcements table
        CREATE TABLE IF NOT EXISTS announcements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('all', 'students', 'teachers', 'class_specific')),
            class_name VARCHAR(50),
            section VARCHAR(50),
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            is_active BOOLEAN DEFAULT true,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
        CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_audience);
        CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, expires_at);
        
        -- Create notifications table
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            message TEXT,
            notification_type VARCHAR(50) DEFAULT 'announcement' CHECK (notification_type IN ('announcement', 'homework', 'result', 'general')),
            reference_id UUID,
            reference_type VARCHAR(50),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_announcements_notifications', 'Added announcements and notifications system');
        
        RAISE NOTICE '✓ Migration 5: Added announcements and notifications';
    ELSE
        RAISE NOTICE '⊘ Migration 5: Already applied (add_announcements_notifications)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 6: Add Class Teacher Assignment
-- Source: 005_add_class_teacher_assignment.sql
-- ===============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM migration_history WHERE migration_name = 'add_class_teacher_assignment'
    ) THEN
        -- Add class_teacher_id to classes table
        DO $class_teacher$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'classes' AND column_name = 'class_teacher_id'
            ) THEN
                ALTER TABLE classes ADD COLUMN class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
            END IF;
        END $class_teacher$;
        
        -- Add index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);
        
        -- Add assigned_class_id to users table
        DO $assigned_class$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'assigned_class_id'
            ) THEN
                ALTER TABLE users ADD COLUMN assigned_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
            END IF;
        END $assigned_class$;
        
        CREATE INDEX IF NOT EXISTS idx_users_assigned_class ON users(assigned_class_id);
        
        -- Record migration
        INSERT INTO migration_history (migration_name, description) 
        VALUES ('add_class_teacher_assignment', 'Added class teacher assignment to classes and users');
        
        RAISE NOTICE '✓ Migration 6: Added class teacher assignment';
    ELSE
        RAISE NOTICE '⊘ Migration 6: Already applied (add_class_teacher_assignment)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 7: Password Reset Fields
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
        
        RAISE NOTICE '✓ Migration 7: Added password reset fields';
    ELSE
        RAISE NOTICE '⊘ Migration 7: Already applied (add_password_reset_fields)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 8: Phase 1 Lesson Schema
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
        
        RAISE NOTICE '✓ Migration 8: Added lesson schema';
    ELSE
        RAISE NOTICE '⊘ Migration 8: Already applied (phase1_lesson_schema)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 9: Visual Metadata to Slides
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
        
        RAISE NOTICE '✓ Migration 9: Added visual metadata';
    ELSE
        RAISE NOTICE '⊘ Migration 9: Already applied (add_visual_metadata_to_slides)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 10: Topic Generator Tables
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
        
        RAISE NOTICE '✓ Migration 10: Added topic generator tables';
    ELSE
        RAISE NOTICE '⊘ Migration 10: Already applied (add_topic_generator)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 11: Source Tracking
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
        
        RAISE NOTICE '✓ Migration 11: Added source tracking';
    ELSE
        RAISE NOTICE '⊘ Migration 11: Already applied (add_source_tracking)';
    END IF;
END $$;

-- ===============================================
-- MIGRATION 12: Question Generator Tables
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
        
        RAISE NOTICE '✓ Migration 12: Added question generator tables';
    ELSE
        RAISE NOTICE '⊘ Migration 12: Already applied (add_question_generator_tables)';
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
