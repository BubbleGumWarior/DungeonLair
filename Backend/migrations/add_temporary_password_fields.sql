-- Migration: Add temporary password fields to users table
-- Run this script in pgAdmin or psql command line
-- Date: 2025-07-29

BEGIN;

-- Add new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "isTemporaryPassword" BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "temporaryPasswordExpires" TIMESTAMP WITH TIME ZONE;

-- Set default values for existing records
UPDATE users 
SET "isTemporaryPassword" = false 
WHERE "isTemporaryPassword" IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('isTemporaryPassword', 'temporaryPasswordExpires');

COMMIT;
