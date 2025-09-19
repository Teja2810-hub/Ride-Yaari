/*
  # Add notification preferences to user profiles

  1. Changes
    - Add `notification_preferences` JSONB column to `user_profiles` table
    - Add `email_notifications` boolean column for backward compatibility
    - Set default notification preferences for existing users

  2. Security
    - Users can only update their own notification preferences
    - Add policy for notification preferences updates
*/

-- Add notification preferences column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
      "email_notifications": true,
      "browser_notifications": true,
      "ride_requests": true,
      "ride_confirmations": true,
      "messages": true,
      "system_updates": true,
      "marketing_emails": false,
      "sound_enabled": true
    }'::jsonb;
  END IF;
END $$;

-- Add email_notifications column for backward compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_notifications boolean DEFAULT true;
  END IF;
END $$;

-- Update existing users with default notification preferences
UPDATE user_profiles 
SET notification_preferences = '{
  "email_notifications": true,
  "browser_notifications": true,
  "ride_requests": true,
  "ride_confirmations": true,
  "messages": true,
  "system_updates": true,
  "marketing_emails": false,
  "sound_enabled": true
}'::jsonb
WHERE notification_preferences IS NULL;

-- Update email_notifications column based on notification_preferences
UPDATE user_profiles 
SET email_notifications = (notification_preferences->>'email_notifications')::boolean
WHERE email_notifications IS NULL;

-- Add policy for users to update their own notification preferences
CREATE POLICY "Users can update own notification preferences"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);