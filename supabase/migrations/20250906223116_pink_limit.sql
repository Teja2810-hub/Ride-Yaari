/*
  # Add currency support and message read status

  1. Changes to car_rides table
    - Add `currency` column for currency type selection
    - Set default to 'USD'

  2. Changes to chat_messages table  
    - Add `is_read` column to track message read status
    - Set default to false

  3. Security
    - No RLS changes needed as existing policies cover new columns
*/

-- Add currency column to car_rides table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'car_rides' AND column_name = 'currency'
  ) THEN
    ALTER TABLE car_rides ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- Add is_read column to chat_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;