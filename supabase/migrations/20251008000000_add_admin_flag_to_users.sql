/*
  # Add Admin Flag to User Profiles

  1. Changes
    - Add `is_admin` boolean column to `user_profiles` table
    - Set default value to false for security
    - Update specific user (a8f9e474-fd2f-467f-9880-76e701b833e8) to be admin
    - Create index on is_admin column for query performance

  2. Security
    - All users can view the is_admin flag (needed for UI conditionals)
    - Only the user themselves can update their profile (existing policy)
    - This prevents privilege escalation while allowing UI to check admin status
*/

-- Add is_admin column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index on is_admin column for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;

-- Set the specific user as admin
UPDATE user_profiles
SET is_admin = true
WHERE id = 'a8f9e474-fd2f-467f-9880-76e701b833e8';

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.is_admin IS 'Flag to identify admin users who have access to system health dashboard and admin features';
