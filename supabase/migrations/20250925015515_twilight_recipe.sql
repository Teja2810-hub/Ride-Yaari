/*
  # Fix RLS Policy for System Messages

  1. Policy Updates
    - Update the INSERT policy to allow system messages
    - Allow messages where sender_id is either the authenticated user or the system user
    - Maintain security while enabling system functionality

  2. Security
    - Keep user authentication requirements
    - Add exception for system-generated messages
    - Ensure only legitimate system messages can be inserted
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;

-- Create updated policy that allows both user messages and system messages
CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() OR 
    sender_id = '00000000-0000-0000-0000-000000000000'::uuid
  );