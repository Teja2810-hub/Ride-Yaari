/*
  # Create reviews table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `reviewer_name` (text, required)
      - `reviewer_email` (text, optional)
      - `rating` (integer, 1-5, required)
      - `review_content` (text, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for authenticated users to insert reviews
    - Add policy for public read access to reviews

  3. Sample Data
    - Insert 5 dummy reviews to get started
*/

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  reviewer_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow public read access to reviews"
ON public.reviews FOR SELECT
TO public
USING (true);

-- Insert dummy reviews
INSERT INTO public.reviews (reviewer_name, reviewer_email, rating, review_content) VALUES
('Alice Smith', 'alice.s@example.com', 5, 'RideYaari is amazing! Found a ride instantly and saved so much money. The platform is so easy to use and the community is fantastic. Highly recommend to all travelers!'),
('Bob Johnson', 'bob.j@example.com', 4, 'Great app for finding airport assistance. The chat feature is very useful and secure. Could use a few more users in my area, but overall excellent service.'),
('Charlie Brown', 'charlie.b@example.com', 5, 'Seamless experience posting my car ride. Got passengers quickly and the whole process was smooth. Love the concept and execution!'),
('Diana Prince', 'diana.p@example.com', 4, 'Really helpful for connecting with other travelers. The interface is clean and intuitive. Sometimes hard to find specific routes, but overall a solid platform.'),
('Eve Adams', 'eve.a@example.com', 5, 'The best travel companion app! So easy to use and connect with others. The safety features give me confidence. Five stars all the way!'),
('Frank Wilson', 'frank.w@example.com', 3, 'Good concept and decent execution. Found what I needed but took some time. Room for improvement but definitely useful.'),
('Grace Lee', 'grace.l@example.com', 5, 'Absolutely love RideYaari! Saved me hundreds on travel costs and met some great people. The airport trip feature is genius!'),
('Henry Davis', 'henry.d@example.com', 4, 'Very impressed with the platform. Clean design, good functionality. The messaging system works well for coordinating trips.');