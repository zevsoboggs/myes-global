CREATE OR REPLACE FUNCTION public.get_active_booking(property_id uuid)
RETURNS timestamptz AS $$
DECLARE exp timestamptz;
BEGIN
  SELECT b.expires_at INTO exp
  FROM bookings b
  WHERE b.property_id = get_active_booking.property_id
    AND b.status = 'active'
    AND b.expires_at > now()
  ORDER BY b.expires_at DESC
  LIMIT 1;
  RETURN exp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Разрешаем вызов функции всем
GRANT EXECUTE ON FUNCTION public.get_active_booking(uuid) TO anon, authenticated; 