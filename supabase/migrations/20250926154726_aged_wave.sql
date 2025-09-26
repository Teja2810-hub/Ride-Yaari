/*
  # Add severity column to error_reports table

  1. Changes
    - Add `severity` column to `error_reports` table
    - Set default severity to 'medium'
    - Add check constraint for valid severity values

  2. Purpose
    - Enable error severity classification (low, medium, high, critical)
    - Support severity-based notification filtering
    - Maintain data integrity with proper constraints
*/

-- Add severity column to error_reports table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_reports' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.error_reports ADD COLUMN severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

-- Add index for efficient severity-based querying
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON public.error_reports(severity);

-- Update existing error reports to have default severity
UPDATE public.error_reports 
SET severity = 'medium' 
WHERE severity IS NULL;