/*
  # Fix Storage Policies Syntax

  1. Storage Bucket Setup
    - Create profile-images bucket if not exists
    - Set up proper storage policies with correct PostgreSQL syntax

  2. Security
    - Users can upload images to their own profile folder
    - Public read access for profile images
    - Users can update/delete their own images

  3. Changes
    - Use proper DROP/CREATE syntax instead of IF NOT EXISTS for policies
    - Ensure policies are created correctly without syntax errors
*/

-- Create the profile-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

-- Policy: Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow public read access to profile images
CREATE POLICY "Profile images are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-images');

-- Policy: Allow users to update their own profile images
CREATE POLICY "Users can update own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow users to delete their own profile images
CREATE POLICY "Users can delete own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );