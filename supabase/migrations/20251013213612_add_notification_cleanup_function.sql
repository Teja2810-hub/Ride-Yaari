/*
  # Add Automatic Notification Cleanup

  1. Function
    - Creates a function to keep only the latest 200 notifications per user
    - Automatically deletes older notifications beyond the 200 limit
    
  2. Trigger
    - Trigger runs after each insert on user_notifications
    - Cleans up old notifications for the affected user
*/

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE id IN (
    SELECT id
    FROM user_notifications
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 200
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_notifications ON user_notifications;
CREATE TRIGGER trigger_cleanup_notifications
  AFTER INSERT ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_notifications();