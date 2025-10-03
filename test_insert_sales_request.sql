-- Создаем sales_request для юриста с точными данными из conversation

INSERT INTO sales_requests (
  property_id,
  buyer_id,
  realtor_id,
  lawyer_id,
  status,
  sale_price_usdt,
  created_at
) VALUES (
  '1bec2981-9bf5-49b1-b69a-83033a7ee98a', -- property_id из conversation
  '34b904ba-42e8-4ecd-946c-738990cdc387', -- buyer_id из conversation
  'f1ed02d2-8d3a-414e-823d-908304057d32', -- realtor_id из conversation
  'e0eb882d-127f-443c-9679-227294649cac', -- lawyer user id
  'pending',
  100000.00,
  NOW()
) ON CONFLICT DO NOTHING;