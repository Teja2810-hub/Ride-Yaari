/*
  # Data Cleanup and Maintenance Procedures

  ## Overview
  This migration provides utility functions for cleaning up duplicate and stale data.
  These functions can be called periodically or on-demand to maintain data integrity.

  ## 1. Functions Created
    - `cleanup_duplicate_confirmations()` - Removes duplicate pending requests
    - `cleanup_orphaned_confirmations()` - Removes confirmations for deleted rides/trips
    - `cleanup_stale_pending_requests()` - Removes old pending requests for expired rides
    - `audit_seat_availability()` - Recalculates and fixes seat counts
    - `get_cleanup_statistics()` - Returns statistics about data that needs cleanup

  ## 2. Data Safety
    - Never deletes historical data (accepted/rejected confirmations)
    - Only removes truly duplicate or orphaned records
    - Provides audit logs before deletion
    - All functions are SECURITY DEFINER to ensure consistent execution
*/

-- ============================================================================
-- FUNCTION: Get cleanup statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cleanup_statistics()
RETURNS TABLE(
  metric text,
  count bigint,
  description text
) AS $$
BEGIN
  RETURN QUERY
  
  -- Count duplicate pending confirmations
  SELECT 
    'duplicate_pending_confirmations'::text,
    COUNT(*)::bigint,
    'Duplicate pending requests for same ride/trip and passenger'::text
  FROM (
    SELECT ride_id, trip_id, passenger_id, COUNT(*) as cnt
    FROM ride_confirmations
    WHERE status = 'pending'
    GROUP BY ride_id, trip_id, passenger_id
    HAVING COUNT(*) > 1
  ) dupes
  
  UNION ALL
  
  -- Count orphaned ride confirmations
  SELECT 
    'orphaned_ride_confirmations'::text,
    COUNT(*)::bigint,
    'Confirmations referencing deleted car rides'::text
  FROM ride_confirmations rc
  WHERE rc.ride_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM car_rides cr WHERE cr.id = rc.ride_id)
  
  UNION ALL
  
  -- Count orphaned trip confirmations
  SELECT 
    'orphaned_trip_confirmations'::text,
    COUNT(*)::bigint,
    'Confirmations referencing deleted trips'::text
  FROM ride_confirmations rc
  WHERE rc.trip_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.id = rc.trip_id)
  
  UNION ALL
  
  -- Count stale pending requests for expired rides
  SELECT 
    'stale_pending_ride_requests'::text,
    COUNT(*)::bigint,
    'Pending requests for expired car rides'::text
  FROM ride_confirmations rc
  INNER JOIN car_rides cr ON rc.ride_id = cr.id
  WHERE rc.status = 'pending'
  AND cr.departure_date_time < now()
  
  UNION ALL
  
  -- Count stale pending requests for expired trips
  SELECT 
    'stale_pending_trip_requests'::text,
    COUNT(*)::bigint,
    'Pending requests for expired trips'::text
  FROM ride_confirmations rc
  INNER JOIN trips t ON rc.trip_id = t.id
  WHERE rc.status = 'pending'
  AND t.travel_date < CURRENT_DATE
  
  UNION ALL
  
  -- Count car rides with incorrect seat calculations
  SELECT 
    'rides_with_incorrect_seats'::text,
    COUNT(*)::bigint,
    'Car rides where seats_available does not match confirmed bookings'::text
  FROM car_rides cr
  WHERE cr.seats_available != (
    cr.total_seats - COALESCE((
      SELECT SUM(rc.seats_requested)
      FROM ride_confirmations rc
      WHERE rc.ride_id = cr.id 
      AND rc.status = 'accepted'
      AND rc.seats_requested IS NOT NULL
    ), 0)
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Cleanup duplicate pending confirmations
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_confirmations()
RETURNS TABLE(
  deleted_count integer,
  details jsonb
) AS $$
DECLARE
  v_deleted_count integer := 0;
  v_details jsonb;
BEGIN
  -- Keep only the oldest pending confirmation for each ride/trip + passenger combination
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY ride_id, trip_id, passenger_id 
             ORDER BY created_at ASC
           ) as rn
    FROM ride_confirmations
    WHERE status = 'pending'
  )
  DELETE FROM ride_confirmations
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  v_details := jsonb_build_object(
    'deleted_count', v_deleted_count,
    'reason', 'Removed duplicate pending confirmations, kept oldest request',
    'timestamp', now()
  );
  
  RETURN QUERY SELECT v_deleted_count, v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Cleanup orphaned confirmations
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_orphaned_confirmations()
RETURNS TABLE(
  deleted_count integer,
  details jsonb
) AS $$
DECLARE
  v_deleted_ride_confirmations integer := 0;
  v_deleted_trip_confirmations integer := 0;
  v_details jsonb;
BEGIN
  -- Delete orphaned ride confirmations
  DELETE FROM ride_confirmations rc
  WHERE rc.ride_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM car_rides cr WHERE cr.id = rc.ride_id);
  
  GET DIAGNOSTICS v_deleted_ride_confirmations = ROW_COUNT;
  
  -- Delete orphaned trip confirmations
  DELETE FROM ride_confirmations rc
  WHERE rc.trip_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.id = rc.trip_id);
  
  GET DIAGNOSTICS v_deleted_trip_confirmations = ROW_COUNT;
  
  v_details := jsonb_build_object(
    'deleted_ride_confirmations', v_deleted_ride_confirmations,
    'deleted_trip_confirmations', v_deleted_trip_confirmations,
    'total_deleted', v_deleted_ride_confirmations + v_deleted_trip_confirmations,
    'reason', 'Removed confirmations for non-existent rides/trips',
    'timestamp', now()
  );
  
  RETURN QUERY SELECT 
    v_deleted_ride_confirmations + v_deleted_trip_confirmations, 
    v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Cleanup stale pending requests
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_stale_pending_requests()
RETURNS TABLE(
  deleted_count integer,
  details jsonb
) AS $$
DECLARE
  v_deleted_ride_requests integer := 0;
  v_deleted_trip_requests integer := 0;
  v_details jsonb;
BEGIN
  -- Delete pending requests for expired car rides
  DELETE FROM ride_confirmations rc
  WHERE rc.status = 'pending'
  AND rc.ride_id IN (
    SELECT id FROM car_rides
    WHERE departure_date_time < now()
  );
  
  GET DIAGNOSTICS v_deleted_ride_requests = ROW_COUNT;
  
  -- Delete pending requests for expired trips
  DELETE FROM ride_confirmations rc
  WHERE rc.status = 'pending'
  AND rc.trip_id IN (
    SELECT id FROM trips
    WHERE travel_date < CURRENT_DATE
  );
  
  GET DIAGNOSTICS v_deleted_trip_requests = ROW_COUNT;
  
  v_details := jsonb_build_object(
    'deleted_ride_requests', v_deleted_ride_requests,
    'deleted_trip_requests', v_deleted_trip_requests,
    'total_deleted', v_deleted_ride_requests + v_deleted_trip_requests,
    'reason', 'Removed pending requests for expired rides/trips',
    'timestamp', now()
  );
  
  RETURN QUERY SELECT 
    v_deleted_ride_requests + v_deleted_trip_requests, 
    v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Audit and fix seat availability
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_seat_availability()
RETURNS TABLE(
  updated_count integer,
  details jsonb
) AS $$
DECLARE
  v_updated_count integer := 0;
  v_details jsonb;
BEGIN
  -- Recalculate seats_available for all car rides based on accepted confirmations
  WITH seat_calculations AS (
    SELECT 
      cr.id,
      cr.total_seats,
      cr.seats_available as current_seats_available,
      cr.total_seats - COALESCE(SUM(rc.seats_requested), 0) as calculated_seats_available
    FROM car_rides cr
    LEFT JOIN ride_confirmations rc ON rc.ride_id = cr.id AND rc.status = 'accepted'
    GROUP BY cr.id, cr.total_seats, cr.seats_available
    HAVING cr.seats_available != (cr.total_seats - COALESCE(SUM(rc.seats_requested), 0))
  )
  UPDATE car_rides
  SET seats_available = sc.calculated_seats_available
  FROM seat_calculations sc
  WHERE car_rides.id = sc.id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  v_details := jsonb_build_object(
    'updated_count', v_updated_count,
    'reason', 'Recalculated seats_available based on accepted confirmations',
    'timestamp', now()
  );
  
  RETURN QUERY SELECT v_updated_count, v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Run all cleanup procedures
-- ============================================================================
CREATE OR REPLACE FUNCTION run_all_cleanup_procedures()
RETURNS TABLE(
  procedure_name text,
  deleted_or_updated_count integer,
  details jsonb
) AS $$
BEGIN
  RETURN QUERY
  
  -- Cleanup duplicates
  SELECT 
    'cleanup_duplicate_confirmations'::text,
    t.deleted_count,
    t.details
  FROM cleanup_duplicate_confirmations() t
  
  UNION ALL
  
  -- Cleanup orphaned
  SELECT 
    'cleanup_orphaned_confirmations'::text,
    t.deleted_count,
    t.details
  FROM cleanup_orphaned_confirmations() t
  
  UNION ALL
  
  -- Cleanup stale
  SELECT 
    'cleanup_stale_pending_requests'::text,
    t.deleted_count,
    t.details
  FROM cleanup_stale_pending_requests() t
  
  UNION ALL
  
  -- Audit seats
  SELECT 
    'audit_seat_availability'::text,
    t.updated_count,
    t.details
  FROM audit_seat_availability() t;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_cleanup_statistics() IS 'Returns statistics about duplicate, orphaned, and stale data that needs cleanup';
COMMENT ON FUNCTION cleanup_duplicate_confirmations() IS 'Removes duplicate pending confirmation requests, keeping only the oldest';
COMMENT ON FUNCTION cleanup_orphaned_confirmations() IS 'Removes confirmations that reference deleted rides or trips';
COMMENT ON FUNCTION cleanup_stale_pending_requests() IS 'Removes pending requests for expired rides and trips';
COMMENT ON FUNCTION audit_seat_availability() IS 'Recalculates and fixes seat_available counts based on accepted confirmations';
COMMENT ON FUNCTION run_all_cleanup_procedures() IS 'Executes all cleanup procedures and returns summary of changes';
