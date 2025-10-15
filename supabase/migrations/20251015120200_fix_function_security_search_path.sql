/*
  # Fix Function Security - Add search_path

  ## Security Improvements
  - Add search_path to all functions to prevent potential search_path exploits
  - Setting search_path prevents unauthorized schema manipulation attacks
  - Ensures functions always execute in the expected schema context

  ## Changes
  - Add "SET search_path = public" to all existing functions
  - Functions affected:
    - update_email_verification_updated_at
    - update_seats_available
    - update_ride_requests_updated_at
    - update_ride_notifications_updated_at
    - update_ride_confirmations_updated_at
    - is_user_blocked
    - is_chat_deleted
    - find_matching_drivers
    - cleanup_expired_ride_requests
    - is_user_blocked_simple
    - is_chat_deleted_simple
    - has_user_deleted_chat
    - find_ride_notification_recipients
    - find_trip_notification_recipients
    - get_user_id_by_email
    - ride_matches_notification_criteria
    - trip_matches_notification_criteria
    - update_updated_at_column
    - calculate_distance_miles
    - cleanup_expired_items
    - cleanup_old_notifications
    - update_trip_requests_updated_at
    - update_trip_notifications_updated_at
    - find_matching_trips
    - cleanup_expired_trip_requests
    - cleanup_old_system_messages

  ## Notes
  - No functionality changes
  - Security hardening only
  - All functions will execute in the public schema
*/

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_email_verification_updated_at ON email_change_verification;
DROP TRIGGER IF EXISTS update_seats_available ON ride_confirmations;
DROP TRIGGER IF EXISTS update_ride_requests_updated_at ON ride_requests;
DROP TRIGGER IF EXISTS update_ride_notifications_updated_at ON ride_notifications;
DROP TRIGGER IF EXISTS update_ride_confirmations_updated_at ON ride_confirmations;
DROP TRIGGER IF EXISTS update_car_rides_updated_at ON car_rides;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
DROP TRIGGER IF EXISTS update_trip_requests_updated_at ON trip_requests;
DROP TRIGGER IF EXISTS update_trip_notifications_updated_at ON trip_notifications;
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;

-- update_email_verification_updated_at
DROP FUNCTION IF EXISTS update_email_verification_updated_at();
CREATE FUNCTION update_email_verification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_email_verification_updated_at
    BEFORE UPDATE ON email_change_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_email_verification_updated_at();

-- update_seats_available
DROP FUNCTION IF EXISTS update_seats_available();
CREATE FUNCTION update_seats_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE car_rides
        SET seats_available = seats_available - 1
        WHERE id = NEW.ride_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'confirmed' THEN
            UPDATE car_rides
            SET seats_available = seats_available - 1
            WHERE id = NEW.ride_id;
        ELSIF OLD.status = 'confirmed' THEN
            UPDATE car_rides
            SET seats_available = seats_available + 1
            WHERE id = NEW.ride_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE car_rides
        SET seats_available = seats_available + 1
        WHERE id = OLD.ride_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_seats_available
    AFTER INSERT OR UPDATE OR DELETE ON ride_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION update_seats_available();

-- update_ride_requests_updated_at
DROP FUNCTION IF EXISTS update_ride_requests_updated_at();
CREATE FUNCTION update_ride_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_ride_requests_updated_at
    BEFORE UPDATE ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_ride_requests_updated_at();

-- update_ride_notifications_updated_at
DROP FUNCTION IF EXISTS update_ride_notifications_updated_at();
CREATE FUNCTION update_ride_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_ride_notifications_updated_at
    BEFORE UPDATE ON ride_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_ride_notifications_updated_at();

-- update_ride_confirmations_updated_at
DROP FUNCTION IF EXISTS update_ride_confirmations_updated_at();
CREATE FUNCTION update_ride_confirmations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_ride_confirmations_updated_at
    BEFORE UPDATE ON ride_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION update_ride_confirmations_updated_at();

-- is_user_blocked
DROP FUNCTION IF EXISTS is_user_blocked(uuid, uuid);
CREATE FUNCTION is_user_blocked(blocker_id uuid, blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_blocks
        WHERE user_blocks.blocker_id = is_user_blocked.blocker_id
        AND user_blocks.blocked_id = is_user_blocked.blocked_id
    );
END;
$$;

-- is_chat_deleted
DROP FUNCTION IF EXISTS is_chat_deleted(uuid, uuid);
CREATE FUNCTION is_chat_deleted(user_id_param uuid, other_user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM chat_deletions
        WHERE user_id = user_id_param
        AND other_user_id = other_user_id_param
    );
END;
$$;

-- find_matching_drivers
DROP FUNCTION IF EXISTS find_matching_drivers(uuid, float8, float8, float8, float8, integer);
CREATE FUNCTION find_matching_drivers(
    request_id uuid,
    departure_lat float8,
    departure_lon float8,
    destination_lat float8,
    destination_lon float8,
    search_radius_miles integer
)
RETURNS TABLE (
    ride_id uuid,
    user_id uuid,
    departure_distance float8,
    destination_distance float8
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cr.id as ride_id,
        cr.user_id,
        calculate_distance_miles(departure_lat, departure_lon, cr.from_latitude, cr.from_longitude) as departure_distance,
        calculate_distance_miles(destination_lat, destination_lon, cr.to_latitude, cr.to_longitude) as destination_distance
    FROM car_rides cr
    WHERE cr.departure_date_time > NOW()
        AND cr.seats_available > 0
        AND calculate_distance_miles(departure_lat, departure_lon, cr.from_latitude, cr.from_longitude) <= search_radius_miles
        AND calculate_distance_miles(destination_lat, destination_lon, cr.to_latitude, cr.to_longitude) <= search_radius_miles;
END;
$$;

-- cleanup_expired_ride_requests
DROP FUNCTION IF EXISTS cleanup_expired_ride_requests();
CREATE FUNCTION cleanup_expired_ride_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM ride_requests
    WHERE expires_at < NOW();
END;
$$;

-- is_user_blocked_simple
DROP FUNCTION IF EXISTS is_user_blocked_simple(uuid, uuid);
CREATE FUNCTION is_user_blocked_simple(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = user1 AND blocked_id = user2)
           OR (blocker_id = user2 AND blocked_id = user1)
    );
END;
$$;

-- is_chat_deleted_simple
DROP FUNCTION IF EXISTS is_chat_deleted_simple(uuid, uuid);
CREATE FUNCTION is_chat_deleted_simple(uid uuid, other_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM chat_deletions
        WHERE user_id = uid AND other_user_id = other_uid
    );
END;
$$;

-- has_user_deleted_chat
DROP FUNCTION IF EXISTS has_user_deleted_chat(uuid, uuid);
CREATE FUNCTION has_user_deleted_chat(user_id_param uuid, other_user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deletion_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_chat_deletions
        WHERE user_id = user_id_param
        AND other_user_id = other_user_id_param
    ) INTO deletion_exists;

    RETURN deletion_exists;
END;
$$;

-- find_ride_notification_recipients
DROP FUNCTION IF EXISTS find_ride_notification_recipients(uuid);
CREATE FUNCTION find_ride_notification_recipients(
    ride_id_param uuid
)
RETURNS TABLE (
    user_id uuid,
    notification_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT rn.user_id, rn.id as notification_id
    FROM ride_notifications rn
    INNER JOIN car_rides cr ON cr.id = ride_id_param
    WHERE rn.is_active = true
    AND ride_matches_notification_criteria(
        ride_id_param,
        rn.date_type,
        rn.specific_date,
        rn.multiple_dates,
        rn.notification_month,
        rn.departure_latitude,
        rn.departure_longitude,
        rn.destination_latitude,
        rn.destination_longitude,
        rn.search_radius_miles
    );
END;
$$;

-- find_trip_notification_recipients
DROP FUNCTION IF EXISTS find_trip_notification_recipients(uuid);
CREATE FUNCTION find_trip_notification_recipients(
    trip_id_param uuid
)
RETURNS TABLE (
    user_id uuid,
    notification_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT tn.user_id, tn.id as notification_id
    FROM trip_notifications tn
    INNER JOIN trips t ON t.id = trip_id_param
    WHERE tn.is_active = true
    AND trip_matches_notification_criteria(
        trip_id_param,
        tn.date_type,
        tn.specific_date,
        tn.multiple_dates,
        tn.notification_month,
        tn.departure_airport,
        tn.destination_airport
    );
END;
$$;

-- get_user_id_by_email
DROP FUNCTION IF EXISTS get_user_id_by_email(text);
CREATE FUNCTION get_user_id_by_email(email_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id_result uuid;
BEGIN
    SELECT id INTO user_id_result
    FROM auth.users
    WHERE email = email_param
    LIMIT 1;

    RETURN user_id_result;
END;
$$;

-- ride_matches_notification_criteria
DROP FUNCTION IF EXISTS ride_matches_notification_criteria(uuid, text, date, date[], text, float8, float8, float8, float8, integer);
CREATE FUNCTION ride_matches_notification_criteria(
    ride_id_param uuid,
    date_type_param text,
    specific_date_param date,
    multiple_dates_param date[],
    notification_month_param text,
    notif_departure_lat float8,
    notif_departure_lon float8,
    notif_destination_lat float8,
    notif_destination_lon float8,
    search_radius_miles_param integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ride_record RECORD;
    ride_date date;
    ride_month text;
    departure_dist float8;
    destination_dist float8;
BEGIN
    SELECT * INTO ride_record FROM car_rides WHERE id = ride_id_param;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    ride_date := ride_record.departure_date_time::date;
    ride_month := to_char(ride_record.departure_date_time, 'YYYY-MM');

    departure_dist := calculate_distance_miles(
        notif_departure_lat,
        notif_departure_lon,
        ride_record.from_latitude,
        ride_record.from_longitude
    );

    destination_dist := calculate_distance_miles(
        notif_destination_lat,
        notif_destination_lon,
        ride_record.to_latitude,
        ride_record.to_longitude
    );

    IF departure_dist > search_radius_miles_param OR destination_dist > search_radius_miles_param THEN
        RETURN false;
    END IF;

    IF date_type_param = 'specific_date' THEN
        RETURN ride_date = specific_date_param;
    ELSIF date_type_param = 'multiple_dates' THEN
        RETURN ride_date = ANY(multiple_dates_param);
    ELSIF date_type_param = 'month' THEN
        RETURN ride_month = notification_month_param;
    END IF;

    RETURN false;
END;
$$;

-- trip_matches_notification_criteria
DROP FUNCTION IF EXISTS trip_matches_notification_criteria(uuid, text, date, date[], text, text, text);
CREATE FUNCTION trip_matches_notification_criteria(
    trip_id_param uuid,
    date_type_param text,
    specific_date_param date,
    multiple_dates_param date[],
    notification_month_param text,
    notif_departure_airport text,
    notif_destination_airport text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trip_record RECORD;
    trip_date date;
    trip_month text;
BEGIN
    SELECT * INTO trip_record FROM trips WHERE id = trip_id_param;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF trip_record.departure_airport != notif_departure_airport OR
       trip_record.destination_airport != notif_destination_airport THEN
        RETURN false;
    END IF;

    trip_date := trip_record.travel_date;
    trip_month := to_char(trip_record.travel_date, 'YYYY-MM');

    IF date_type_param = 'specific_date' THEN
        RETURN trip_date = specific_date_param;
    ELSIF date_type_param = 'multiple_dates' THEN
        RETURN trip_date = ANY(multiple_dates_param);
    ELSIF date_type_param = 'month' THEN
        RETURN trip_month = notification_month_param;
    END IF;

    RETURN false;
END;
$$;

-- update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'car_rides') THEN
        CREATE TRIGGER update_car_rides_updated_at
            BEFORE UPDATE ON car_rides
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        CREATE TRIGGER update_chat_messages_updated_at
            BEFORE UPDATE ON chat_messages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TRIGGER update_reviews_updated_at
            BEFORE UPDATE ON reviews
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
        CREATE TRIGGER update_trips_updated_at
            BEFORE UPDATE ON trips
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- calculate_distance_miles
DROP FUNCTION IF EXISTS calculate_distance_miles(float8, float8, float8, float8);
CREATE FUNCTION calculate_distance_miles(
    lat1 float8,
    lon1 float8,
    lat2 float8,
    lon2 float8
)
RETURNS float8
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    R float8 := 3959.0;
    dLat float8;
    dLon float8;
    a float8;
    c float8;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);

    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);

    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN R * c;
END;
$$;

-- cleanup_expired_items
DROP FUNCTION IF EXISTS cleanup_expired_items();
CREATE FUNCTION cleanup_expired_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM ride_requests WHERE expires_at < NOW();
    DELETE FROM ride_notifications WHERE expires_at < NOW();
    DELETE FROM trip_requests WHERE expires_at < NOW();
    DELETE FROM trip_notifications WHERE expires_at < NOW();
END;
$$;

-- cleanup_old_notifications
DROP FUNCTION IF EXISTS cleanup_old_notifications();
DROP FUNCTION IF EXISTS cleanup_old_notifications(integer);
CREATE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM user_notifications
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id, user_id,
                ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM user_notifications
        ) sub
        WHERE rn > 200
    );
END;
$$;

-- update_trip_requests_updated_at
DROP FUNCTION IF EXISTS update_trip_requests_updated_at();
CREATE FUNCTION update_trip_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_trip_requests_updated_at
    BEFORE UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_requests_updated_at();

-- update_trip_notifications_updated_at
DROP FUNCTION IF EXISTS update_trip_notifications_updated_at();
CREATE FUNCTION update_trip_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_trip_notifications_updated_at
    BEFORE UPDATE ON trip_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_notifications_updated_at();

-- find_matching_trips
DROP FUNCTION IF EXISTS find_matching_trips(uuid, text, text);
CREATE FUNCTION find_matching_trips(
    request_id uuid,
    departure_airport_param text,
    destination_airport_param text
)
RETURNS TABLE (
    trip_id uuid,
    user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id as trip_id,
        t.user_id
    FROM trips t
    WHERE t.travel_date >= CURRENT_DATE
        AND t.seats_available > 0
        AND t.departure_airport = departure_airport_param
        AND t.destination_airport = destination_airport_param;
END;
$$;

-- cleanup_expired_trip_requests
DROP FUNCTION IF EXISTS cleanup_expired_trip_requests();
CREATE FUNCTION cleanup_expired_trip_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM trip_requests
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- cleanup_old_system_messages
DROP FUNCTION IF EXISTS cleanup_old_system_messages();
CREATE FUNCTION cleanup_old_system_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM chat_messages
    WHERE id IN (
        SELECT id
        FROM (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY
                        LEAST(sender_id, receiver_id),
                        GREATEST(sender_id, receiver_id)
                    ORDER BY created_at DESC
                ) as rn
            FROM chat_messages
            WHERE message_type = 'system'
        ) ranked
        WHERE rn > 20
    );
END;
$$;
