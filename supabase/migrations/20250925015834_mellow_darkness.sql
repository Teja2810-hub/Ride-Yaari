```sql
-- Create a system user profile for SYSTEM_USER_ID
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
ON CONFLICT (id) DO NOTHING; -- Do nothing if the system user already exists
```