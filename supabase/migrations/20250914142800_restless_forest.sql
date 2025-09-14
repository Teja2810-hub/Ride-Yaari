/*
  # Add pricing and negotiable columns to trips table

  1. New Columns
    - `price` (numeric) - Price for the airport trip service
    - `currency` (text, default 'USD') - Currency code for the price
    - `negotiable` (boolean, default false) - Whether the price is negotiable

  2. Changes
    - Add pricing support for airport trips
    - Add negotiable option for flexible pricing
*/

-- Add pricing columns to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS price numeric(10,2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS negotiable boolean DEFAULT false;