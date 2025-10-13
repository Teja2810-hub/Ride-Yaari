/*
  # Cleanup Old System Messages

  1. Function
    - `cleanup_old_system_messages()`: Deletes old system messages, keeping only the latest 20 per unique chat
    - Identifies unique chats using LEAST/GREATEST on sender_id and receiver_id
    - Preserves most recent 20 system messages per chat pair
  
  2. Extension
    - Enables pg_cron extension for scheduled jobs
  
  3. Scheduled Job
    - Runs daily at 2:00 AM UTC
    - Automatically cleans up system messages to prevent database bloat
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup old system messages
CREATE OR REPLACE FUNCTION cleanup_old_system_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_messages
  WHERE id IN (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY 
            LEAST(sender_id, receiver_id),
            GREATEST(sender_id, receiver_id)
          ORDER BY created_at DESC
        ) as rn
      FROM chat_messages
      WHERE message_type = 'system'
    ) ranked
    WHERE rn > 20
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cleanup to run daily at 2:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-system-messages',
  '0 2 * * *',
  $$SELECT cleanup_old_system_messages()$$
);
