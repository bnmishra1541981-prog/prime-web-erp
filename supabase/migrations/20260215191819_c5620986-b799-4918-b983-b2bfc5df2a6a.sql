
-- Drop the generated columns and recreate as regular columns
ALTER TABLE sawmill_logs DROP COLUMN cft;
ALTER TABLE sawmill_logs DROP COLUMN girth_inch;

-- Add them back as regular columns
ALTER TABLE sawmill_logs ADD COLUMN girth_inch numeric;
ALTER TABLE sawmill_logs ADD COLUMN cft numeric;

-- Populate existing data with the formula
UPDATE sawmill_logs 
SET girth_inch = girth_cm / 2.54,
    cft = POWER(girth_cm / 2.54, 2) * length_meter * 2.2072 / 10000;
