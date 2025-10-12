/*
  # Recreate Database Schema

  1. Tables
    - user_profiles
    - trips
    - car_rides
    - ride_confirmations
    - chat_messages

  2. Security
    - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  age integer,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
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
  }'::jsonb
);

CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leaving_airport text NOT NULL,
  destination_airport text NOT NULL,
  travel_date date NOT NULL,
  departure_time text,
  departure_timezone text,
  landing_date date,
  landing_time text,
  landing_timezone text,
  price decimal(10,2),
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_reason text,
  is_trip_request boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS car_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  from_latitude decimal(10,8),
  from_longitude decimal(11,8),
  to_location text NOT NULL,
  to_latitude decimal(10,8),
  to_longitude decimal(11,8),
  departure_date_time timestamptz NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  negotiable boolean DEFAULT false,
  intermediate_stops jsonb DEFAULT '[]'::jsonb,
  total_seats integer NOT NULL DEFAULT 4,
  seats_available integer NOT NULL DEFAULT 4,
  is_closed boolean DEFAULT false,
  closed_at timestamptz,
  closed_reason text,
  is_ride_request boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_seats CHECK (seats_available >= 0 AND seats_available <= total_seats)
);

CREATE TABLE IF NOT EXISTS ride_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES car_rides(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ride_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  seats_requested integer DEFAULT 1,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ride_or_trip_required CHECK (
    (ride_id IS NOT NULL AND trip_id IS NULL) OR 
    (ride_id IS NULL AND trip_id IS NOT NULL)
  ),
  CONSTRAINT valid_seats_requested CHECK (seats_requested > 0)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_content text NOT NULL,
  is_read boolean DEFAULT false,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can read trips" ON trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own trips" ON trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read rides" ON car_rides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own rides" ON car_rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rides" ON car_rides FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rides" ON car_rides FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read own confirmations" ON ride_confirmations FOR SELECT TO authenticated 
  USING (auth.uid() = ride_owner_id OR auth.uid() = passenger_id);
CREATE POLICY "Users can insert confirmations" ON ride_confirmations FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Owners can update confirmations" ON ride_confirmations FOR UPDATE TO authenticated 
  USING (auth.uid() = ride_owner_id OR auth.uid() = passenger_id);

CREATE POLICY "Users can read own messages" ON chat_messages FOR SELECT TO authenticated 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own received messages" ON chat_messages FOR UPDATE TO authenticated 
  USING (auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_travel_date ON trips(travel_date);
CREATE INDEX IF NOT EXISTS idx_trips_airports ON trips(leaving_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_trips_is_closed ON trips(is_closed) WHERE is_closed = false;

CREATE INDEX IF NOT EXISTS idx_car_rides_user_id ON car_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_car_rides_departure ON car_rides(departure_date_time);
CREATE INDEX IF NOT EXISTS idx_car_rides_location ON car_rides(from_latitude, from_longitude, to_latitude, to_longitude);
CREATE INDEX IF NOT EXISTS idx_car_rides_is_closed ON car_rides(is_closed) WHERE is_closed = false;
CREATE INDEX IF NOT EXISTS idx_car_rides_seats_available ON car_rides(seats_available) WHERE seats_available > 0;

CREATE INDEX IF NOT EXISTS idx_ride_confirmations_ride_id ON ride_confirmations(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_trip_id ON ride_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_owner ON ride_confirmations(ride_owner_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_passenger ON ride_confirmations(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_status ON ride_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE OR REPLACE FUNCTION update_seats_available()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.ride_id IS NOT NULL THEN
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

  IF TG_OP = 'DELETE' THEN
    IF OLD.ride_id IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trigger_update_seats_available ON ride_confirmations;
CREATE TRIGGER trigger_update_seats_available
  AFTER INSERT OR UPDATE OR DELETE ON ride_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_available();