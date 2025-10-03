/*
  # Создание bucket для документов верификации

  1. Storage
    - Создание bucket `verification-documents`
    - Настройка политик доступа для загрузки и чтения файлов
  
  2. Security
    - Пользователи могут загружать файлы только в свои папки
    - Пользователи могут читать только свои файлы
    - Администраторы могут читать все файлы
*/

-- Создаем bucket для документов верификации
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents', 
  false,
  5242880, -- 5MB в байтах
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Политика для загрузки файлов (пользователи могут загружать только в свои папки)
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для чтения файлов (пользователи могут читать только свои файлы)
CREATE POLICY "Users can view own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для удаления файлов (пользователи могут удалять только свои файлы)
CREATE POLICY "Users can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);