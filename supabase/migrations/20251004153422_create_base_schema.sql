/*
  # Create Base Schema with Seat Management

  1. New Tables
    - `user_profiles` - Store user profile information
    - `car_rides` - Store car ride posts with seat management
    - `trips` - Store airport trip posts
    - `ride_confirmations` - Track passenger confirmations with seat requests
    - `chat_messages` - Store chat messages between users
    - `user_blocks` - Track blocked users

  2. Seat Management Features
    - `total_seats` in car_rides - Initial seat capacity
    - `seats_available` in car_rides - Remaining available seats
    - `seats_requested` in ride_confirmations - Seats requested by passenger
    - Automatic seat decrement on acceptance
    - Automatic seat restoration on cancellation

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict data access based on ownership

  4. Constraints
    - seats_available never exceeds total_seats
    - seats_available never goes negative
    - seats_requested must be at least 1
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  bio text,
  profile_image_url text,
  phone_number text,
  whatsapp_number text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create car_rides table with seat management
CREATE TABLE IF NOT EXISTS car_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  departure_date_time timestamptz NOT NULL,
  price numeric,
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  notes text,
  total_seats integer DEFAULT 4 CHECK (total_seats >= 1 AND total_seats <= 8),
  seats_available integer DEFAULT 4 CHECK (seats_available >= 0),
  from_latitude numeric,
  from_longitude numeric,
  to_latitude numeric,
  to_longitude numeric,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT car_rides_seats_available_lte_total_seats CHECK (seats_available <= total_seats)
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  leaving_airport text NOT NULL,
  destination_airport text NOT NULL,
  travel_date date NOT NULL,
  departure_time text,
  departure_timezone text,
  landing_date date,
  landing_time text,
  landing_timezone text,
  price numeric,
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  notes text,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ride_confirmations table with seat requests
CREATE TABLE IF NOT EXISTS ride_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES car_rides(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ride_owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  passenger_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  seats_requested integer DEFAULT 1 CHECK (seats_requested >= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_passenger_per_ride UNIQUE (ride_id, passenger_id),
  CONSTRAINT unique_passenger_per_trip UNIQUE (trip_id, passenger_id),
  CONSTRAINT ride_or_trip_check CHECK (
    (ride_id IS NOT NULL AND trip_id IS NULL) OR 
    (ride_id IS NULL AND trip_id IS NOT NULL)
  )
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_car_rides_user_id ON car_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_car_rides_departure_date ON car_rides(departure_date_time);
CREATE INDEX IF NOT EXISTS idx_car_rides_seats_available ON car_rides(seats_available);
CREATE INDEX IF NOT EXISTS idx_car_rides_is_closed ON car_rides(is_closed);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_travel_date ON trips(travel_date);
CREATE INDEX IF NOT EXISTS idx_trips_is_closed ON trips(is_closed);

CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_id ON ride_confirmations(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_trip_id ON ride_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_owner_id ON ride_confirmations(ride_owner_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_passenger_id ON ride_confirmations(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_status ON ride_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_passenger_status ON ride_confirmations(ride_id, passenger_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for car_rides
CREATE POLICY "Users can view all car rides"
  ON car_rides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create car rides"
  ON car_rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own car rides"
  ON car_rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own car rides"
  ON car_rides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for trips
CREATE POLICY "Users can view all trips"
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for ride_confirmations
CREATE POLICY "Ride owners can view their confirmations"
  ON ride_confirmations FOR SELECT
  TO authenticated
  USING (ride_owner_id = auth.uid());

CREATE POLICY "Passengers can view their confirmations"
  ON ride_confirmations FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Users can create ride confirmations"
  ON ride_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Ride owners can update confirmation status"
  ON ride_confirmations FOR UPDATE
  TO authenticated
  USING (ride_owner_id = auth.uid());

CREATE POLICY "Users can delete pending confirmations"
  ON ride_confirmations FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid() AND status = 'pending');

-- Policies for chat_messages
CREATE POLICY "Users can view their messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid());

-- Policies for user_blocks
CREATE POLICY "Users can view blocks they created"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Function to validate seat availability before accepting request
CREATE OR REPLACE FUNCTION validate_seat_availability()
RETURNS TRIGGER AS $$
DECLARE
  available_seats integer;
  requested_seats integer;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.ride_id IS NOT NULL THEN
    SELECT seats_available INTO available_seats
    FROM car_rides
    WHERE id = NEW.ride_id
    FOR UPDATE;
    
    requested_seats := COALESCE(NEW.seats_requested, 1);
    
    IF available_seats < requested_seats THEN
      RAISE EXCEPTION 'Insufficient seats available. Available: %, Requested: %', available_seats, requested_seats;
    END IF;
    
    UPDATE car_rides
    SET seats_available = seats_available - requested_seats
    WHERE id = NEW.ride_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to restore seats when confirmation is cancelled
CREATE OR REPLACE FUNCTION restore_seats_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  requested_seats integer;
BEGIN
  IF OLD.ride_id IS NOT NULL THEN
    IF (TG_OP = 'DELETE' AND OLD.status = 'accepted') OR 
       (TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted') THEN
      
      requested_seats := COALESCE(OLD.seats_requested, 1);
      
      UPDATE car_rides
      SET seats_available = seats_available + requested_seats
      WHERE id = OLD.ride_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for ride_confirmations
CREATE OR REPLACE FUNCTION update_ride_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
        NEW.confirmed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for car_rides
CREATE OR REPLACE FUNCTION update_car_rides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for trips
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_validate_seat_availability
  BEFORE UPDATE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION validate_seat_availability();

CREATE TRIGGER trigger_restore_seats_on_cancellation
  BEFORE UPDATE OR DELETE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION restore_seats_on_cancellation();

CREATE TRIGGER update_ride_confirmations_updated_at
  BEFORE UPDATE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_confirmations_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

CREATE TRIGGER update_car_rides_updated_at
  BEFORE UPDATE ON car_rides
  FOR EACH ROW
  EXECUTE FUNCTION update_car_rides_updated_at();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();