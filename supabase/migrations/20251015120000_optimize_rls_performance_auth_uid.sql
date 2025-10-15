/*
  # Optimize RLS Performance - Auth UID Optimization

  ## Performance Improvements
  - Optimize all RLS policies to use (select auth.uid()) instead of auth.uid()
  - This prevents re-evaluation of auth.uid() for each row
  - Significantly improves query performance at scale

  ## Changes
  - Updates all RLS policies across all tables to use subquery pattern
  - No functionality changes - only performance optimization
  - Security remains exactly the same

  ## Tables Updated
  - trips
  - car_rides
  - chat_messages
  - ride_requests
  - ride_confirmations
  - user_profiles
  - email_change_verification
  - password_change_log
  - chat_deletions
  - user_blocks
  - user_chat_deletions
  - user_notifications
  - ride_notifications
  - notification_matches
  - trip_requests
  - trip_notifications
  - trip_notification_matches
  - error_reports
*/

-- Trips table policies
DROP POLICY IF EXISTS "Users can manage own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;

CREATE POLICY "Users can manage own trips" ON trips
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Car rides table policies
DROP POLICY IF EXISTS "Users can manage own rides" ON car_rides;
DROP POLICY IF EXISTS "Users can insert own rides" ON car_rides;
DROP POLICY IF EXISTS "Users can update own rides" ON car_rides;
DROP POLICY IF EXISTS "Users can delete own rides" ON car_rides;

CREATE POLICY "Users can manage own rides" ON car_rides
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own rides" ON car_rides
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rides" ON car_rides
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own rides" ON car_rides
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Chat messages policies
DROP POLICY IF EXISTS "Users can read their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can read own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own received messages" ON chat_messages;

CREATE POLICY "Users can view messages they sent or received" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Users can update own received messages" ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = (select auth.uid()))
  WITH CHECK (receiver_id = (select auth.uid()));

-- Ride requests policies
DROP POLICY IF EXISTS "Users can create their own ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Users can update their own ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Users can delete their own ride requests" ON ride_requests;

CREATE POLICY "Users can create their own ride requests" ON ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = (select auth.uid()));

CREATE POLICY "Users can update their own ride requests" ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (passenger_id = (select auth.uid()))
  WITH CHECK (passenger_id = (select auth.uid()));

CREATE POLICY "Users can delete their own ride requests" ON ride_requests
  FOR DELETE
  TO authenticated
  USING (passenger_id = (select auth.uid()));

-- Ride confirmations policies
DROP POLICY IF EXISTS "Ride owners can view their confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Passengers can view their confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Users can create ride confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Ride owners can update confirmation status" ON ride_confirmations;
DROP POLICY IF EXISTS "Users can delete pending confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Users can read own confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Users can insert confirmations" ON ride_confirmations;
DROP POLICY IF EXISTS "Owners can update confirmations" ON ride_confirmations;

CREATE POLICY "Users can read own confirmations" ON ride_confirmations
  FOR SELECT
  TO authenticated
  USING (
    ride_owner_id = (select auth.uid()) OR
    passenger_id = (select auth.uid())
  );

CREATE POLICY "Users can insert confirmations" ON ride_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = (select auth.uid()));

CREATE POLICY "Owners can update confirmations" ON ride_confirmations
  FOR UPDATE
  TO authenticated
  USING (ride_owner_id = (select auth.uid()))
  WITH CHECK (ride_owner_id = (select auth.uid()));

CREATE POLICY "Users can delete pending confirmations" ON ride_confirmations
  FOR DELETE
  TO authenticated
  USING (
    (ride_owner_id = (select auth.uid()) OR passenger_id = (select auth.uid()))
    AND status = 'pending'
  );

-- User profiles policies
DROP POLICY IF EXISTS "Users can update own notification preferences" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Email change verification policies
DROP POLICY IF EXISTS "Users can view own email change requests" ON email_change_verification;
DROP POLICY IF EXISTS "Users can create email change requests" ON email_change_verification;
DROP POLICY IF EXISTS "Users can update own email change requests" ON email_change_verification;

CREATE POLICY "Users can view own email change requests" ON email_change_verification
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create email change requests" ON email_change_verification
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own email change requests" ON email_change_verification
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Password change log policies
DROP POLICY IF EXISTS "Users can view own password change log" ON password_change_log;
DROP POLICY IF EXISTS "System can insert password change log" ON password_change_log;

CREATE POLICY "Users can view own password change log" ON password_change_log
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert password change log" ON password_change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Chat deletions policies
DROP POLICY IF EXISTS "Users can view their own chat deletions" ON chat_deletions;
DROP POLICY IF EXISTS "Users can create chat deletions" ON chat_deletions;
DROP POLICY IF EXISTS "Users can delete their own chat deletions" ON chat_deletions;

CREATE POLICY "Users can view their own chat deletions" ON chat_deletions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create chat deletions" ON chat_deletions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own chat deletions" ON chat_deletions
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- User blocks policies
DROP POLICY IF EXISTS "Users can view blocks they created" ON user_blocks;
DROP POLICY IF EXISTS "Users can view blocks against them" ON user_blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can view their blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can delete their blocks" ON user_blocks;

CREATE POLICY "Users can view their blocks" ON user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = (select auth.uid()) OR blocked_id = (select auth.uid()));

CREATE POLICY "Users can create blocks" ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()));

CREATE POLICY "Users can delete their blocks" ON user_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = (select auth.uid()));

-- User chat deletions policies
DROP POLICY IF EXISTS "Users can view their own chat deletions" ON user_chat_deletions;
DROP POLICY IF EXISTS "Users can create their own chat deletions" ON user_chat_deletions;
DROP POLICY IF EXISTS "Users can delete their own chat deletion records" ON user_chat_deletions;

CREATE POLICY "Users can view their own chat deletions" ON user_chat_deletions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own chat deletions" ON user_chat_deletions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own chat deletion records" ON user_chat_deletions
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- User notifications policies
DROP POLICY IF EXISTS "Users can read own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;

CREATE POLICY "Users can read own notifications" ON user_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own notifications" ON user_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Ride notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON ride_notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON ride_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON ride_notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON ride_notifications;

CREATE POLICY "Users can view their own notifications" ON ride_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own notifications" ON ride_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own notifications" ON ride_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own notifications" ON ride_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Notification matches policies
DROP POLICY IF EXISTS "Users can view notification matches for their notifications" ON notification_matches;

CREATE POLICY "Users can view notification matches for their notifications" ON notification_matches
  FOR SELECT
  TO authenticated
  USING (
    notification_id IN (
      SELECT id FROM ride_notifications WHERE user_id = (select auth.uid())
    )
  );

-- Trip requests policies
DROP POLICY IF EXISTS "Users can create their own trip requests" ON trip_requests;
DROP POLICY IF EXISTS "Users can update their own trip requests" ON trip_requests;
DROP POLICY IF EXISTS "Users can delete their own trip requests" ON trip_requests;

CREATE POLICY "Users can create their own trip requests" ON trip_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = (select auth.uid()));

CREATE POLICY "Users can update their own trip requests" ON trip_requests
  FOR UPDATE
  TO authenticated
  USING (passenger_id = (select auth.uid()))
  WITH CHECK (passenger_id = (select auth.uid()));

CREATE POLICY "Users can delete their own trip requests" ON trip_requests
  FOR DELETE
  TO authenticated
  USING (passenger_id = (select auth.uid()));

-- Trip notifications policies
DROP POLICY IF EXISTS "Users can view their own trip notifications" ON trip_notifications;
DROP POLICY IF EXISTS "Users can create their own trip notifications" ON trip_notifications;
DROP POLICY IF EXISTS "Users can update their own trip notifications" ON trip_notifications;
DROP POLICY IF EXISTS "Users can delete their own trip notifications" ON trip_notifications;

CREATE POLICY "Users can view their own trip notifications" ON trip_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own trip notifications" ON trip_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own trip notifications" ON trip_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own trip notifications" ON trip_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Trip notification matches policies
DROP POLICY IF EXISTS "Users can view trip notification matches for their notification" ON trip_notification_matches;

CREATE POLICY "Users can view trip notification matches for their notification" ON trip_notification_matches
  FOR SELECT
  TO authenticated
  USING (
    notification_id IN (
      SELECT id FROM trip_notifications WHERE user_id = (select auth.uid())
    )
  );

-- Error reports policies
DROP POLICY IF EXISTS "Users can view their own error reports" ON error_reports;

CREATE POLICY "Users can view their own error reports" ON error_reports
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR user_id IS NULL);
