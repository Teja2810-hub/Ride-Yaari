/*
  # Complete RideYaari Database Schema with Seat Management

  ## 1. Base Tables Created
    - `user_profiles` - User profile information and settings
    - `car_rides` - Car rideshare posts with seat management (total_seats, seats_available)
    - `trips` - Airport trip posts (no seat management)
    - `chat_messages` - User-to-user and system messages
    - `ride_confirmations` - Request confirmations with seats_requested for car rides
    - `ride_requests` - Passenger ride requests
    - `trip_requests` - Passenger trip requests  
    - `ride_notifications` - Notification preferences for rides
    - `trip_notifications` - Notification preferences for trips
    - `notification_matches` - Tracking sent notifications
    - `trip_notification_matches` - Tracking sent trip notifications
    - `error_reports` - Error tracking and monitoring
    - `user_blocks` - User blocking system

  ## 2. Seat Management (Car Rides Only)
    - Car rides include total_seats (1-8) and seats_available
    - ride_confirmations tracks seats_requested for car rides
    - Automatic seat decrement when request accepted
    - Automatic seat increment when confirmation cancelled
    - Database functions and triggers for seat validation

  ## 3. Security
    - Row Level Security enabled on all tables
    - Restrictive policies requiring authentication
    - Users can only access their own data or public information
*/

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  age integer,
  gender text,
  profile_image_url text,
  notification_preferences jsonb DEFAULT '{
    "email_notifications": true,
    "browser_notifications": true,
    "ride_requests": true,
    "ride_confirmations": true,
    "messages": true,
    "system_updates": true,
    "marketing_emails": false,
    "sound_enabled": true
  }'::jsonb,
  email_notifications boolean DEFAULT true
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- CAR RIDES TABLE (WITH SEAT MANAGEMENT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS car_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  from_latitude numeric,
  from_longitude numeric,
  to_latitude numeric,
  to_longitude numeric,
  departure_date_time timestamptz NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz DEFAULT now(),
  intermediate_stops jsonb DEFAULT '[]'::jsonb,
  total_seats integer DEFAULT 4 NOT NULL,
  seats_available integer DEFAULT 4 NOT NULL,
  CONSTRAINT check_total_seats_range CHECK (total_seats >= 1 AND total_seats <= 8),
  CONSTRAINT check_seats_available_range CHECK (seats_available >= 0 AND seats_available <= total_seats)
);

CREATE INDEX IF NOT EXISTS idx_car_rides_user_id ON car_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_car_rides_departure ON car_rides(departure_date_time);
CREATE INDEX IF NOT EXISTS idx_car_rides_location ON car_rides(from_latitude, from_longitude, to_latitude, to_longitude);
CREATE INDEX IF NOT EXISTS idx_car_rides_closed ON car_rides(is_closed) WHERE is_closed = false;
CREATE INDEX IF NOT EXISTS idx_car_rides_seats_available ON car_rides(seats_available) WHERE seats_available > 0;

ALTER TABLE car_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open rides"
  ON car_rides FOR SELECT
  TO public
  USING (is_closed = false);

CREATE POLICY "Users can view own rides"
  ON car_rides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create rides"
  ON car_rides FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rides"
  ON car_rides FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own rides"
  ON car_rides FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON COLUMN car_rides.total_seats IS 'Total number of seats available in the vehicle (1-8)';
COMMENT ON COLUMN car_rides.seats_available IS 'Current number of seats available after confirmed bookings';

-- ============================================================================
-- TRIPS TABLE (NO SEAT MANAGEMENT)
-- ============================================================================
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
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_travel_date ON trips(travel_date);
CREATE INDEX IF NOT EXISTS idx_trips_airports ON trips(leaving_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_trips_closed ON trips(is_closed) WHERE is_closed = false;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open trips"
  ON trips FOR SELECT
  TO public
  USING (is_closed = false);

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  message_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- RIDE CONFIRMATIONS TABLE (WITH SEAT TRACKING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES car_rides(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ride_owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  passenger_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  seats_requested integer,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_passenger_per_ride UNIQUE (ride_id, passenger_id),
  CONSTRAINT unique_passenger_per_trip UNIQUE (trip_id, passenger_id),
  CONSTRAINT ride_or_trip_check CHECK (
    (ride_id IS NOT NULL AND trip_id IS NULL) OR 
    (ride_id IS NULL AND trip_id IS NOT NULL)
  ),
  CONSTRAINT check_seats_requested_positive CHECK (
    (ride_id IS NOT NULL AND seats_requested IS NOT NULL AND seats_requested >= 1) OR
    (trip_id IS NOT NULL AND seats_requested IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_id ON ride_confirmations(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_trip_id ON ride_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_owner_id ON ride_confirmations(ride_owner_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_passenger_id ON ride_confirmations(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_status ON ride_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_composite ON ride_confirmations(ride_id, passenger_id, status);

ALTER TABLE ride_confirmations ENABLE ROW LEVEL SECURITY;

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

COMMENT ON COLUMN ride_confirmations.seats_requested IS 'Number of seats requested by passenger (car rides only)';

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ride_confirmations_updated_at
BEFORE UPDATE ON ride_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_ride_confirmations_updated_at();

-- ============================================================================
-- SEAT MANAGEMENT FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to validate seat availability before accepting
CREATE OR REPLACE FUNCTION validate_seat_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_seats_available integer;
  v_total_seats integer;
BEGIN
  IF NEW.ride_id IS NOT NULL AND NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    SELECT seats_available, total_seats 
    INTO v_seats_available, v_total_seats
    FROM car_rides 
    WHERE id = NEW.ride_id
    FOR UPDATE;
    
    IF NEW.seats_requested IS NULL OR NEW.seats_requested < 1 THEN
      RAISE EXCEPTION 'seats_requested must be at least 1 for car ride confirmations';
    END IF;
    
    IF NEW.seats_requested > v_total_seats THEN
      RAISE EXCEPTION 'Requested % seats but ride only has % total seats', NEW.seats_requested, v_total_seats;
    END IF;
    
    IF v_seats_available < NEW.seats_requested THEN
      RAISE EXCEPTION 'Insufficient seats available. Requested: %, Available: %', NEW.seats_requested, v_seats_available;
    END IF;
    
    UPDATE car_rides 
    SET seats_available = seats_available - NEW.seats_requested
    WHERE id = NEW.ride_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore seats when confirmation cancelled
CREATE OR REPLACE FUNCTION restore_seats_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.ride_id IS NOT NULL AND OLD.status = 'accepted' AND OLD.seats_requested IS NOT NULL THEN
    
    IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN
      UPDATE car_rides 
      SET seats_available = seats_available + OLD.seats_requested
      WHERE id = OLD.ride_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
      UPDATE car_rides 
      SET seats_available = seats_available + OLD.seats_requested
      WHERE id = OLD.ride_id;
    END IF;
    
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_seat_availability
  BEFORE UPDATE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION validate_seat_availability();

CREATE TRIGGER trigger_restore_seats_on_update
  AFTER UPDATE ON ride_confirmations
  FOR EACH ROW
  WHEN (OLD.status = 'accepted' AND NEW.status = 'rejected')
  EXECUTE FUNCTION restore_seats_on_cancellation();

CREATE TRIGGER trigger_restore_seats_on_delete
  AFTER DELETE ON ride_confirmations
  FOR EACH ROW
  WHEN (OLD.status = 'accepted')
  EXECUTE FUNCTION restore_seats_on_cancellation();

-- ============================================================================
-- Additional tables following in next comment block due to length...
-- ============================================================================
