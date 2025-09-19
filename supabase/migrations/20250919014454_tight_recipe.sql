/*
  # Add Confirmation Expiry and Reversal Logic

  1. New Columns
    - Add `expiry_date` to track when confirmations should expire
    - Add `can_reverse` boolean to track reversal eligibility
    - Add `reversal_deadline` to track reversal time limits
    - Add `request_count` to track how many times a user has requested

  2. Functions
    - Function to automatically expire old pending confirmations
    - Function to check reversal eligibility
    - Function to handle request again logic

  3. Security
    - Maintain existing RLS policies
    - Add policies for reversal actions
*/

-- Add new columns for expiry and reversal logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN expiry_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'can_reverse'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN can_reverse boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'reversal_deadline'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN reversal_deadline timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'request_count'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN request_count integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_confirmations' AND column_name = 'last_action_by'
  ) THEN
    ALTER TABLE ride_confirmations ADD COLUMN last_action_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Function to set expiry dates and reversal deadlines
CREATE OR REPLACE FUNCTION set_confirmation_expiry_and_reversal()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiry date for pending confirmations (72 hours from creation)
    IF NEW.status = 'pending' THEN
        NEW.expiry_date = NEW.created_at + INTERVAL '72 hours';
        NEW.can_reverse = false;
        NEW.reversal_deadline = NULL;
    END IF;
    
    -- Set reversal deadline for rejected confirmations (24 hours from rejection)
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        NEW.can_reverse = true;
        NEW.reversal_deadline = NOW() + INTERVAL '24 hours';
    END IF;
    
    -- Clear reversal options for accepted confirmations
    IF NEW.status = 'accepted' THEN
        NEW.can_reverse = false;
        NEW.reversal_deadline = NULL;
    END IF;
    
    -- Increment request count when status changes from rejected back to pending
    IF NEW.status = 'pending' AND OLD.status = 'rejected' THEN
        NEW.request_count = COALESCE(OLD.request_count, 1) + 1;
        NEW.expiry_date = NOW() + INTERVAL '72 hours';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for expiry and reversal logic
DROP TRIGGER IF EXISTS set_confirmation_expiry_and_reversal_trigger ON ride_confirmations;
CREATE TRIGGER set_confirmation_expiry_and_reversal_trigger
    BEFORE INSERT OR UPDATE ON ride_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION set_confirmation_expiry_and_reversal();

-- Function to expire old pending confirmations
CREATE OR REPLACE FUNCTION expire_old_pending_confirmations()
RETURNS TABLE(expired_count integer) AS $$
DECLARE
    expired_ids uuid[];
    confirmation_record RECORD;
BEGIN
    -- Find expired pending confirmations
    SELECT ARRAY_AGG(id) INTO expired_ids
    FROM ride_confirmations
    WHERE status = 'pending' 
    AND expiry_date < NOW()
    AND expiry_date IS NOT NULL;
    
    -- Update expired confirmations to rejected
    IF expired_ids IS NOT NULL AND array_length(expired_ids, 1) > 0 THEN
        UPDATE ride_confirmations
        SET 
            status = 'rejected',
            confirmed_at = NOW(),
            updated_at = NOW(),
            can_reverse = false,
            reversal_deadline = NULL,
            last_action_by = ride_owner_id -- System action on behalf of owner
        WHERE id = ANY(expired_ids);
        
        expired_count := array_length(expired_ids, 1);
    ELSE
        expired_count := 0;
    END IF;
    
    RETURN QUERY SELECT expired_count;
END;
$$ language 'plpgsql';

-- Function to clean up expired reversal deadlines
CREATE OR REPLACE FUNCTION cleanup_expired_reversals()
RETURNS TABLE(cleaned_count integer) AS $$
BEGIN
    UPDATE ride_confirmations
    SET 
        can_reverse = false,
        reversal_deadline = NULL
    WHERE can_reverse = true 
    AND reversal_deadline < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN QUERY SELECT cleaned_count;
END;
$$ language 'plpgsql';

-- Function to check if a confirmation can be reversed
CREATE OR REPLACE FUNCTION can_reverse_confirmation(confirmation_id uuid, user_id uuid)
RETURNS TABLE(
    can_reverse boolean,
    reason text
) AS $$
DECLARE
    conf_record RECORD;
    ride_record RECORD;
    trip_record RECORD;
BEGIN
    -- Get confirmation details
    SELECT * INTO conf_record
    FROM ride_confirmations
    WHERE id = confirmation_id
    AND (ride_owner_id = user_id OR passenger_id = user_id);
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Confirmation not found or access denied';
        RETURN;
    END IF;
    
    -- Check if status is rejected
    IF conf_record.status != 'rejected' THEN
        RETURN QUERY SELECT false, 'Only rejected confirmations can be reversed';
        RETURN;
    END IF;
    
    -- Check reversal deadline
    IF conf_record.reversal_deadline IS NULL OR conf_record.reversal_deadline < NOW() THEN
        RETURN QUERY SELECT false, 'Reversal deadline has passed (24 hours limit)';
        RETURN;
    END IF;
    
    -- Check if ride/trip is in the future
    IF conf_record.ride_id IS NOT NULL THEN
        SELECT departure_date_time INTO ride_record
        FROM car_rides
        WHERE id = conf_record.ride_id;
        
        IF ride_record.departure_date_time <= NOW() THEN
            RETURN QUERY SELECT false, 'Cannot reverse for past rides';
            RETURN;
        END IF;
    END IF;
    
    IF conf_record.trip_id IS NOT NULL THEN
        SELECT travel_date INTO trip_record
        FROM trips
        WHERE id = conf_record.trip_id;
        
        IF trip_record.travel_date::date <= CURRENT_DATE THEN
            RETURN QUERY SELECT false, 'Cannot reverse for past trips';
            RETURN;
        END IF;
    END IF;
    
    RETURN QUERY SELECT true, 'Reversal allowed';
END;
$$ language 'plpgsql';

-- Update existing confirmations with expiry dates
UPDATE ride_confirmations
SET 
    expiry_date = CASE 
        WHEN status = 'pending' THEN created_at + INTERVAL '72 hours'
        ELSE NULL
    END,
    can_reverse = CASE 
        WHEN status = 'rejected' AND confirmed_at > NOW() - INTERVAL '24 hours' THEN true
        ELSE false
    END,
    reversal_deadline = CASE 
        WHEN status = 'rejected' AND confirmed_at > NOW() - INTERVAL '24 hours' THEN confirmed_at + INTERVAL '24 hours'
        ELSE NULL
    END,
    request_count = COALESCE(request_count, 1)
WHERE expiry_date IS NULL;

-- Create index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_expiry_date ON ride_confirmations(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_reversal_deadline ON ride_confirmations(reversal_deadline) WHERE reversal_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ride_confirmations_can_reverse ON ride_confirmations(can_reverse) WHERE can_reverse = true;

-- Add policy for reversal actions
CREATE POLICY "Users can reverse their own confirmations"
  ON ride_confirmations FOR UPDATE
  TO authenticated
  USING (
    (ride_owner_id = auth.uid() OR passenger_id = auth.uid()) 
    AND can_reverse = true 
    AND reversal_deadline > NOW()
  );