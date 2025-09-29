/*
  # Trip Request and Notification System

  1. New Tables
    - `trip_requests` - Store passenger trip requests with airport and timing preferences
    - `trip_notifications` - Store notification preferences for trip alerts
    - `trip_notification_matches` - Track which notifications have been sent

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own requests and notifications

  3. Features
    - Support for departure/destination airports
    - Date-specific, multiple dates, or month-based trip requests
    - Notification preferences for travelers
    - Auto-expiry for time-based notifications
*/

-- Create trip_requests table for passenger requests
CREATE TABLE IF NOT EXISTS public.trip_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  departure_airport text NOT NULL,
  destination_airport text NOT NULL,
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

-- Create trip_notifications table for notification preferences
CREATE TABLE IF NOT EXISTS public.trip_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('passenger_request', 'traveler_post')),
  departure_airport text NOT NULL,
  destination_airport text NOT NULL,
  date_type text NOT NULL CHECK (date_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  notification_month text, -- Format: YYYY-MM
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trip_notification_matches table to track sent notifications
CREATE TABLE IF NOT EXISTS public.trip_notification_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.trip_notifications(id) ON DELETE CASCADE NOT NULL,
  matched_item_id uuid NOT NULL, -- Can be trip_id or trip_request_id
  matched_item_type text NOT NULL CHECK (matched_item_type IN ('trip_post', 'trip_request')),
  notified_user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trip_requests_passenger_id ON public.trip_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_airports ON public.trip_requests(departure_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_trip_requests_date ON public.trip_requests(specific_date);
CREATE INDEX IF NOT EXISTS idx_trip_requests_month ON public.trip_requests(request_month);
CREATE INDEX IF NOT EXISTS idx_trip_requests_active ON public.trip_requests(is_active);

CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON public.trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_airports ON public.trip_notifications(departure_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_date ON public.trip_notifications(specific_date);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_month ON public.trip_notifications(notification_month);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_active ON public.trip_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_trip_notification_matches_notification_id ON public.trip_notification_matches(notification_id);
CREATE INDEX IF NOT EXISTS idx_trip_notification_matches_matched_item ON public.trip_notification_matches(matched_item_id, matched_item_type);
CREATE INDEX IF NOT EXISTS idx_trip_notification_matches_user_id ON public.trip_notification_matches(notified_user_id);

-- Enable Row Level Security
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_notification_matches ENABLE ROW LEVEL SECURITY;

-- Policies for trip_requests
CREATE POLICY "Users can view all trip requests"
  ON public.trip_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own trip requests"
  ON public.trip_requests FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own trip requests"
  ON public.trip_requests FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Users can delete their own trip requests"
  ON public.trip_requests FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());

-- Policies for trip_notifications
CREATE POLICY "Users can view their own trip notifications"
  ON public.trip_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own trip notifications"
  ON public.trip_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trip notifications"
  ON public.trip_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own trip notifications"
  ON public.trip_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for trip_notification_matches
CREATE POLICY "Users can view trip notification matches for their notifications"
  ON public.trip_notification_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_notifications 
      WHERE id = notification_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create trip notification matches"
  ON public.trip_notification_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_trip_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_trip_requests_updated_at
BEFORE UPDATE ON public.trip_requests
FOR EACH ROW
EXECUTE FUNCTION update_trip_requests_updated_at();

CREATE TRIGGER update_trip_notifications_updated_at
BEFORE UPDATE ON public.trip_notifications
FOR EACH ROW
EXECUTE FUNCTION update_trip_notifications_updated_at();

-- Function to find matching trips for a trip request
CREATE OR REPLACE FUNCTION find_matching_trips(
  p_departure_airport text,
  p_destination_airport text,
  p_request_date date DEFAULT NULL,
  p_request_month text DEFAULT NULL
)
RETURNS TABLE(
  trip_id uuid,
  traveler_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id,
    t.user_id as traveler_id
  FROM trips t
  WHERE 
    t.is_closed = false
    AND t.travel_date >= CURRENT_DATE
    AND t.leaving_airport = p_departure_airport
    AND t.destination_airport = p_destination_airport
    AND (
      p_request_date IS NULL 
      OR t.travel_date = p_request_date
      OR (
        p_request_month IS NOT NULL 
        AND TO_CHAR(t.travel_date, 'YYYY-MM') = p_request_month
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire old trip requests and notifications
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
RETURNS void AS $$
BEGIN
  -- Expire trip requests
  UPDATE public.trip_requests 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
  
  -- Expire trip notifications
  UPDATE public.trip_notifications 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;