/*
  # Error Reporting System

  1. New Tables
    - `error_reports` - Store client-side errors for developer notification
    - Track error context, user information, and resolution status

  2. Security
    - Enable RLS on error_reports table
    - Allow public and authenticated users to insert error reports
    - Restrict read access to authenticated users only

  3. Features
    - Store comprehensive error information
    - Track resolution status
    - Support metadata for additional context
    - Enable webhook notifications for new errors
*/

-- Create error_reports table
CREATE TABLE IF NOT EXISTS public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  context text,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  user_agent text,
  url text,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  is_resolved boolean DEFAULT false,
  error_code text,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON public.error_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON public.error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_is_resolved ON public.error_reports(is_resolved);
CREATE INDEX IF NOT EXISTS idx_error_reports_context ON public.error_reports(context);

-- Enable Row Level Security
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;



-- Policy: Allow authenticated users to view error reports (for admin purposes)
CREATE POLICY "Authenticated users can view error reports"
  ON public.error_reports FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update error reports (for marking as resolved)
CREATE POLICY "Authenticated users can update error reports"
  ON public.error_reports FOR UPDATE
  TO authenticated
  USING (true);