/*
  # Supporting Tables for Requests, Notifications, and System Features

  ## 1. Tables Created
    - `ride_requests` - Passenger ride requests with location preferences
    - `trip_requests` - Passenger trip requests for airport travel
    - `ride_notifications` - Notification preferences for car rides
    - `trip_notifications` - Notification preferences for airport trips
    - `notification_matches` - Tracking sent ride notifications
    - `trip_notification_matches` - Tracking sent trip notifications
    - `error_reports` - Error tracking and monitoring system
    - `user_blocks` - User blocking functionality

  ## 2. Security
    - RLS enabled on all tables
    - Users can manage their own requests and notifications
    - Public read access for active requests to enable matching
*/

-- ============================================================================
-- RIDE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  departure_location text NOT NULL,
  departure_latitude numeric,
  departure_longitude numeric,
  destination_location text NOT NULL,
  destination_latitude numeric,
  destination_longitude numeric,
  search_radius_miles integer DEFAULT 25,
  request_type text NOT NULL CHECK (request_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  request_month text,
  departure_time_preference text,
  max_price numeric,
  currency text DEFAULT 'USD',
  additional_notes text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger_id ON ride_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_location ON ride_requests(departure_latitude, departure_longitude, destination_latitude, destination_longitude);
CREATE INDEX IF NOT EXISTS idx_ride_requests_active ON ride_requests(is_active) WHERE is_active = true;

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ride requests"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view active ride requests"
  ON ride_requests FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Users can create their own ride requests"
  ON ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own ride requests"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Users can delete their own ride requests"
  ON ride_requests FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());

-- ============================================================================
-- TRIP REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  departure_airport text NOT NULL,
  destination_airport text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  request_month text,
  departure_time_preference text,
  max_price numeric,
  currency text DEFAULT 'USD',
  additional_notes text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_requests_passenger_id ON trip_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_airports ON trip_requests(departure_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_trip_requests_active ON trip_requests(is_active) WHERE is_active = true;

ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all trip requests"
  ON trip_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view active trip requests"
  ON trip_requests FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Users can create their own trip requests"
  ON trip_requests FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update their own trip requests"
  ON trip_requests FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Users can delete their own trip requests"
  ON trip_requests FOR DELETE
  TO authenticated
  USING (passenger_id = auth.uid());

-- ============================================================================
-- RIDE NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
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
  notification_month text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_notifications_user_id ON ride_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_notifications_active ON ride_notifications(is_active) WHERE is_active = true;

ALTER TABLE ride_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON ride_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own notifications"
  ON ride_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON ride_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON ride_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIP NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('passenger_request', 'traveler_post')),
  departure_airport text NOT NULL,
  destination_airport text NOT NULL,
  date_type text NOT NULL CHECK (date_type IN ('specific_date', 'multiple_dates', 'month')),
  specific_date date,
  multiple_dates date[],
  notification_month text,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_active ON trip_notifications(is_active) WHERE is_active = true;

ALTER TABLE trip_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trip notifications"
  ON trip_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own trip notifications"
  ON trip_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trip notifications"
  ON trip_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own trip notifications"
  ON trip_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATION MATCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES ride_notifications(id) ON DELETE CASCADE NOT NULL,
  matched_item_id uuid NOT NULL,
  matched_item_type text NOT NULL CHECK (matched_item_type IN ('ride_post', 'ride_request')),
  notified_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_matches_notification_id ON notification_matches(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_matches_matched_item ON notification_matches(matched_item_id, matched_item_type);

ALTER TABLE notification_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification matches for their notifications"
  ON notification_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_notifications 
      WHERE id = notification_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create notification matches"
  ON notification_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- TRIP NOTIFICATION MATCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_notification_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES trip_notifications(id) ON DELETE CASCADE NOT NULL,
  matched_item_id uuid NOT NULL,
  matched_item_type text NOT NULL CHECK (matched_item_type IN ('trip_post', 'trip_request')),
  notified_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_notification_matches_notification_id ON trip_notification_matches(notification_id);
CREATE INDEX IF NOT EXISTS idx_trip_notification_matches_matched_item ON trip_notification_matches(matched_item_id, matched_item_type);

ALTER TABLE trip_notification_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip notification matches for their notifications"
  ON trip_notification_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_notifications 
      WHERE id = notification_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can create trip notification matches"
  ON trip_notification_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- ERROR REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  page_url text,
  user_agent text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports(severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_resolved ON error_reports(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_reports_created ON error_reports(created_at DESC);

ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error reports"
  ON error_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can create error reports"
  ON error_reports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update error reports"
  ON error_reports FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- USER BLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
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

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_ride_requests_updated_at
BEFORE UPDATE ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_requests_updated_at
BEFORE UPDATE ON trip_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_notifications_updated_at
BEFORE UPDATE ON ride_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_notifications_updated_at
BEFORE UPDATE ON trip_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  R numeric := 3959;
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

-- Function to cleanup expired requests and notifications
CREATE OR REPLACE FUNCTION cleanup_expired_items()
RETURNS void AS $$
BEGIN
  UPDATE ride_requests 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
  
  UPDATE trip_requests 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
  
  UPDATE ride_notifications 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
  
  UPDATE trip_notifications 
  SET is_active = false
  WHERE is_active = true 
  AND expires_at IS NOT NULL 
  AND expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
