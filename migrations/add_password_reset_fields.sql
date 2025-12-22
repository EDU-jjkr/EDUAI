-- Migration: Add password reset and department fields to users table
-- Date: 2025-11-27
-- Description: Adds fields needed for password reset functionality and staff department

-- Add password reset token field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);

-- Add password reset token expiry timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Add department field for staff users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Add index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token 
ON users(reset_token) 
WHERE reset_token IS NOT NULL;

-- Add index on reset_token_expires for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expires 
ON users(reset_token_expires) 
WHERE reset_token_expires IS NOT NULL;
