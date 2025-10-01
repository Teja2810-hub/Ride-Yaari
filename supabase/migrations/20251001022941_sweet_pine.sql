/*
  # Fix Request Tables Public Access

  1. Security Changes
    - Add policies to allow public read access to ride_requests and trip_requests
    - Allow guests to view ride and trip requests
    - Maintain security for write operations

  2. Guest Access
    - Enable public SELECT access to ride_requests table
    - Enable public SELECT access to trip_requests table
    - Allow guests to browse available requests
*/

-- Add policy to allow public read access to ride_requests
CREATE POLICY "Allow public read access to ride requests"
  ON public.ride_requests FOR SELECT
  TO public
  USING (true);

-- Add policy to allow public read access to trip_requests
CREATE POLICY "Allow public read access to trip requests"
  ON public.trip_requests FOR SELECT
  TO public
  USING (true);