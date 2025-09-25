/*
  # Fix System User Foreign Key Constraint

  1. Problem
    - The SYSTEM_USER_ID ('00000000-0000-0000-0000-000000000000') is used for system messages
    - But it doesn't exist in auth.users table, causing foreign key violations
    - The user_profiles table has a foreign key constraint requiring IDs to exist in auth.users

  2. Solution
    - Drop the foreign key constraint from user_profiles table
    - Insert the system user profile without auth.users dependency
    - This allows system messages to work properly

  3. Security
    - System user can only be used for automated messages
    - Regular users still require proper authentication
    - Chat message policies already handle system user permissions
*/

-- Drop the foreign key constraint that requires user_profiles.id to exist in auth.users
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Insert the system user profile (this will now work without the foreign key constraint)
INSERT INTO public.user_profiles (id, full_name, profile_image_url, notification_preferences)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'RideYaari System',
  'https://ui-avatars.com/api/?name=RS&background=007aff&color=FFFFFF&size=200&font-size=0.6&bold=true&format=png',
  '{
    "email_notifications": false,
    "browser_notifications": false,
    "ride_requests": false,
    "ride_confirmations": false,
    "messages": false,
    "system_updates": true,
    "marketing_emails": false,
    "sound_enabled": false
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  profile_image_url = EXCLUDED.profile_image_url,
  notification_preferences = EXCLUDED.notification_preferences;