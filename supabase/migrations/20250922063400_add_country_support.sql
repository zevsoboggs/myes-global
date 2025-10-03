-- Добавляем поддержку стран для объектов недвижимости

-- Добавляем поле country_code в таблицу properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'ZA' CHECK (country_code IN ('ZA', 'TH', 'EG', 'GR', 'VN', 'ID'));

-- Создаем индекс для фильтрации по стране
CREATE INDEX IF NOT EXISTS idx_properties_country_code ON properties(country_code);

-- Комментарий для ясности
COMMENT ON COLUMN properties.country_code IS 'Код страны для объекта недвижимости: ZA=ЮАР, TH=Таиланд, EG=Египет, GR=Греция, VN=Вьетнам, ID=Индонезия';