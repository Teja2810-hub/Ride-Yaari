/*
  # Create locations table for static city/town database

  1. New Tables
    - `world_locations`
      - `id` (uuid, primary key)
      - `name` (text, location name)
      - `type` (text, city/town/county/state/country)
      - `parent_id` (uuid, reference to parent location)
      - `country_code` (text, ISO country code)
      - `state_province` (text, state or province name)
      - `latitude` (numeric, optional coordinates)
      - `longitude` (numeric, optional coordinates)
      - `population` (integer, optional population data)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `world_locations` table
    - Add policy for authenticated users to read locations

  3. Indexes
    - Add indexes for efficient searching by name, type, and country
*/

CREATE TABLE IF NOT EXISTS world_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('city', 'town', 'county', 'state', 'province', 'country')),
  parent_id uuid REFERENCES world_locations(id),
  country_code text NOT NULL,
  state_province text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  population integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE world_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are readable by authenticated users"
  ON world_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_world_locations_name ON world_locations USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_world_locations_type ON world_locations(type);
CREATE INDEX IF NOT EXISTS idx_world_locations_country ON world_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_world_locations_parent ON world_locations(parent_id);

-- Insert sample data for major cities and countries
INSERT INTO world_locations (name, type, country_code, latitude, longitude, population) VALUES
-- Countries
('United States', 'country', 'US', 39.8283, -98.5795, 331000000),
('United Kingdom', 'country', 'GB', 55.3781, -3.4360, 67000000),
('Canada', 'country', 'CA', 56.1304, -106.3468, 38000000),
('Australia', 'country', 'AU', -25.2744, 133.7751, 25000000),
('Germany', 'country', 'DE', 51.1657, 10.4515, 83000000),
('France', 'country', 'FR', 46.2276, 2.2137, 67000000),
('India', 'country', 'IN', 20.5937, 78.9629, 1380000000),
('China', 'country', 'CN', 35.8617, 104.1954, 1440000000),
('Japan', 'country', 'JP', 36.2048, 138.2529, 126000000),
('Brazil', 'country', 'BR', -14.2350, -51.9253, 212000000);

-- Get country IDs for reference
DO $$
DECLARE
    us_id uuid;
    uk_id uuid;
    ca_id uuid;
    au_id uuid;
    de_id uuid;
    fr_id uuid;
    in_id uuid;
    cn_id uuid;
    jp_id uuid;
    br_id uuid;
BEGIN
    SELECT id INTO us_id FROM world_locations WHERE name = 'United States' AND type = 'country';
    SELECT id INTO uk_id FROM world_locations WHERE name = 'United Kingdom' AND type = 'country';
    SELECT id INTO ca_id FROM world_locations WHERE name = 'Canada' AND type = 'country';
    SELECT id INTO au_id FROM world_locations WHERE name = 'Australia' AND type = 'country';
    SELECT id INTO de_id FROM world_locations WHERE name = 'Germany' AND type = 'country';
    SELECT id INTO fr_id FROM world_locations WHERE name = 'France' AND type = 'country';
    SELECT id INTO in_id FROM world_locations WHERE name = 'India' AND type = 'country';
    SELECT id INTO cn_id FROM world_locations WHERE name = 'China' AND type = 'country';
    SELECT id INTO jp_id FROM world_locations WHERE name = 'Japan' AND type = 'country';
    SELECT id INTO br_id FROM world_locations WHERE name = 'Brazil' AND type = 'country';

    -- Insert major cities
    INSERT INTO world_locations (name, type, parent_id, country_code, state_province, latitude, longitude, population) VALUES
    -- US Cities
    ('New York', 'city', us_id, 'US', 'New York', 40.7128, -74.0060, 8400000),
    ('Los Angeles', 'city', us_id, 'US', 'California', 34.0522, -118.2437, 4000000),
    ('Chicago', 'city', us_id, 'US', 'Illinois', 41.8781, -87.6298, 2700000),
    ('Houston', 'city', us_id, 'US', 'Texas', 29.7604, -95.3698, 2300000),
    ('Phoenix', 'city', us_id, 'US', 'Arizona', 33.4484, -112.0740, 1700000),
    ('Philadelphia', 'city', us_id, 'US', 'Pennsylvania', 39.9526, -75.1652, 1600000),
    ('San Antonio', 'city', us_id, 'US', 'Texas', 29.4241, -98.4936, 1500000),
    ('San Diego', 'city', us_id, 'US', 'California', 32.7157, -117.1611, 1400000),
    ('Dallas', 'city', us_id, 'US', 'Texas', 32.7767, -96.7970, 1300000),
    ('San Jose', 'city', us_id, 'US', 'California', 37.3382, -121.8863, 1000000),
    
    -- UK Cities
    ('London', 'city', uk_id, 'GB', 'England', 51.5074, -0.1278, 9000000),
    ('Birmingham', 'city', uk_id, 'GB', 'England', 52.4862, -1.8904, 1100000),
    ('Manchester', 'city', uk_id, 'GB', 'England', 53.4808, -2.2426, 550000),
    ('Glasgow', 'city', uk_id, 'GB', 'Scotland', 55.8642, -4.2518, 635000),
    ('Liverpool', 'city', uk_id, 'GB', 'England', 53.4084, -2.9916, 500000),
    
    -- Canadian Cities
    ('Toronto', 'city', ca_id, 'CA', 'Ontario', 43.6532, -79.3832, 2930000),
    ('Montreal', 'city', ca_id, 'CA', 'Quebec', 45.5017, -73.5673, 1780000),
    ('Vancouver', 'city', ca_id, 'CA', 'British Columbia', 49.2827, -123.1207, 675000),
    ('Calgary', 'city', ca_id, 'CA', 'Alberta', 51.0447, -114.0719, 1340000),
    ('Ottawa', 'city', ca_id, 'CA', 'Ontario', 45.4215, -75.6972, 995000),
    
    -- Australian Cities
    ('Sydney', 'city', au_id, 'AU', 'New South Wales', -33.8688, 151.2093, 5300000),
    ('Melbourne', 'city', au_id, 'AU', 'Victoria', -37.8136, 144.9631, 5100000),
    ('Brisbane', 'city', au_id, 'AU', 'Queensland', -27.4698, 153.0251, 2560000),
    ('Perth', 'city', au_id, 'AU', 'Western Australia', -31.9505, 115.8605, 2140000),
    ('Adelaide', 'city', au_id, 'AU', 'South Australia', -34.9285, 138.6007, 1380000),
    
    -- German Cities
    ('Berlin', 'city', de_id, 'DE', 'Berlin', 52.5200, 13.4050, 3700000),
    ('Hamburg', 'city', de_id, 'DE', 'Hamburg', 53.5511, 9.9937, 1900000),
    ('Munich', 'city', de_id, 'DE', 'Bavaria', 48.1351, 11.5820, 1500000),
    ('Cologne', 'city', de_id, 'DE', 'North Rhine-Westphalia', 50.9375, 6.9603, 1100000),
    ('Frankfurt', 'city', de_id, 'DE', 'Hesse', 50.1109, 8.6821, 750000),
    
    -- French Cities
    ('Paris', 'city', fr_id, 'FR', 'Île-de-France', 48.8566, 2.3522, 2200000),
    ('Marseille', 'city', fr_id, 'FR', 'Provence-Alpes-Côte d''Azur', 43.2965, 5.3698, 870000),
    ('Lyon', 'city', fr_id, 'FR', 'Auvergne-Rhône-Alpes', 45.7640, 4.8357, 520000),
    ('Toulouse', 'city', fr_id, 'FR', 'Occitanie', 43.6047, 1.4442, 480000),
    ('Nice', 'city', fr_id, 'FR', 'Provence-Alpes-Côte d''Azur', 43.7102, 7.2620, 340000),
    
    -- Indian Cities
    ('Mumbai', 'city', in_id, 'IN', 'Maharashtra', 19.0760, 72.8777, 20400000),
    ('Delhi', 'city', in_id, 'IN', 'Delhi', 28.7041, 77.1025, 32900000),
    ('Bangalore', 'city', in_id, 'IN', 'Karnataka', 12.9716, 77.5946, 12300000),
    ('Hyderabad', 'city', in_id, 'IN', 'Telangana', 17.3850, 78.4867, 10000000),
    ('Chennai', 'city', in_id, 'IN', 'Tamil Nadu', 13.0827, 80.2707, 11000000),
    ('Kolkata', 'city', in_id, 'IN', 'West Bengal', 22.5726, 88.3639, 14900000),
    ('Pune', 'city', in_id, 'IN', 'Maharashtra', 18.5204, 73.8567, 7400000),
    
    -- Chinese Cities
    ('Beijing', 'city', cn_id, 'CN', 'Beijing', 39.9042, 116.4074, 21500000),
    ('Shanghai', 'city', cn_id, 'CN', 'Shanghai', 31.2304, 121.4737, 27100000),
    ('Guangzhou', 'city', cn_id, 'CN', 'Guangdong', 23.1291, 113.2644, 15300000),
    ('Shenzhen', 'city', cn_id, 'CN', 'Guangdong', 22.5431, 114.0579, 17500000),
    ('Chengdu', 'city', cn_id, 'CN', 'Sichuan', 30.5728, 104.0668, 20900000),
    
    -- Japanese Cities
    ('Tokyo', 'city', jp_id, 'JP', 'Tokyo', 35.6762, 139.6503, 37400000),
    ('Osaka', 'city', jp_id, 'JP', 'Osaka', 34.6937, 135.5023, 19300000),
    ('Nagoya', 'city', jp_id, 'JP', 'Aichi', 35.1815, 136.9066, 10100000),
    ('Sapporo', 'city', jp_id, 'JP', 'Hokkaido', 43.0642, 141.3469, 2700000),
    ('Fukuoka', 'city', jp_id, 'JP', 'Fukuoka', 33.5904, 130.4017, 2600000),
    
    -- Brazilian Cities
    ('São Paulo', 'city', br_id, 'BR', 'São Paulo', -23.5558, -46.6396, 22400000),
    ('Rio de Janeiro', 'city', br_id, 'BR', 'Rio de Janeiro', -22.9068, -43.1729, 13700000),
    ('Brasília', 'city', br_id, 'BR', 'Federal District', -15.8267, -47.9218, 3100000),
    ('Salvador', 'city', br_id, 'BR', 'Bahia', -12.9714, -38.5014, 2900000),
    ('Fortaleza', 'city', br_id, 'BR', 'Ceará', -3.7319, -38.5267, 2700000);
END $$;