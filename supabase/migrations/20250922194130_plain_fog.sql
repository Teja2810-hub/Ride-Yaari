/*
  # Fix Guest Access to Rides and Trips

  1. Security Changes
    - Add policies to allow public (guest) read access to trips and car_rides
    - Allow guests to view ride/trip data without authentication
    - Maintain security for write operations (still require authentication)

  2. Guest Access
    - Enable public SELECT access to trips table
    - Enable public SELECT access to car_rides table
    - Allow guests to browse available rides and trips
*/

-- Add policy to allow public read access to trips
CREATE POLICY "Allow public read access to trips"
  ON trips FOR SELECT
  TO public
  USING (true);

-- Add policy to allow public read access to car_rides
CREATE POLICY "Allow public read access to car_rides"
  ON car_rides FOR SELECT
  TO public
  USING (true);

-- Add policy to allow public read access to user_profiles (for displaying names in rides/trips)
CREATE POLICY "Allow public read access to user profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);