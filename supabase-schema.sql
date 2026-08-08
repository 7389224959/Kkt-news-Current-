-- Create workers table
CREATE TABLE workers (
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

-- Create worker_tasks table
CREATE TABLE worker_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reward TEXT,
  date TEXT,
  status TEXT,
  "assignedTo" TEXT
);

-- Create worker_assets table
CREATE TABLE worker_assets (
  id TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table
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

-- Optional: Disable RLS for easy testing or add policies if you have authentication
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
