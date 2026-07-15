import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, additionalImages')
    .order('created_at', { ascending: false })
    .limit(1);
  console.log(articles, error);
}
run();
