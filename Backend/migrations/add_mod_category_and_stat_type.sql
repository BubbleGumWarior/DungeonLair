-- Migration to add modCategory and statType columns to mod_list table
ALTER TABLE mod_list 
ADD COLUMN "modCategory" VARCHAR(50),
ADD COLUMN "statType" VARCHAR(50);

-- Set default values for existing records
UPDATE mod_list SET "modCategory" = 'skill' WHERE "modCategory" IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN mod_list."modCategory" IS 'Category of the mod: skill or stat';
COMMENT ON COLUMN mod_list."statType" IS 'Type of stat for stat mods: health, armor, attack, speed, mana';
