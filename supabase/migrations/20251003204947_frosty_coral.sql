/*
  # Fix created_at column error in user_profiles table

  1. Schema Fix
    - Add missing created_at column to user_profiles table
    - Ensure all required columns exist for proper functionality

  2. Compatibility
    - Safe migration that won't break existing data
    - Uses IF NOT EXISTS to prevent conflicts
*/

-- Add created_at column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing records to have created_at if they don't
UPDATE user_profiles 
SET created_at = now() 
WHERE created_at IS NULL;