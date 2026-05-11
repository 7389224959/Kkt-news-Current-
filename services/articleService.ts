import { supabase } from './supabase';
import { Article, BreakingNews, SiteSettings, TrendingKeyword } from '../types';

/**
 * Fetch articles with pagination
 * @param page Current page number
 * @param limit Number of articles per page
 */
export const getArticles = async (page: number = 1, limit: number = 10): Promise<{ data: Article[], count: number }> => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data as Article[], count: count || 0 };
};

/**
 * Fetch a single article by its slug
 * @param slug The unique slug of the article
 */
export const getArticleBySlug = async (slug: string): Promise<Article | null> => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Article;
};

/**
 * Create a new article
 * @param article The article data to insert
 */
export const createArticle = async (article: Omit<Article, 'id'>): Promise<Article> => {
  try {
    const { seoTitle, metaDescription, facebookCaption, ...articleDbPayload } = article as any;
    const { data, error } = await supabase
      .from('articles')
      .insert([articleDbPayload])
      .select()
      .single();

    if (error) {
      // Handle duplicate slug error
      if (error.code === '23505' && error.message?.includes('articles_slug_key')) {
        console.warn("Supabase: Duplicate slug detected. Retrying with a new slug.");
        const newSlug = `${article.slug}-${Math.random().toString(36).substring(2, 7)}`;
        return await createArticle({ ...article, slug: newSlug });
      }

      // Handle missing columns error (author, created_at, etc.)
      if (error.message?.includes("does not exist") || error.message?.includes("Could not find the")) {
        const missingColumnMatch = error.message.match(/column "([^"]+)"/i) || error.message.match(/find the '([^']+)' column/i);
        const missingColumn = missingColumnMatch ? missingColumnMatch[1] : null;
        
        if (missingColumn) {
          console.warn(`Supabase: Column "${missingColumn}" missing in "articles" table. Retrying without it.`);
          const { [missingColumn]: _, ...articleWithoutColumn } = article as any;
          return await createArticle(articleWithoutColumn);
        }
      }
      throw error;
    }
    return data as Article;
  } catch (error) {
    console.error("Error in createArticle:", error);
    throw error;
  }
};

/**
 * Update an existing article
 * @param id The ID of the article to update
 * @param article The updated article data
 */
export const updateArticle = async (id: string, article: Partial<Article>): Promise<Article> => {
  try {
    const { seoTitle, metaDescription, facebookCaption, ...articleDbPayload } = article as any;
    const { data, error } = await supabase
      .from('articles')
      .update(articleDbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle missing columns error
      if (error.message?.includes("does not exist") || error.message?.includes("Could not find the")) {
        const missingColumnMatch = error.message.match(/column "([^"]+)"/i) || error.message.match(/find the '([^']+)' column/i);
        const missingColumn = missingColumnMatch ? missingColumnMatch[1] : null;
        
        if (missingColumn) {
          console.warn(`Supabase: Column "${missingColumn}" missing in "articles" table. Retrying without it.`);
          const { [missingColumn]: _, ...articleWithoutColumn } = article as any;
          return await updateArticle(id, articleWithoutColumn);
        }
      }
      throw error;
    }
    return data as Article;
  } catch (error) {
    console.error("Error in updateArticle:", error);
    throw error;
  }
};

/**
 * Delete an article
 * @param id The ID of the article to delete
 */
export const deleteArticle = async (id: string): Promise<void> => {
  console.log(`Attempting to delete article with ID: ${id}`);
  
  const { error, count } = await supabase
    .from('articles')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    console.error(`Supabase delete error for ID ${id}:`, error);
    throw error;
  }
  
  if (count === 0) {
    console.warn(`Supabase: No article found with ID: ${id} to delete. It may have already been deleted or the ID is incorrect.`);
    throw new Error("Article could not be deleted. It may not exist or you may not have permission (RLS policy).");
  } else {
    console.log(`Supabase: Successfully deleted ${count} article(s) with ID: ${id}`);
  }
};

/**
 * Helper to sort articles by date (client-side fallback)
 */
export const sortArticlesByDate = (articles: Article[]): Article[] => {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at || 0).getTime();
    const dateB = new Date(b.published_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });
};

// --- Settings & Breaking News ---

export const getBreakingNews = async (): Promise<BreakingNews[]> => {
  const { data, error } = await supabase
    .from('breaking_news')
    .select('*')
    .limit(20);
  if (error) throw error;
  return data as BreakingNews[];
};

export const saveBreakingNews = async (breakingNews: BreakingNews[]) => {
  console.log("Saving breaking news items:", breakingNews.length);
  
  const { error: deleteError } = await supabase
    .from('breaking_news')
    .delete()
    .not('text', 'is', null);
    
  if (deleteError) {
    console.error("Error deleting old breaking news:", deleteError);
  }

  if (breakingNews.length === 0) return [];

  const { data, error } = await supabase
    .from('breaking_news')
    .insert(breakingNews.map(item => ({ text: item.text })))
    .select();
    
  if (error) {
    console.error("Error inserting new breaking news:", error);
    if (error.message?.includes('violates row-level security policy')) {
      throw new Error("Supabase RLS Error: Please enable INSERT access for 'breaking_news' table in Supabase.");
    }
    throw error;
  }
  
  return data;
};

export const addBreakingNews = async (text: string): Promise<BreakingNews> => {
  const { data, error } = await supabase
    .from('breaking_news')
    .insert([{ text }])
    .select()
    .single();
    
  if (error) {
    console.error("Error inserting new breaking news:", error);
    if (error.message?.includes('violates row-level security policy')) {
      throw new Error("Supabase RLS Error: Please enable INSERT access for 'breaking_news' table in Supabase.");
    }
    throw error;
  }
  
  return data as BreakingNews;
};

export const deleteBreakingNews = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('breaking_news')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error("Error deleting breaking news:", error);
    if (error.message?.includes('violates row-level security policy')) {
      throw new Error("Supabase RLS Error: Please enable DELETE access for 'breaking_news' table in Supabase.");
    }
    throw error;
  }
};

export const getTrendingKeywords = async (): Promise<TrendingKeyword[]> => {
  const { data, error } = await supabase
    .from('trending_keywords')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TrendingKeyword[];
};

export const saveTrendingKeywords = async (keywords: TrendingKeyword[]) => {
  // Delete all existing
  await supabase.from('trending_keywords').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (keywords.length === 0) return;

  const { error } = await supabase
    .from('trending_keywords')
    .insert(keywords.map(k => ({ label: k.label, article_slug: k.articleSlug })));
    
  if (error) throw error;
};

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as SiteSettings;
};

export const saveSiteSettings = async (settings: SiteSettings): Promise<any> => {
  try {
    let targetId = (settings as any).id;
    
    if (!targetId) {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        targetId = existing.id;
      }
    }

    const payload = targetId ? { ...settings, id: targetId } : settings;

    const { data, error } = await supabase
      .from('site_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in saveSiteSettings:", error);
    throw error;
  }
};
