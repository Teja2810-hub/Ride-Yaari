/*
  # Ride Request and Notification System

  1. New Tables
    - `ride_requests` - Store passenger ride requests with location and timing preferences
    - `ride_notifications` - Store notification preferences for both passengers and drivers
    - `notification_matches` - Track which notifications have been sent to avoid duplicates

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own requests and notifications

  3. Features
    - Support for departure/destination location with radius
    - Date-specific or month-based ride requests
    - Notification preferences for drivers and passengers
    - Auto-expiry for time-based notifications
*/

-- Create ride_requests table for passenger requests
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  departure_location text NOT NULL,
  departure_latitude numeric,
  departure_longitude numeric,
  destination_location text NOT NULL,
  destination_latitude numeric,
  destination_longitude numeric,
  search_radius_miles integer DEFAULT 25, -- Search radius in miles
  request_type text NOT NULL CHECK (request_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  request_month text, -- Format: YYYY-MM
  departure_time_preference text, -- Optional preferred time
  max_price numeric,
  currency text DEFAULT 'USD',
  additional_notes text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ride_notifications table for notification preferences
CREATE TABLE IF NOT EXISTS public.ride_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('passenger_request', 'driver_post')),
  departure_location text NOT NULL,
  departure_latitude numeric,
  departure_longitude numeric,
  destination_location text NOT NULL,
  destination_latitude numeric,
  destination_longitude numeric,
  search_radius_miles integer DEFAULT 25,
  date_type text NOT NULL CHECK (date_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  notification_month text, -- Format: YYYY-MM
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_matches table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.ride_notifications(id) ON DELETE CASCADE NOT NULL,
  matched_item_id uuid NOT NULL, -- Can be ride_id or ride_request_id
  matched_item_type text NOT NULL CHECK (matched_item_type IN ('ride_post', 'ride_request')),
  notified_user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger_id ON public.ride_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_location ON public.ride_requests(departure_latitude, departure_longitude, destination_latitude, destination_longitude);
CREATE INDEX IF NOT EXISTS idx_ride_requests_date ON public.ride_requests(specific_date);
CREATE INDEX IF NOT EXISTS idx_ride_requests_month ON public.ride_requests(request_month);
CREATE INDEX IF NOT EXISTS idx_ride_requests_active ON public.ride_requests(is_active);

CREATE INDEX IF NOT EXISTS idx_ride_notifications_user_id ON public.ride_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_notifications_location ON public.ride_notifications(departure_latitude, departure_longitude, destination_latitude, destination_longitude);
CREATE INDEX IF NOT EXISTS idx_ride_notifications_date ON public.ride_notifications(specific_date);
CREATE INDEX IF NOT EXISTS idx_ride_notifications_month ON public.ride_notifications(notification_month);
CREATE INDEX IF NOT EXISTS idx_ride_notifications_active ON public.ride_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_matches_notification_id ON public.notification_matches(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_matches_matched_item ON public.notification_matches(matched_item_id, matched_item_type);
CREATE INDEX IF NOT EXISTS idx_notification_matches_user_id ON public.notification_matches(notified_user_id);

-- Enable Row Level Security
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_matches ENABLE ROW LEVEL SECURITY;

-- Policies for ride_requests
CREATE POLICY "Users can view all ride requests"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own ride requests"
  ON public.ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own ride requests"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Users can delete their own ride requests"
  ON public.ride_requests FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());

-- Policies for ride_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.ride_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own notifications"
  ON public.ride_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.ride_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.ride_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for notification_matches
CREATE POLICY "Users can view notification matches for their notifications"
  ON public.notification_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ride_notifications 
      WHERE id = notification_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create notification matches"
  ON public.notification_matches FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow system to create matches

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ride_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_ride_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_ride_requests_updated_at
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION update_ride_requests_updated_at();

CREATE TRIGGER update_ride_notifications_updated_at
BEFORE UPDATE ON public.ride_notifications
FOR EACH ROW
EXECUTE FUNCTION update_ride_notifications_updated_at();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  R numeric := 3959; -- Earth's radius in miles
  dLat numeric;
  dLon numeric;
  a numeric;
  c numeric;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Function to find matching drivers for a ride request
CREATE OR REPLACE FUNCTION find_matching_drivers(
  p_departure_lat numeric,
  p_departure_lon numeric,
  p_destination_lat numeric,
  p_destination_lon numeric,
  p_search_radius numeric,
  p_request_date date DEFAULT NULL,
  p_request_month text DEFAULT NULL
)
RETURNS TABLE(
  ride_id uuid,
  driver_id uuid,
  departure_distance numeric,
  destination_distance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as ride_id,
    cr.user_id as driver_id,
    calculate_distance_miles(p_departure_lat, p_departure_lon, cr.from_latitude, cr.from_longitude) as departure_distance,
    calculate_distance_miles(p_destination_lat, p_destination_lon, cr.to_latitude, cr.to_longitude) as destination_distance
  FROM car_rides cr
  WHERE 
    cr.is_closed = false
    AND cr.departure_date_time > now()
    AND cr.from_latitude IS NOT NULL
    AND cr.from_longitude IS NOT NULL
    AND cr.to_latitude IS NOT NULL
    AND cr.to_longitude IS NOT NULL
    AND calculate_distance_miles(p_departure_lat, p_departure_lon, cr.from_latitude, cr.from_longitude) <= p_search_radius
    AND calculate_distance_miles(p_destination_lat, p_destination_lon, cr.to_latitude, cr.to_longitude) <= p_search_radius
    AND (
      p_request_date IS NULL 
      OR DATE(cr.departure_date_time) = p_request_date
      OR (
        p_request_month IS NOT NULL 
        AND TO_CHAR(cr.departure_date_time, 'YYYY-MM') = p_request_month
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire old ride requests and notifications
CREATE OR REPLACE FUNCTION cleanup_expired_ride_requests()
RETURNS void AS $$
BEGIN
  -- Expire ride requests
  UPDATE public.ride_requests 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
  
  -- Expire notifications
  UPDATE public.ride_notifications 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;