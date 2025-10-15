/*
  # Add Automatic Notification Cleanup

  1. Function
    - Creates a function to keep only the latest 200 notifications per user
    - Automatically deletes older notifications beyond the 200 limit
    - Runs for all users

  2. Scheduled Job
    - Runs daily at 23:59 UTC via pg_cron extension
    - Cleans up old notifications for all users
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id, user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM user_notifications
    ) sub
    WHERE rn > 200
  );
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
  'cleanup-notifications-daily',
  '59 23 * * *',
  'SELECT cleanup_old_notifications();'
);