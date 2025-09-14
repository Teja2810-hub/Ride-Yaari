/*
  # Ride Confirmation System

  1. New Tables
    - `ride_confirmations` - Track accepted/rejected passengers for rides
    - Update existing tables to support the confirmation system

  2. Security
    - Enable RLS on new tables
    - Add policies for ride owners and passengers

  3. Features
    - Track confirmation status (pending, accepted, rejected)
    - Link confirmations to both car rides and airport trips
    - Store confirmation timestamps
*/

-- Create ride_confirmations table
CREATE TABLE IF NOT EXISTS ride_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES car_rides(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ride_owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  passenger_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure only one confirmation per passenger per ride/trip
  CONSTRAINT unique_passenger_per_ride UNIQUE (ride_id, passenger_id),
  CONSTRAINT unique_passenger_per_trip UNIQUE (trip_id, passenger_id),
  
  -- Ensure either ride_id or trip_id is set, but not both
  CONSTRAINT ride_or_trip_check CHECK (
    (ride_id IS NOT NULL AND trip_id IS NULL) OR 
    (ride_id IS NULL AND trip_id IS NOT NULL)
  )
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_id ON ride_confirmations(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_trip_id ON ride_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_owner_id ON ride_confirmations(ride_owner_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_passenger_id ON ride_confirmations(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_status ON ride_confirmations(status);

-- Enable Row Level Security
ALTER TABLE ride_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Ride owners can view confirmations for their rides/trips
CREATE POLICY "Ride owners can view their confirmations"
  ON ride_confirmations FOR SELECT
  TO authenticated
  USING (ride_owner_id = auth.uid());

-- Policy: Passengers can view their own confirmations
CREATE POLICY "Passengers can view their confirmations"
  ON ride_confirmations FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

-- Policy: Authenticated users can create confirmations (when requesting rides)
CREATE POLICY "Users can create ride confirmations"
  ON ride_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

-- Policy: Ride owners can update confirmation status
CREATE POLICY "Ride owners can update confirmation status"
  ON ride_confirmations FOR UPDATE
  TO authenticated
  USING (ride_owner_id = auth.uid());

-- Policy: Users can delete their own pending confirmations
CREATE POLICY "Users can delete pending confirmations"
  ON ride_confirmations FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid() AND status = 'pending');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ride_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
        NEW.confirmed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update timestamps
CREATE TRIGGER update_ride_confirmations_updated_at
BEFORE UPDATE ON ride_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_ride_confirmations_updated_at();

-- Add system message type to chat_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system'));
  END IF;
END $$;

-- Add is_read column to chat_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;