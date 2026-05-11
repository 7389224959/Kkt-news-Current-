import { Article, Category } from './types';
import anyAscii from 'any-ascii';

/**
 * Calculates a dynamic likes count based on:
 * 1. Initial likes (if provided) or a random seed between 1k-5k.
 * 2. Time elapsed since posting (growth factor).
 * 3. Trending status (multiplier).
 */
export const calculateDynamicLikes = (article: Article): number => {
  // Use a hash of the article ID to generate a consistent random seed between 1000 and 5000
  const getSeed = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 1000 + (Math.abs(hash) % 4001);
  };

  const baseLikes = article.initialLikes || getSeed(article.id);
  
  let hoursElapsed = 24; // Default
  try {
    // Check if ID is a timestamp (common for new articles)
    const idNum = parseInt(article.id);
    if (!isNaN(idNum) && idNum > 1000000000000) { 
       const now = Date.now();
       hoursElapsed = Math.max(0, (now - idNum) / (1000 * 60 * 60));
    } else {
      // Try parsing the date string
      const dateStr = article.published_at || article.date;
      if (dateStr) {
        const postedDate = new Date(dateStr);
        if (!isNaN(postedDate.getTime())) {
          const now = new Date();
          hoursElapsed = Math.max(0, (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60));
        }
      }
    }
  } catch (e) {
    // Keep default
  }

  // Growth: +15 likes per hour
  const growthRate = 15; 
  let totalLikes = baseLikes + (hoursElapsed * growthRate);

  // Trending multiplier
  if (article.isTrending) {
    totalLikes *= 3.5; // Even more boost for trending as requested
  }

  return Math.floor(totalLikes);
};

export const formatLikes = (count: number): string => {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
};

export const generateSlug = (title: string): string => {
  // Convert any non-ASCII characters (like Hindi) to their ASCII equivalents (Hinglish)
  const asciiTitle = anyAscii(title);
  
  const base = asciiTitle
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^\w-]+/g, '') // Keep alphanumeric and hyphens only
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
  
  // If the slug is too long, truncate it to a reasonable length (e.g., 60 chars)
  // while keeping whole words if possible
  let shortSlug = base;
  if (shortSlug.length > 60) {
    const truncated = shortSlug.substring(0, 60);
    const lastHyphen = truncated.lastIndexOf('-');
    if (lastHyphen > 0) {
      shortSlug = truncated.substring(0, lastHyphen);
    } else {
      shortSlug = truncated;
    }
  }
  
  return shortSlug || 'article'; // Fallback if title is somehow empty after stripping
};

export const getCategoryLabel = (category: Category): string | null => {
  switch (category) {
    case Category.POLITICS: return 'NATION UPDATE';
    case Category.CRIME: return 'अपराध';
    case Category.BOLLYWOOD: return 'मनोरंजन';
    case Category.SPORTS: return 'खेल';
    case Category.JOBS: return 'नौकरी';
    case Category.LOCAL: return 'Local';
    case Category.RTI: return 'RTI';
    case Category.VIDEO: return 'Video';
    case Category.LIFESTYLE: return 'Lifestyle';
    case Category.VIRAL: return 'VIRAL TODAY';
    case Category.WAR_ROOM: return 'WAR ROOM';
    case Category.STATE: return 'CHHATTISGARH NEWS';
    default: return null;
  }
};
