/*
  # User Blocking and Trip/Ride Closure System

  1. New Tables
    - `user_blocks` - Track blocked users
    - `chat_deletions` - Track deleted chats per user
    - Add closure functionality to trips and car_rides

  2. Security
    - Enable RLS on all new tables
    - Add policies for user privacy and data access

  3. Changes
    - Add `is_closed` and `closed_at` columns to trips and car_rides
    - Add `closed_reason` for tracking why trips/rides were closed
    - Create comprehensive blocking system
*/

-- Add closure columns to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_closed'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_closed boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN closed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'closed_reason'
  ) THEN
    ALTER TABLE trips ADD COLUMN closed_reason text;
  END IF;
END $$;

-- Add closure columns to car_rides table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'car_rides' AND column_name = 'is_closed'
  ) THEN
    ALTER TABLE car_rides ADD COLUMN is_closed boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'car_rides' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE car_rides ADD COLUMN closed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'car_rides' AND column_name = 'closed_reason'
  ) THEN
    ALTER TABLE car_rides ADD COLUMN closed_reason text;
  END IF;
END $$;

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure users can't block themselves and prevent duplicate blocks
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Create chat_deletions table
CREATE TABLE IF NOT EXISTS chat_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  other_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  deleted_at timestamptz DEFAULT now(),
  
  -- Ensure unique deletion per user pair
  CONSTRAINT unique_chat_deletion UNIQUE (user_id, other_user_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_chat_deletions_user_id ON chat_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_deletions_other_user_id ON chat_deletions(other_user_id);
CREATE INDEX IF NOT EXISTS idx_trips_is_closed ON trips(is_closed);
CREATE INDEX IF NOT EXISTS idx_car_rides_is_closed ON car_rides(is_closed);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_deletions ENABLE ROW LEVEL SECURITY;

-- Policies for user_blocks
CREATE POLICY "Users can view blocks they created"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can view blocks against them"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocked_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Policies for chat_deletions
CREATE POLICY "Users can view their own chat deletions"
  ON chat_deletions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create chat deletions"
  ON chat_deletions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat deletions"
  ON chat_deletions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_user_id uuid, blocked_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if chat is deleted for a user
CREATE OR REPLACE FUNCTION is_chat_deleted(user_id uuid, other_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_deletions 
    WHERE user_id = user_id 
    AND other_user_id = other_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update chat_messages policies to respect blocking
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;

CREATE POLICY "Users can view their own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND NOT is_user_blocked(receiver_id, sender_id)
    AND NOT is_user_blocked(sender_id, receiver_id)
    AND NOT is_chat_deleted(auth.uid(), CASE WHEN sender_id = auth.uid() THEN receiver_id ELSE sender_id END)
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
    AND NOT is_user_blocked(receiver_id, sender_id)
    AND NOT is_user_blocked(sender_id, receiver_id)
  );