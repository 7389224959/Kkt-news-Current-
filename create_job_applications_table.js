import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
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
    `
  });
  console.log(data, error);
}

run();
