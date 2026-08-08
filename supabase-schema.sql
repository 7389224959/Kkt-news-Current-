-- ========================================================
-- KHABAR KAL TAK (KKT NEWS) - COMPLETE SUPABASE SCHEMA
-- Execute this script in your NEW Supabase SQL Editor
-- ========================================================

-- 1. Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT,
  image TEXT,
  "featuredCollageImage" TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  excerpt TEXT,
  date TEXT,
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "sourceUrl" TEXT,
  "isBreaking" BOOLEAN DEFAULT false,
  "isTrending" BOOLEAN DEFAULT false,
  "isFeatured" BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  "initialLikes" INTEGER DEFAULT 0,
  tags TEXT[],
  "imageCaption" TEXT,
  "seoTitle" TEXT,
  "metaDescription" TEXT,
  "facebookCaption" TEXT
);

-- 2. Breaking News Table
CREATE TABLE IF NOT EXISTS breaking_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trending Keywords Table
CREATE TABLE IF NOT EXISTS trending_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  article_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "appName" TEXT,
  tagline TEXT,
  description TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  address TEXT,
  socials JSONB,
  "tickerSpeed" INTEGER,
  "reelTemplates" JSONB,
  "viralTemplates" JSONB,
  "adminPhoto" TEXT,
  "adminDesignation" TEXT,
  "autoTemplateIndex" INTEGER,
  "autoReelTemplateIndex" INTEGER,
  "anchorSettings" JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  password TEXT,
  name TEXT NOT NULL,
  designation TEXT,
  rank TEXT,
  points INTEGER DEFAULT 0,
  "totalPoints" INTEGER DEFAULT 1000,
  "walletBalance" TEXT,
  photo TEXT,
  "isActive" BOOLEAN DEFAULT true,
  email TEXT,
  mobile TEXT
);

-- 6. Worker Tasks Table
CREATE TABLE IF NOT EXISTS worker_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reward TEXT,
  date TEXT,
  status TEXT,
  "assignedTo" TEXT
);

-- 7. Worker Assets Table
CREATE TABLE IF NOT EXISTS worker_assets (
  id TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Clients Table
CREATE TABLE IF NOT EXISTS clients (
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

-- 9. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  whatsapp_number TEXT,
  district TEXT,
  city TEXT,
  age INTEGER,
  education TEXT,
  experience TEXT,
  vehicle_available TEXT,
  reason_to_join TEXT,
  id_card_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security (RLS) for direct REST API access
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_news DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- Storage Bucket Setup for news-images (if Storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for news-images bucket
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');
    CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'news-images');
    CREATE POLICY "Public Update Access" ON storage.objects FOR UPDATE USING (bucket_id = 'news-images');
    CREATE POLICY "Public Delete Access" ON storage.objects FOR DELETE USING (bucket_id = 'news-images');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Policies might already exist
  NULL;
END $$;

