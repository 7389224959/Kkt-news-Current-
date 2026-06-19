import { supabase } from './services/supabase.js';

async function check() {
  const { data, error } = await supabase.from('articles').select('*').limit(1);
  if (error) console.error(error);
  else console.log("Columns:", Object.keys(data[0] || {}).join(', '));
}
check();
