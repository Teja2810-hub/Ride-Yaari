/*
  # Add status column to reviews table and update RLS policies

  1. Schema Changes
    - Add `status` column to `reviews` table with default value 'pending'
    - Update existing reviews to have 'approved' status for backward compatibility

  2. Security Changes
    - Drop existing public read policy for reviews
    - Create new policy that only allows reading approved reviews
    - Add policy for authenticated users to update review status (for admin approval)

  3. Data Migration
    - Set all existing reviews to 'approved' status so they remain visible
*/

-- Add status column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Update existing reviews to be approved (backward compatibility)
UPDATE public.reviews 
SET status = 'approved' 
WHERE status = 'pending';

-- Drop old RLS policy
DROP POLICY IF EXISTS "Allow public read access to reviews" ON public.reviews;

-- Create new RLS policy for approved reviews only
CREATE POLICY "Allow public read access to approved reviews"
ON public.reviews FOR SELECT
TO public
USING (status = 'approved');

-- Add policy for authenticated users to update review status (for admin approval)
CREATE POLICY "Allow authenticated users to update review status"
ON public.reviews FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);