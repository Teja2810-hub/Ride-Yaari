/*
  # Add function to check user existence by email

  1. New Function
    - `get_user_id_by_email` - Get user ID from email address
    - Used for validating user existence before password reset

  2. Security
    - Function uses SECURITY DEFINER to access auth schema
    - Only returns user ID, not sensitive information
*/

-- Function to get user ID by email address
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_param text)
RETURNS uuid AS $$
DECLARE
  user_id_result uuid;
BEGIN
  -- Query auth.users table to find user by email
  SELECT id INTO user_id_result
  FROM auth.users
  WHERE email = email_param
  LIMIT 1;
  
  RETURN user_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;