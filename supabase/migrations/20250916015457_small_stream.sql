/*
  # Add timezone columns to trips table

  1. Changes
    - Add `departure_timezone` column to `trips` table (text, nullable)
    - Add `landing_timezone` column to `trips` table (text, nullable)

  2. Purpose
    - Support storing timezone information for departure and landing times
    - Allow users to specify exact timing with proper timezone context
    - Maintain backward compatibility with existing trip records
*/

-- Add timezone columns to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'departure_timezone'
  ) THEN
    ALTER TABLE trips ADD COLUMN departure_timezone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'landing_timezone'
  ) THEN
    ALTER TABLE trips ADD COLUMN landing_timezone text;
  END IF;
END $$;