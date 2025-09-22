/*
  # Fix user profiles RLS policy

  1. Security Changes
    - Add policy to allow authenticated users to insert their own profile
    - Ensures users can create profiles with their own auth.uid()

  This migration fixes the RLS violation error when creating new user profiles.
*/

-- Policy: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());