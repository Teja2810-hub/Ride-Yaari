/*
  # Create User Notifications Table

  1. New Tables
    - `user_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `notification_type` (text)
      - `title` (text)
      - `message` (text)
      - `priority` (text - high, medium, low)
      - `is_read` (boolean)
      - `action_data` (jsonb)
      - `related_user_id` (uuid)
      - `related_user_name` (text)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `user_notifications` table
    - Add policies for reading, updating, deleting, and inserting
    
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

DROP POLICY IF EXISTS "Users can read own notifications" ON user_notifications;
CREATE POLICY "Users can read own notifications"
  ON user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
CREATE POLICY "Users can delete own notifications"
  ON user_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow inserting notifications for users" ON user_notifications;
CREATE POLICY "Allow inserting notifications for users"
  ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read 
  ON user_notifications(user_id, is_read);
  
CREATE INDEX IF NOT EXISTS idx_user_notifications_created 
  ON user_notifications(created_at DESC);