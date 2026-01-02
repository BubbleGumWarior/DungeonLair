-- Add name column to masks_list table
ALTER TABLE masks_list ADD COLUMN IF NOT EXISTS name TEXT;
