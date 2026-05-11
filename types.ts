export enum Category {
  POLITICS = 'Politics',
  STATE = 'State News',
  LOCAL = 'Local/District',
  JOBS = 'Jobs & Careers',
  CRIME = 'Crime',
  RTI = 'RTI & Legal',
  VIDEO = 'Video News',
  SPORTS = 'Sports',
  BOLLYWOOD = 'Entertainment',
  LIFESTYLE = 'Lifestyle',
  VIRAL = 'Viral Today',
  WAR_ROOM = 'War Room',
}

export interface Article {
  id: string;
  title: string;
  slug?: string;
  summary?: string; // User requested 'summary'
  content: string;
  category: Category;
  author?: string;
  image?: string; // User requested 'image'
  source?: string; // User requested 'source'
  published_at?: string; // User requested 'published_at'
  created_at?: string;
  updated_at?: string;
  // Keep existing fields for compatibility if needed, but prioritize requested ones
  excerpt?: string; 
  date?: string;
  imageUrl?: string;
  sourceUrl?: string;
  additionalImages?: string[];
  isBreaking?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  views?: number;
  initialLikes?: number;
  tags?: string[];
  imageCaption?: string;
  seoTitle?: string;
  metaDescription?: string;
  facebookCaption?: string;
}

export interface BreakingNews {
  id: string;
  text: string;
}

export interface TrendingKeyword {
  id: string;
  label: string;
  articleSlug: string;
}

export interface ReelTemplate {
  id: string;
  name: string;
  category: string;
  mediaUrl: string; // Background MP4 or Image
  screenshotUrl: string;
  coordinates: {
    video_box: string;
    headline_box: string;
    subtitle_box: string;
    ticker_box: string;
    logo_box: string;
  };
  safe_limits: {
    headline_words: number;
    subtitle_lines: number;
    words_per_line: number;
    ticker_characters: number;
  };
  fonts: {
    headline: string;
    subtitle: string;
  };
  style_rules: {
    theme: string;
    ticker_speed: number;
    text_shadow: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface SiteSettings {
  appName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  socials: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
  };
  tickerSpeed?: number;
  reelTemplates?: ReelTemplate[];
}

export interface ViralPost {
  breaking_tag: string;
  headline_line_1: string;
  headline_line_2: string;
  subheadline: string;
  branding: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
  theme?: string;
}

export interface User {
  name: string;
  role: 'Reader' | 'Citizen Reporter' | 'Admin';
}
