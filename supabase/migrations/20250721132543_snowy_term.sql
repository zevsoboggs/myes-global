/*
  # Add function to increment property views

  1. New Function
    - `increment_property_views` function to safely increment view count
    - Prevents race conditions when multiple users view the same property

  2. Security
    - Function is accessible to all users (including anonymous)
    - Only increments views for active properties
*/

-- Function to increment property views
CREATE OR REPLACE FUNCTION increment_property_views(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE properties 
  SET views_count = views_count + 1 
  WHERE id = property_id AND is_active = true;
END;
$$;