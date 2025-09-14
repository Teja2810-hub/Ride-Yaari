/*
  # Add negotiable column to car_rides table

  1. New Columns
    - `negotiable` (boolean, default false) - Whether the price is negotiable

  2. Changes
    - Add negotiable option for flexible pricing on car rides
*/

-- Add negotiable column to car_rides table
ALTER TABLE car_rides 
ADD COLUMN IF NOT EXISTS negotiable boolean DEFAULT false;