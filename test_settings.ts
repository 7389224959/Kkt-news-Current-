import { supabase } from './services/supabase.js';

async function test() {
  const { data, error } = await supabase.from('site_settings').select('*').limit(1);
  console.log(data, error);
}

test();
