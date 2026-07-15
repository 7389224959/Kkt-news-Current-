import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, content')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  console.log(`Found ${articles.length} articles`);
  for (const article of articles) {
    if (article.content && article.content.includes('<!-- additionalImages:')) {
      const newContent = article.content.replace(/<!-- additionalImages:[\s\S]*?-->/g, '');
      const { error: updateError } = await supabase
        .from('articles')
        .update({ content: newContent })
        .eq('id', article.id);
      
      if (updateError) {
        console.error(`Error updating article ${article.id}:`, updateError);
      } else {
        console.log(`Updated article ${article.id}`);
      }
    } else {
        console.log(`Article ${article.id} skipped, no additionalImages comment`);
    }
  }
}

run();
