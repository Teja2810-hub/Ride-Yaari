/*
  # Create User Notifications with Auto-Cleanup

  1. New Tables
    - `user_notifications` - Stores user notification messages
      
  2. Security
    - Enable RLS
    - Policies for CRUD operations
    
  3. Auto-Cleanup
    - Trigger function that runs on insert
    - Keeps only latest 200 notifications per user
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

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION trigger_cleanup_old_notifications()
RETURNS trigger AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM user_notifications
      WHERE user_id = NEW.user_id
    ) sub
    WHERE rn > 200
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_notifications_trigger ON user_notifications;

CREATE TRIGGER cleanup_notifications_trigger
AFTER INSERT ON user_notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_cleanup_old_notifications();
