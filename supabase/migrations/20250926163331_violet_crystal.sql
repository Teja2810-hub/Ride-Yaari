/*
  # Fix Error Reports Table Schema

  1. Schema Fix
    - Ensure `error_code` column exists in `error_reports` table
    - Add missing columns if they don't exist
    - Update table structure to match expected schema

  2. Security
    - Maintain existing RLS policies
    - Ensure proper indexing for performance

  3. Compatibility
    - Safe migration that won't break existing data
    - Uses IF NOT EXISTS to prevent conflicts
*/

-- Ensure error_code column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE public.error_reports ADD COLUMN error_code text;
  END IF;
END $$;

-- Ensure session_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.error_reports ADD COLUMN session_id text;
  END IF;
END $$;

-- Ensure metadata column exists with proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.error_reports ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Ensure severity column exists (used by error reporting system)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.error_reports ADD COLUMN severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_error_reports_error_code ON public.error_reports(error_code);
CREATE INDEX IF NOT EXISTS idx_error_reports_session_id ON public.error_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON public.error_reports(severity);

-- Ensure the table has proper RLS policies for error insertion
DO $$
BEGIN
  -- Check if the public insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_reports' 
    AND policyname = 'Allow public error reporting'
  ) THEN
    -- Create policy to allow public error reporting
    CREATE POLICY "Allow public error reporting"
      ON public.error_reports FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Refresh the schema cache by updating table comment
COMMENT ON TABLE public.error_reports IS 'Error reporting table for client-side error tracking - Updated schema';