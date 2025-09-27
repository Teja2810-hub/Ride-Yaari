/*
  # Fix Profile Images Public Access

  1. Storage Policies Fix
    - Ensure profile images are publicly accessible
    - Fix RLS policies for proper image loading

  2. Security
    - Maintain proper access controls while allowing public read
    - Keep upload/update/delete restricted to authenticated users
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

-- Ensure the profile-images bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-images');

-- Policy: Allow public read access to profile images (this is the key fix)
CREATE POLICY "Profile images are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-images');

-- Policy: Allow users to update their own profile images
CREATE POLICY "Users can update own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to delete their own profile images
CREATE POLICY "Users can delete own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);