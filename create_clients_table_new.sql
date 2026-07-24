CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address TEXT NOT NULL,
  category TEXT NOT NULL,
  services TEXT NOT NULL,
  offer TEXT,
  facebook_link TEXT,
  instagram_link TEXT,
  google_link TEXT,
  logo_url TEXT,
  payment_screenshot_url TEXT,
  photos_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
