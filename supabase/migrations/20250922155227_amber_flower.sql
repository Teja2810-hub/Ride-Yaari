/*
  # Fix Chat Deletion System - Per User Deletion

  1. New Tables
    - `user_chat_deletions` - Track which users have deleted specific chats
    - This allows per-user chat deletion without affecting the other user

  2. Security
    - Enable RLS on user_chat_deletions table
    - Add policies for users to manage their own chat deletions
    - Update chat_messages policies to respect per-user deletions

  3. Changes
    - Replace the existing chat_deletions table approach
    - Implement proper per-user chat deletion
    - Update RLS policies to hide deleted chats per user
*/

-- Create user_chat_deletions table for per-user chat deletion
CREATE TABLE IF NOT EXISTS user_chat_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  other_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  deleted_at timestamptz DEFAULT now(),
  
  -- Ensure unique deletion record per user pair
  CONSTRAINT unique_user_chat_deletion UNIQUE (user_id, other_user_id),
  -- Prevent self-deletion records
  CONSTRAINT no_self_chat_deletion CHECK (user_id != other_user_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_chat_deletions_user_id ON user_chat_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_deletions_other_user_id ON user_chat_deletions(other_user_id);

-- Enable RLS
ALTER TABLE user_chat_deletions ENABLE ROW LEVEL SECURITY;

-- Policies for user_chat_deletions
CREATE POLICY "Users can view their own chat deletions"
  ON user_chat_deletions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own chat deletions"
  ON user_chat_deletions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat deletion records"
  ON user_chat_deletions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to check if a user has deleted a specific chat
CREATE OR REPLACE FUNCTION has_user_deleted_chat(p_user_id uuid, p_other_user_id uuid)
RETURNS boolean AS $$
DECLARE
  deletion_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_chat_deletions 
    WHERE user_id = p_user_id 
    AND other_user_id = p_other_user_id
  ) INTO deletion_exists;
  
  RETURN COALESCE(deletion_exists, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update chat_messages policies to respect per-user deletions
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON chat_messages;

CREATE POLICY "Users can view messages they sent or received"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND NOT has_user_deleted_chat(
      auth.uid(),
      CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END
    )
  );

-- Add policy for users to delete messages (soft delete by adding deletion record)
CREATE POLICY "Users can mark chats as deleted"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (false); -- Prevent actual deletion, use soft delete instead