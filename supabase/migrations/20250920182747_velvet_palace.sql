/*
  # Profile Editing Features

  1. New Tables
    - Add profile image upload support
    - Add password change tracking
    - Add email change verification

  2. Security
    - Enable RLS on all new features
    - Add policies for profile updates
    - Add email verification for email changes

  3. Changes
    - Add profile_image_url to user_profiles if not exists
    - Add email_change_verification table for email updates
    - Add password_change_log for security tracking
*/

-- Add profile_image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_image_url text;
  END IF;
END $$;

-- Create email change verification table
CREATE TABLE IF NOT EXISTS email_change_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  old_email text NOT NULL,
  new_email text NOT NULL,
  verification_token text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create password change log table for security tracking
CREATE TABLE IF NOT EXISTS password_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  changed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_change_verification_user_id ON email_change_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_verification_token ON email_change_verification(verification_token);
CREATE INDEX IF NOT EXISTS idx_password_change_log_user_id ON password_change_log(user_id);

-- Enable RLS
ALTER TABLE email_change_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_change_log ENABLE ROW LEVEL SECURITY;

-- Policies for email_change_verification
CREATE POLICY "Users can view own email change requests"
  ON email_change_verification FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create email change requests"
  ON email_change_verification FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email change requests"
  ON email_change_verification FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for password_change_log
CREATE POLICY "Users can view own password change log"
  ON password_change_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert password change log"
  ON password_change_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp for email verification
CREATE OR REPLACE FUNCTION update_email_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for email verification updates
CREATE TRIGGER update_email_verification_updated_at
BEFORE UPDATE ON email_change_verification
FOR EACH ROW
EXECUTE FUNCTION update_email_verification_updated_at();

-- Update user_profiles policies to allow profile updates
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);