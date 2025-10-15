/*
  # Add Persistent Notifications Table

  1. New Tables
    - `user_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `notification_type` (text - confirmation_request, confirmation_update, ride_match, trip_match, ride_request_alert, trip_request_alert)
      - `title` (text)
      - `message` (text)
      - `priority` (text - high, medium, low)
      - `is_read` (boolean)
      - `action_data` (jsonb - stores relevant IDs and metadata)
      - `related_user_id` (uuid - ID of the user this notification is about)
      - `related_user_name` (text - name of the related user)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `user_notifications` table
    - Add policy for users to read their own notifications
    - Add policy for users to update their own notifications (mark as read)
    - Add policy for users to delete their own notifications
    
  3. Indexes
    - Index on user_id and is_read for fast queries
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  is_read boolean NOT NULL DEFAULT false,
  action_data jsonb,
  related_user_id uuid,
  related_user_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
      ON user_notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON user_notifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications"
      ON user_notifications
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read 
  ON user_notifications(user_id, is_read);
  
CREATE INDEX IF NOT EXISTS idx_user_notifications_created 
  ON user_notifications(created_at DESC);
