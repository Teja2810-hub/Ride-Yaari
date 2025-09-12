/*
  # Add intermediate stops support to car rides

  1. New Columns
    - `intermediate_stops` (jsonb, default: '[]')
      - Stores array of intermediate stop objects with address, latitude, longitude

  2. Changes
    - Add intermediate_stops column to car_rides table
    - Set default value to empty array for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'car_rides' AND column_name = 'intermediate_stops'
  ) THEN
    ALTER TABLE car_rides ADD COLUMN intermediate_stops jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;