/*
  # Fix Profile Images Storage Policy

  1. Storage Policy Update
    - Update the INSERT policy to properly handle user ownership
    - Ensure authenticated users can only upload images they own

  2. Security
    - Add proper ownership check for uploads
    - Maintain existing read/update/delete policies
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;

-- Create updated policy with proper ownership check
CREATE POLICY "Users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND owner = auth.uid()
  );