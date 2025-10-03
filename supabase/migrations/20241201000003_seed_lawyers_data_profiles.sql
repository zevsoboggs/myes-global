-- Insert specializations first
INSERT INTO lawyer_specializations (id, name, name_ru, description, icon) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Real Estate Law', 'Недвижимость', 'Property transactions, contracts, and disputes', 'Home'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Crypto Law', 'Криптовалюты', 'Cryptocurrency transactions and regulations', 'Bitcoin'),
  ('550e8400-e29b-41d4-a716-446655440003', 'International Law', 'Международное право', 'Cross-border legal matters', 'Globe'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Contract Law', 'Договорное право', 'Legal contracts and agreements', 'FileText'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Corporate Law', 'Корпоративное право', 'Business and corporate legal matters', 'Building'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Tax Law', 'Налоговое право', 'Tax planning and compliance', 'Calculator'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Immigration Law', 'Иммиграционное право', 'Visa and immigration matters', 'Plane'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Investment Law', 'Инвестиционное право', 'Investment regulations and compliance', 'TrendingUp')
ON CONFLICT (id) DO NOTHING;

-- Insert sample lawyers into profiles table
INSERT INTO profiles (id, full_name, email, phone, bio, role, agency_name, license_number, years_of_experience, hourly_rate, commission_rate, avatar_url, is_verified, location_city, location_country, languages, created_at) VALUES
  (
    '550e8400-e29b-41d4-a716-446655441001',
    'Sarah Johnson',
    'sarah.johnson@lexlaw.com',
    '+1-555-0101',
    'Experienced real estate attorney with over 12 years of practice. Specialized in international property transactions and cryptocurrency-based real estate deals. Fluent in English and Spanish.',
    'lawyer',
    'LexLaw International',
    'NY-BAR-2012-5501',
    12,
    350.00,
    0.045,
    'https://images.unsplash.com/photo-1494790108755-2616b612b691?w=150&h=150&fit=crop&crop=face',
    true,
    'New York',
    'USA',
    ARRAY['en', 'es'],
    '2024-01-01 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441002',
    'Dr. Michael Chen',
    'm.chen@globallaw.sg',
    '+65-9876-5432',
    'International law expert specializing in crypto regulations and cross-border real estate transactions. PhD in International Business Law from Singapore University.',
    'lawyer',
    'Global Law Associates',
    'SG-BAR-2015-1205',
    9,
    420.00,
    0.040,
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    true,
    'Singapore',
    'Singapore',
    ARRAY['en', 'zh', 'ms'],
    '2024-01-02 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441003',
    'Elena Rodriguez',
    'elena@madridlaw.es',
    '+34-612-345-678',
    'Senior partner at Madrid Law Firm with expertise in European real estate law and international property investment. Regular speaker at legal conferences.',
    'lawyer',
    'Madrid Legal Partners',
    'ES-BAR-2010-3401',
    14,
    380.00,
    0.050,
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    true,
    'Madrid',
    'Spain',
    ARRAY['es', 'en', 'fr'],
    '2024-01-03 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441004',
    'James Wilson',
    'james.wilson@londonlaw.co.uk',
    '+44-20-7123-4567',
    'Leading barrister in property law and cryptocurrency regulations. Chambers experience with high-value international real estate transactions.',
    'lawyer',
    'Wilson & Associates Chambers',
    'UK-BAR-2013-7701',
    11,
    450.00,
    0.035,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    true,
    'London',
    'UK',
    ARRAY['en', 'fr'],
    '2024-01-04 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441005',
    'Anna Kowalski',
    'anna@warsawlaw.pl',
    '+48-22-123-4567',
    'Corporate lawyer with focus on real estate development and international investments. Extensive experience with EU property regulations.',
    'lawyer',
    'Warsaw Corporate Law',
    'PL-BAR-2014-0205',
    10,
    280.00,
    0.055,
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    true,
    'Warsaw',
    'Poland',
    ARRAY['pl', 'en', 'de'],
    '2024-01-05 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441006',
    'Hiroshi Tanaka',
    'h.tanaka@tokyolaw.jp',
    '+81-3-1234-5678',
    'Expert in international real estate law with particular focus on foreign investment in Japanese property markets. Former legal counsel at major real estate firm.',
    'lawyer',
    'Tokyo International Law',
    'JP-BAR-2016-1101',
    8,
    390.00,
    0.048,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    true,
    'Tokyo',
    'Japan',
    ARRAY['ja', 'en'],
    '2024-01-06 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441007',
    'Sophie Dubois',
    'sophie@parislegal.fr',
    '+33-1-23-45-67-89',
    'Specialized in luxury real estate transactions and international property law. Regular consultant for high-net-worth individuals and property developers.',
    'lawyer',
    'Dubois Legal Conseil',
    'FR-BAR-2011-7505',
    13,
    480.00,
    0.042,
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    true,
    'Paris',
    'France',
    ARRAY['fr', 'en', 'es'],
    '2024-01-07 10:00:00+00'
  ),
  (
    '550e8400-e29b-41d4-a716-446655441008',
    'Marco Rossi',
    'marco@milanolaw.it',
    '+39-02-1234-567',
    'Senior counsel specializing in Italian real estate law and European property investments. Former prosecutor with deep understanding of property regulations.',
    'lawyer',
    'Milano Legal Group',
    'IT-BAR-2012-2009',
    12,
    360.00,
    0.047,
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    false,
    'Milan',
    'Italy',
    ARRAY['it', 'en'],
    '2024-01-08 10:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Link lawyers with specializations
INSERT INTO lawyer_specialization_links (lawyer_id, specialization_id) VALUES
  -- Sarah Johnson: Real Estate, Crypto, International
  ('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655440003'),

  -- Michael Chen: Crypto, International, Corporate
  ('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655440005'),

  -- Elena Rodriguez: Real Estate, International, Investment
  ('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655441003', '550e8400-e29b-41d4-a716-446655440008'),

  -- James Wilson: Real Estate, Crypto, Contract
  ('550e8400-e29b-41d4-a716-446655441004', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441004', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655441004', '550e8400-e29b-41d4-a716-446655440004'),

  -- Anna Kowalski: Real Estate, Corporate, Contract
  ('550e8400-e29b-41d4-a716-446655441005', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441005', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655441005', '550e8400-e29b-41d4-a716-446655440004'),

  -- Hiroshi Tanaka: Real Estate, International, Investment
  ('550e8400-e29b-41d4-a716-446655441006', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441006', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655441006', '550e8400-e29b-41d4-a716-446655440008'),

  -- Sophie Dubois: Real Estate, International, Tax
  ('550e8400-e29b-41d4-a716-446655441007', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441007', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655441007', '550e8400-e29b-41d4-a716-446655440006'),

  -- Marco Rossi: Real Estate, Corporate, Contract
  ('550e8400-e29b-41d4-a716-446655441008', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655441008', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655441008', '550e8400-e29b-41d4-a716-446655440004')
ON CONFLICT (lawyer_id, specialization_id) DO NOTHING;

-- Insert realistic reviews
INSERT INTO lawyer_reviews (lawyer_id, reviewer_name, rating, title, comment, case_type, is_verified, created_at) VALUES
  -- Reviews for Sarah Johnson
  ('550e8400-e29b-41d4-a716-446655441001', 'David Thompson', 5, 'Exceptional Service', 'Sarah handled our international property purchase flawlessly. Her expertise in crypto transactions was invaluable. Highly professional and responsive throughout the entire process.', 'International Property Purchase', true, '2024-01-15 10:30:00+00'),
  ('550e8400-e29b-41d4-a716-446655441001', 'Maria Garcia', 5, 'Outstanding Legal Work', 'Excellent communication and deep knowledge of real estate law. Made a complex deal simple to understand. Would definitely use her services again.', 'Real Estate Transaction', true, '2024-02-03 14:20:00+00'),
  ('550e8400-e29b-41d4-a716-446655441001', 'Robert Kim', 4, 'Professional and Knowledgeable', 'Great experience working with Sarah. She was thorough and detail-oriented. Only minor delay in documentation but overall very satisfied.', 'Property Contract Review', false, '2024-02-18 09:45:00+00'),
  ('550e8400-e29b-41d4-a716-446655441001', 'Lisa Brown', 5, 'Highly Recommend', 'Sarah went above and beyond to ensure our crypto-based property deal was secure and legally sound. Exceptional lawyer!', 'Crypto Property Purchase', true, '2024-03-02 16:15:00+00'),
  ('550e8400-e29b-41d4-a716-446655441001', 'Ahmed Al-Rashid', 5, 'Expert in International Law', 'Handled our cross-border real estate investment with great expertise. Very knowledgeable about international regulations.', 'International Investment', true, '2024-03-10 11:30:00+00'),

  -- Reviews for Michael Chen
  ('550e8400-e29b-41d4-a716-446655441002', 'Jennifer Lee', 5, 'Crypto Law Expert', 'Dr. Chen is incredibly knowledgeable about cryptocurrency regulations. Helped us navigate complex compliance requirements with ease.', 'Crypto Compliance', true, '2024-01-22 13:40:00+00'),
  ('550e8400-e29b-41d4-a716-446655441002', 'Thomas Wilson', 4, 'Very Professional', 'Solid legal advice and good communication. Helped with our Singapore property investment. Would recommend to others.', 'Property Investment', false, '2024-02-07 10:20:00+00'),
  ('550e8400-e29b-41d4-a716-446655441002', 'Anna Petrov', 5, 'Exceptional Service', 'Outstanding work on our international business setup. Dr. Chen made complex regulations understandable and manageable.', 'Corporate Setup', true, '2024-02-25 15:50:00+00'),
  ('550e8400-e29b-41d4-a716-446655441002', 'Carlos Rodriguez', 5, 'Highly Skilled', 'Great expertise in both corporate and crypto law. Helped us structure our investment properly and efficiently.', 'Investment Structure', true, '2024-03-08 12:10:00+00'),

  -- Reviews for Elena Rodriguez
  ('550e8400-e29b-41d4-a716-446655441003', 'Paul Anderson', 5, 'Excellent European Law Expert', 'Elena helped us with a complex multi-country property deal. Her knowledge of European regulations is outstanding.', 'European Property Deal', true, '2024-01-28 14:25:00+00'),
  ('550e8400-e29b-41d4-a716-446655441003', 'Sophie Martin', 4, 'Great Legal Support', 'Professional service with good attention to detail. Elena made our Spanish property purchase smooth and worry-free.', 'Spanish Property Purchase', false, '2024-02-12 11:40:00+00'),
  ('550e8400-e29b-41d4-a716-446655441003', 'Michael O''Connor', 5, 'Top-tier Service', 'Incredible expertise in international property law. Elena saved us from potential legal issues and guided us perfectly.', 'International Property', true, '2024-02-28 16:30:00+00'),
  ('550e8400-e29b-41d4-a716-446655441003', 'Yuki Tanaka', 5, 'Highly Recommended', 'Elena handled our European investment portfolio setup brilliantly. Very responsive and knowledgeable.', 'Investment Portfolio', true, '2024-03-15 09:20:00+00'),

  -- Reviews for James Wilson
  ('550e8400-e29b-41d4-a716-446655441004', 'Emma Thompson', 5, 'Outstanding Barrister', 'James provided exceptional legal counsel for our London property acquisition. His crypto expertise was particularly valuable.', 'London Property Purchase', true, '2024-01-18 12:15:00+00'),
  ('550e8400-e29b-41d4-a716-446655441004', 'Oliver Singh', 4, 'Professional Service', 'Good experience overall. James was thorough and professional. Would use his services again for future transactions.', 'Contract Review', false, '2024-02-10 15:45:00+00'),
  ('550e8400-e29b-41d4-a716-446655441004', 'Rachel Green', 5, 'Excellent Legal Work', 'James handled our complex property dispute with great skill. His chambers experience really showed in his approach.', 'Property Dispute', true, '2024-03-05 13:25:00+00'),

  -- Reviews for Anna Kowalski
  ('550e8400-e29b-41d4-a716-446655441005', 'Franz Mueller', 4, 'Solid Corporate Lawyer', 'Anna helped us with our Polish property development project. Good understanding of local regulations and EU law.', 'Property Development', false, '2024-02-01 10:30:00+00'),
  ('550e8400-e29b-41d4-a716-446655441005', 'Isabella Santos', 5, 'Great Service', 'Excellent work on our real estate investment in Warsaw. Anna was very responsive and professional throughout.', 'Real Estate Investment', true, '2024-02-20 14:15:00+00'),
  ('550e8400-e29b-41d4-a716-446655441005', 'Henrik Larsson', 5, 'Highly Professional', 'Anna provided outstanding legal support for our corporate property acquisition. Very knowledgeable about Polish law.', 'Corporate Acquisition', true, '2024-03-12 11:50:00+00'),

  -- Reviews for Hiroshi Tanaka
  ('550e8400-e29b-41d4-a716-446655441006', 'Sarah Mitchell', 5, 'Excellent Japanese Law Expert', 'Hiroshi made our Tokyo property purchase seamless. His expertise in foreign investment regulations was invaluable.', 'Tokyo Property Purchase', true, '2024-02-14 16:20:00+00'),
  ('550e8400-e29b-41d4-a716-446655441006', 'Daniel Park', 4, 'Good Legal Counsel', 'Professional service and good communication. Hiroshi helped us understand the Japanese property market regulations.', 'Property Investment Advice', false, '2024-03-01 12:40:00+00'),
  ('550e8400-e29b-41d4-a716-446655441006', 'Linda Chen', 5, 'Outstanding Work', 'Hiroshi handled our international property investment with great care and expertise. Highly recommend his services.', 'International Investment', true, '2024-03-18 15:10:00+00'),

  -- Reviews for Sophie Dubois
  ('550e8400-e29b-41d4-a716-446655441007', 'Alexander Volkov', 5, 'Luxury Property Expert', 'Sophie handled our Paris luxury property acquisition perfectly. Her attention to detail and legal expertise are exceptional.', 'Luxury Property Purchase', true, '2024-01-25 11:30:00+00'),
  ('550e8400-e29b-41d4-a716-446655441007', 'Victoria Rose', 5, 'Exceptional Service', 'Outstanding legal work on our French property investment. Sophie made everything smooth and professional.', 'Property Investment', true, '2024-02-16 14:45:00+00'),
  ('550e8400-e29b-41d4-a716-446655441007', 'James Miller', 4, 'Professional Lawyer', 'Good service overall. Sophie was knowledgeable about French property law and provided solid legal advice.', 'Property Law Consultation', false, '2024-03-07 10:15:00+00'),

  -- Reviews for Marco Rossi
  ('550e8400-e29b-41d4-a716-446655441008', 'Elena Bianchi', 4, 'Good Italian Lawyer', 'Marco provided good legal service for our Milan property purchase. Professional and knowledgeable about local regulations.', 'Milan Property Purchase', false, '2024-02-22 13:20:00+00'),
  ('550e8400-e29b-41d4-a716-446655441008', 'Antonio Costa', 4, 'Solid Legal Work', 'Decent service for our corporate property deal. Marco was thorough and provided good legal guidance.', 'Corporate Property Deal', false, '2024-03-14 16:35:00+00')
ON CONFLICT (id) DO NOTHING;

-- Create initial stats with random case numbers for demonstration
INSERT INTO lawyer_stats (lawyer_id, total_cases, success_rate) VALUES
  ('550e8400-e29b-41d4-a716-446655441001', 78, 95.5),
  ('550e8400-e29b-41d4-a716-446655441002', 65, 92.3),
  ('550e8400-e29b-41d4-a716-446655441003', 102, 94.1),
  ('550e8400-e29b-41d4-a716-446655441004', 87, 96.6),
  ('550e8400-e29b-41d4-a716-446655441005', 56, 91.1),
  ('550e8400-e29b-41d4-a716-446655441006', 43, 88.4),
  ('550e8400-e29b-41d4-a716-446655441007', 95, 97.9),
  ('550e8400-e29b-41d4-a716-446655441008', 71, 89.9)
ON CONFLICT (lawyer_id) DO UPDATE SET
  total_cases = EXCLUDED.total_cases,
  success_rate = EXCLUDED.success_rate;

-- Update lawyer stats for all lawyers to get accurate review counts
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441001');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441002');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441003');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441004');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441005');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441006');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441007');
SELECT update_lawyer_stats('550e8400-e29b-41d4-a716-446655441008');