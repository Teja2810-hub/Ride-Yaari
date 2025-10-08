/*
  # Fix missing seats_requested column in ride_confirmations table

  1. Schema Fix
    - Add seats_requested column to ride_confirmations table if it doesn't exist
    - Set appropriate constraints and default values
    - Update existing records to have valid seats_requested values

  2. Data Integrity
    - Ensure all car ride confirmations have seats_requested >= 1
    - Trip confirmations can have NULL seats_requested (no seat management)
*/

-- Add seats_requested column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'seats_requested'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN seats_requested integer;
  END IF;
END $$;

-- Update existing records to have valid seats_requested values
-- For car ride confirmations, set default to 1 if NULL
-- For trip confirmations, leave as NULL (no seat management)
UPDATE ride_confirmations 
SET seats_requested = 1 
WHERE ride_id IS NOT NULL AND seats_requested IS NULL;

-- Add constraint to ensure seats_requested is valid for car rides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ride_confirmations' AND constraint_name = 'check_seats_requested_car_rides'
  ) THEN
    ALTER TABLE ride_confirmations 
    ADD CONSTRAINT check_seats_requested_car_rides 
    CHECK (
      (ride_id IS NOT NULL AND seats_requested IS NOT NULL AND seats_requested >= 1) OR
      (trip_id IS NOT NULL AND seats_requested IS NULL)
    );
  END IF;
END $$;

-- Ensure the seat management trigger function exists and works correctly
CREATE OR REPLACE FUNCTION update_seats_available()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Only process car ride confirmations
    IF NEW.ride_id IS NOT NULL THEN
      -- Update seats_available based on accepted confirmations
      UPDATE car_rides 
      SET seats_available = total_seats - COALESCE((
        SELECT SUM(seats_requested) 
        FROM ride_confirmations 
        WHERE ride_id = NEW.ride_id 
        AND status = 'accepted'
      ), 0)
      WHERE id = NEW.ride_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Only process car ride confirmations
    IF OLD.ride_id IS NOT NULL THEN
      -- Update seats_available based on accepted confirmations
      UPDATE car_rides 
      SET seats_available = total_seats - COALESCE((
        SELECT SUM(seats_requested) 
        FROM ride_confirmations 
        WHERE ride_id = OLD.ride_id 
        AND status = 'accepted'
      ), 0)
      WHERE id = OLD.ride_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS trigger_update_seats_available ON ride_confirmations;
CREATE TRIGGER trigger_update_seats_available
  AFTER INSERT OR UPDATE OR DELETE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_available();

-- Recalculate seats_available for all car rides to ensure consistency
UPDATE car_rides 
SET seats_available = total_seats - COALESCE((
  SELECT SUM(seats_requested) 
  FROM ride_confirmations 
  WHERE ride_id = car_rides.id 
  AND status = 'accepted'
), 0);