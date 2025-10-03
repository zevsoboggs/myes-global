-- Create test sales request for lawyer to test chat functionality

-- Insert test sales request for conversation d8cf74a7-5cdf-4fce-9b35-21e0d8fd0ef4
INSERT INTO sales_requests (
  property_id,
  buyer_id,
  realtor_id,
  lawyer_id,
  status,
  sale_price_usdt,
  created_at
) VALUES (
  '1bec2981-9bf5-49b1-b69a-83033a7ee98a', -- property_id from conversation
  '34b904ba-42e8-4ecd-946c-738990cdc387', -- buyer_id from conversation
  'f1ed02d2-8d3a-414e-823d-908304057d32', -- realtor_id from conversation
  'e0eb882d-127f-443c-9679-227294649cac', -- lawyer user id
  'pending',
  100000.00,
  NOW()
);

-- Insert test sales request for conversation c630ec7d-63a8-4ffa-8511-71ec61063336
INSERT INTO sales_requests (
  property_id,
  buyer_id,
  realtor_id,
  lawyer_id,
  status,
  sale_price_usdt,
  created_at
) VALUES (
  '3e524f56-1399-429c-acf4-6541ba5f8efc', -- property_id from conversation
  'e480af5d-02b9-4507-93ad-375c911ac517', -- buyer_id from conversation
  'f1ed02d2-8d3a-414e-823d-908304057d32', -- realtor_id from conversation
  'e0eb882d-127f-443c-9679-227294649cac', -- lawyer user id
  'pending',
  150000.00,
  NOW()
);