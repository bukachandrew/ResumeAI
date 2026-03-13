-- Запусти этот SQL в Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE news (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Разрешаем чтение для anon-ключа
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON news FOR SELECT USING (true);

-- Заполняем данными
INSERT INTO news (title) VALUES
  ('Запуск нового сайта на Next.js'),
  ('Supabase — лучшая альтернатива Firebase'),
  ('Обновление платформы до версии 2.0'),
  ('Команда выросла: встречайте новых разработчиков'),
  ('Релиз мобильного приложения');
