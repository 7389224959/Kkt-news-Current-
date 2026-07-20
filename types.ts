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
  JOB_APPLICATION = 'job_application',
  TIP_COMPLAINT = 'tip_complaint',
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
  featuredCollageImage?: string;
  source?: string; // User requested 'source'
  published_at?: string; // User requested 'published_at'
  created_at?: string;
  updated_at?: string;
  // Keep existing fields for compatibility if needed, but prioritize requested ones
  excerpt?: string; 
  date?: string;
  imageUrl?: string;
  videoUrl?: string;
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
  introMediaUrl?: string;
  outroMediaUrl?: string;
  bgmUrl?: string;
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
  isIntroCombined?: boolean;
  introDuration?: number;
  lastUsedTimestamp?: number;
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
  viralTemplates?: ViralTemplate[];
  adminPhoto?: string;
  adminDesignation?: string;
  autoTemplateIndex?: number;
  autoReelTemplateIndex?: number;
}

export interface ViralTemplate {
  id: string;
  name: string;
  referenceImageUrl: string;
  templateImageUrl?: string;
  coordinates: {
    headline_box: string;
    headline_line_1_box?: string;
    headline_line_2_box?: string;
    subheadline_box: string;
    summary_box: string;
    breaking_tag_box: string;
    image_box?: string;
  };
  usedElements: {
    hasHeadline: boolean;
    hasSubheadline: boolean;
    hasSummary: boolean;
    hasBreakingTag: boolean;
    hasImage?: boolean;
  };
  style_rules: {
    headlineColor: string;
    subheadlineColor: string;
    summaryColor: string;
    breakingTagColor: string;
    breakingTagBg: string;
    headlineBg?: string;
    subheadlineBg?: string;
    summaryBg?: string;
    headlineFont?: string;
    subheadlineFont?: string;
    summaryFont?: string;
    highlightColor?: string;
    headlineHighlightColor?: string;
    subheadlineHighlightColor?: string;
    summaryHighlightColor?: string;
    headlineFontSizeMult?: number;
    subheadlineFontSizeMult?: number;
    summaryFontSizeMult?: number;
  };
  limits?: {
    headlineMaxChars?: number;
    headline2MaxChars?: number;
    subheadlineMaxChars?: number;
    summaryMaxChars?: number;
  };
  isActive: boolean;
  createdAt: string;
  appliedFixes?: string[];
}

export interface ViralPost {
  breaking_tag: string;
  headline_line_1: string;
  headline_line_2: string;
  subheadline: string;
  summary?: string;
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

export interface WorkerTask {
  id: string;
  title: string;
  description?: string;
  reward: string;
  date: string; // e.g., "Oct 24, 2026"
  deadline?: string;
  priority: 'High' | 'Medium' | 'Low';
  location: string;
  status: 'Available' | 'Pending' | 'In Progress' | 'Completed';
  assignedTo: string; // workerId
  proofUrl?: string;
}

export interface Worker {
  id: string; // e.g., KKT-W-2048
  password?: string;
  name: string;
  designation: string;
  rank: 'Bronze Agent' | 'Silver Agent' | 'Gold Agent' | 'Diamond Agent';
  points: number;
  totalPoints: number;
  walletBalance: string;
  photo?: string;
  isActive: boolean;
}

export interface WorkerAsset {
  id: string;
  senderId: string;
  receiverId: string;
  fileUrl: string;
  fileName: string;
  timestamp: string;
}
