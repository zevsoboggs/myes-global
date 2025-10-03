/*
  # Создание схемы базы данных для платформы недвижимости

  1. Таблицы
    - `profiles` - Профили пользователей (риелторы)
    - `properties` - Объекты недвижимости  
    - `property_images` - Изображения недвижимости
    - `favorites` - Избранные объекты
    - `verification_requests` - Запросы на верификацию

  2. Безопасность
    - RLS включена для всех таблиц
    - Политики для доступа к данным
*/

-- Расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Профили пользователей
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  agency_name text,
  license_number text,
  is_verified boolean DEFAULT false,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Объекты недвижимости
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price_usdt numeric NOT NULL CHECK (price_usdt > 0),
  property_type text NOT NULL CHECK (property_type IN ('apartment', 'house', 'villa', 'commercial', 'land')),
  bedrooms integer CHECK (bedrooms >= 0),
  bathrooms numeric CHECK (bathrooms >= 0),
  area_sqm numeric NOT NULL CHECK (area_sqm > 0),
  address text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  features text[], -- ['parking', 'pool', 'garden', 'security', 'gym']
  is_active boolean DEFAULT true,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Изображения недвижимости
CREATE TABLE IF NOT EXISTS property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Избранное
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, property_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Запросы на верификацию
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Политики безопасности

-- Profiles policies
CREATE POLICY "Пользователи могут читать все профили"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Пользователи могут обновлять свой профиль"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Пользователи могут создавать свой профиль"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Properties policies
CREATE POLICY "Все могут читать активные объекты"
  ON properties FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Риелторы могут создавать объекты"
  ON properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = realtor_id);

CREATE POLICY "Риелторы могут обновлять свои объекты"
  ON properties FOR UPDATE TO authenticated USING (auth.uid() = realtor_id);

CREATE POLICY "Риелторы могут удалять свои объекты"
  ON properties FOR DELETE TO authenticated USING (auth.uid() = realtor_id);

-- Property images policies
CREATE POLICY "Все могут видеть изображения"
  ON property_images FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Владельцы объектов могут добавлять изображения"
  ON property_images FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE id = property_id AND realtor_id = auth.uid()
    )
  );

CREATE POLICY "Владельцы объектов могут удалять изображения"
  ON property_images FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE id = property_id AND realtor_id = auth.uid()
    )
  );

-- Favorites policies
CREATE POLICY "Пользователи могут управлять своим избранным"
  ON favorites FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Verification requests policies
CREATE POLICY "Пользователи могут читать свои запросы"
  ON verification_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать запросы"
  ON verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_properties_realtor_id ON properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price_usdt);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_property ON favorites(user_id, property_id);

-- Функция для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();