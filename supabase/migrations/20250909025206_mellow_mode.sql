/*
  # Add geolocation columns to car_rides table

  1. New Columns
    - `from_latitude` (numeric) - Latitude of departure location
    - `from_longitude` (numeric) - Longitude of departure location  
    - `to_latitude` (numeric) - Latitude of destination location
    - `to_longitude` (numeric) - Longitude of destination location

  2. Changes
    - Add geolocation support for accurate radius-based searches
    - Enable distance calculations between locations
*/

-- Add geolocation columns to car_rides table
ALTER TABLE car_rides 
ADD COLUMN IF NOT EXISTS from_latitude numeric(10,8),
ADD COLUMN IF NOT EXISTS from_longitude numeric(11,8),
ADD COLUMN IF NOT EXISTS to_latitude numeric(10,8),
ADD COLUMN IF NOT EXISTS to_longitude numeric(11,8);