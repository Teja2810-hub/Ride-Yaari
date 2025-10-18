/*
  # Remove Duplicate Indexes

  ## Performance Improvements
  - Drop duplicate indexes that provide no additional value
  - Reduces storage overhead and write performance penalties
  - Keeps one index from each duplicate pair

  ## Changes
  1. **Ride Confirmations Table**
     - Drop idx_ride_confirmations_passenger (keep idx_ride_confirmations_passenger_id)
     - Drop idx_ride_confirmations_owner (keep idx_ride_confirmations_ride_owner_id)

  2. **User Blocks Table**
     - Drop idx_user_blocks_blocked (keep idx_user_blocks_blocked_id)
     - Drop idx_user_blocks_blocker (keep idx_user_blocks_blocker_id)

  ## Notes
  - No functionality changes
  - Query performance remains the same (one index per column is sufficient)
  - Improves write performance by reducing index maintenance overhead
*/

-- Drop duplicate indexes on ride_confirmations table
DROP INDEX IF EXISTS idx_ride_confirmations_passenger;
DROP INDEX IF EXISTS idx_ride_confirmations_owner;

-- Drop duplicate indexes on user_blocks table
DROP INDEX IF EXISTS idx_user_blocks_blocked;
DROP INDEX IF EXISTS idx_user_blocks_blocker;

-- Verify remaining indexes exist (these are the ones we're keeping)
-- If they don't exist, create them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'ride_confirmations'
        AND indexname = 'idx_ride_confirmations_passenger_id'
    ) THEN
        CREATE INDEX idx_ride_confirmations_passenger_id ON ride_confirmations(passenger_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'ride_confirmations'
        AND indexname = 'idx_ride_confirmations_ride_owner_id'
    ) THEN
        CREATE INDEX idx_ride_confirmations_ride_owner_id ON ride_confirmations(ride_owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_blocks'
        AND indexname = 'idx_user_blocks_blocked_id'
    ) THEN
        CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_blocks'
        AND indexname = 'idx_user_blocks_blocker_id'
    ) THEN
        CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
    END IF;
END $$;
