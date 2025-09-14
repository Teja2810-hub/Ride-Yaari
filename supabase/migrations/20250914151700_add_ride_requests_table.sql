-- Create the ride_requests table
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.car_rides(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_id ON public.ride_requests(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_trip_id ON public.ride_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_requester_id ON public.ride_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_owner_id ON public.ride_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);

-- Enable Row Level Security
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view requests for their rides/trips
CREATE POLICY "Owners can view requests for their rides/trips"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Policy: Requesters can view their own requests
CREATE POLICY "Requesters can view their own requests"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Policy: Authenticated users can create requests
CREATE POLICY "Authenticated users can create requests"
  ON public.ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Policy: Owners can update the status of requests for their rides/trips
CREATE POLICY "Owners can update requests for their rides/trips"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Policy: Requesters can delete their own pending requests
CREATE POLICY "Requesters can delete their own pending requests"
  ON public.ride_requests FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on each update
CREATE TRIGGER update_ride_requests_updated_at
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
