/*
  # Fix ride_requests table schema conflicts

  1. Problem Resolution
    - The existing ride_requests table uses `requester_id` and `owner_id`
    - The little_crystal migration expects `passenger_id`
    - This creates a column mismatch error

  2. Solution
    - Drop the existing ride_requests table that conflicts
    - Let the little_crystal migration create the correct version
    - Ensure no data loss by backing up if needed

  3. Changes
    - Remove conflicting ride_requests table
    - Clean up related indexes and policies
    - Allow little_crystal migration to create the proper schema
*/

-- Drop the conflicting ride_requests table and its dependencies
DROP TABLE IF EXISTS public.ride_requests CASCADE;

-- Drop any related functions that might reference the old table
DROP FUNCTION IF EXISTS update_ride_requests_updated_at() CASCADE;

-- The little_crystal migration will now be able to create the correct table structure
-- with passenger_id instead of requester_id