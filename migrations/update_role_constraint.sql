-- Migration: Update role check constraint to include staff role
-- Date: 2025-11-28
-- Description: Adds 'staff' as a valid role in the users table

-- Drop the existing check constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the updated check constraint with staff role
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'teacher', 'admin', 'staff'));
