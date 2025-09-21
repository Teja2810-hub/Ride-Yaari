/*
  # Fix Chat RLS Policies and Functions - Dependency Resolution

  1. Function Updates
    - Properly drop dependent policies before dropping functions
    - Update `is_user_blocked` function with distinct parameter names
    - Update `is_chat_deleted` function with distinct parameter names
    - Recreate policies with fixed function calls

  2. Security
    - Fix RLS policies for chat_messages to use updated function signatures
    - Ensure blocking and chat deletion logic works correctly
    - Maintain security while fixing ambiguous references
*/

-- First, drop all dependent policies
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;

-- Now we can safely drop the functions
DROP FUNCTION IF EXISTS is_user_blocked(uuid, uuid);
DROP FUNCTION IF EXISTS is_chat_deleted(uuid, uuid);

-- Recreate is_user_blocked function with distinct parameter names
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_user_id uuid, p_blocked_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = p_blocker_user_id 
    AND blocked_id = p_blocked_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate is_chat_deleted function with distinct parameter names
CREATE OR REPLACE FUNCTION is_chat_deleted(p_user_id uuid, p_other_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_deletions 
    WHERE user_id = p_user_id 
    AND other_user_id = p_other_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate chat_messages policies with fixed function calls
CREATE POLICY "Users can view their own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND NOT is_user_blocked(
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END,
      auth.uid()
    )
    AND NOT is_user_blocked(
      auth.uid(),
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END
    )
    AND NOT is_chat_deleted(
      auth.uid(),
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT is_user_blocked(receiver_id, sender_id)
    AND NOT is_user_blocked(sender_id, receiver_id)
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND NOT is_user_blocked(
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END,
      auth.uid()
    )
    AND NOT is_user_blocked(
      auth.uid(),
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END
    )
  );