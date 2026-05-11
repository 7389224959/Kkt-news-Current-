import React, { useState, useEffect, useRef } from 'react';
import { Article, Category, BreakingNews, SiteSettings, TrendingKeyword, ViralPost } from '../types';
import { useApp } from '../context/AppContext';
import { getCategoryLabel, generateSlug } from '../newsUtils';
import { DEFAULT_SETTINGS } from '../constants';
import { 
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getBreakingNews,
  getSiteSettings,
  saveBreakingNews,
  addBreakingNews,
  deleteBreakingNews,
  saveSiteSettings,
  saveTrendingKeywords,
  getTrendingKeywords
} from '../services/articleService';
import { uploadImage } from '../services/supabase';
import { draftNewsReport, getStockImageUrl, generateAiImage, mapCategory, fetchTrendingKeywords, generateViralPost, generateViralImage } from '../services/geminiService';
import { postToFacebook, publishFacebookPost } from '../services/facebookService';
import { compressImage, overlayTextOnImage } from '../src/utils/imageUtils';
import { 
  Plus, Edit, Trash2, Save, X, LogOut, LayoutDashboard, 
  Image as ImageIcon, Type, Settings, Globe, FileText, Sparkles, RefreshCw, TrendingUp,
  ChevronRight, MapPin, ArrowUp, ArrowDown, Heart, Lock, AlertTriangle, Upload, Zap, Shield, Wand2, ExternalLink, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewsImage from '../components/NewsImage';
import ReelTemplatesAdmin from '../components/ReelTemplatesAdmin';
import ReelWizard from '../components/ReelWizard';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { refreshData: refreshGlobalData } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'breaking' | 'settings' | 'templates'>('articles');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Data State ---
  const { articles: contextArticles, breakingNews: contextBreakingNews, settings: contextSettings, trendingKeywords: contextKeywords } = useApp();
  const [articles, setArticles] = useState<Article[]>(contextArticles);
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>(contextBreakingNews);
  const [settings, setSiteSettings] = useState<SiteSettings | null>(contextSettings);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>(contextKeywords);
  const [totalArticles, setTotalArticles] = useState(0);

  useEffect(() => {
    setArticles(contextArticles);
    setBreakingNews(contextBreakingNews);
    setSiteSettings(contextSettings);
    setTrendingKeywords(contextKeywords);
  }, [contextArticles, contextBreakingNews, contextSettings, contextKeywords]);

  const handleFetchTrendingKeywords = async () => {
    setIsFetchingTrending(true);
    try {
      const suggested = await fetchTrendingKeywords();
      const newKeywords = suggested.map((s, i) => ({
        id: (i + 1).toString(),
        label: s.label,
        articleSlug: s.articleSlug
      }));
      setTrendingKeywords(newKeywords);
      await saveTrendingKeywords(newKeywords);
    } catch (error) {
      console.error('Error fetching trending keywords:', error);
      alert('Failed to fetch trending keywords from AI.');
    } finally {
      setIsFetchingTrending(false);
    }
  };

  const updateTrendingKeyword = (index: number, field: 'label' | 'articleSlug', value: string) => {
    const updatedKeywords = [...trendingKeywords];
    if (!updatedKeywords[index]) {
      updatedKeywords[index] = { id: (index + 1).toString(), label: '', articleSlug: '' };
    }
    updatedKeywords[index] = { ...updatedKeywords[index], [field]: value };
    setTrendingKeywords(updatedKeywords);
  };
  
  const handleSaveTrendingKeywords = async () => {
    setIsSavingSettings(true);
    try {
      await saveTrendingKeywords(trendingKeywords);
      alert('Trending keywords saved successfully!');
    } catch (error) {
      console.error('Error saving trending keywords:', error);
      alert('Failed to save trending keywords.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- Editing State ---
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const initialArticleState: Article = {
    id: '',
    title: '',
    summary: '',
    content: '',
    category: Category.STATE,
    author: 'Sankalp Jha',
    image: 'https://picsum.photos/seed/new/800/400',
    published_at: new Date().toISOString(),
    views: Math.floor(Math.random() * 8001) + 12000,
    initialLikes: 0,
    source: '',
    tags: [],
    slug: '',
    created_at: new Date().toISOString()
  };
  const [currentArticle, setCurrentArticle] = useState<Article>(initialArticleState);
  
  const [newBreakingText, setNewBreakingText] = useState('');
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // --- AI Drafting State ---
  const [aiNotes, setAiNotes] = useState('');
  const [aiLocation, setAiLocation] = useState('');
  const [aiSourceUrl, setAiSourceUrl] = useState('');
  const [aiSourceImage, setAiSourceImage] = useState<string | null>(null);
  const [aiWordLimit, setAiWordLimit] = useState<number>(400);
  const [isDrafting, setIsDrafting] = useState(false);
  const [showAiDraftTool, setShowAiDraftTool] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiImageInstructions, setAiImageInstructions] = useState('');
  const [aiImageReferenceBase64, setAiImageReferenceBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Viral Post State ---
  const [showViralModal, setShowViralModal] = useState(false);
  const [viralSourceType, setViralSourceType] = useState<'latest_post' | 'select_article'>('latest_post');
  const [viralSelectedArticleId, setViralSelectedArticleId] = useState<string>('');
  const [viralPost, setViralPost] = useState<ViralPost | null>(null);
  const [isGeneratingViral, setIsGeneratingViral] = useState(false);
  const [viralReferenceImage, setViralReferenceImage] = useState<string | null>(null);
  const [viralImageGenModel, setViralImageGenModel] = useState<'gemini' | 'cloudflare'>('gemini');
  const [viralGeneratedImage, setViralGeneratedImage] = useState<string | null>(null);
  const [rawViralGeneratedImage, setRawViralGeneratedImage] = useState<string | null>(null);
  const [isPostingToFacebook, setIsPostingToFacebook] = useState(false);
  const [viralCustomPrompt, setViralCustomPrompt] = useState('');
  const [viralRegeneratePrompt, setViralRegeneratePrompt] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [fbPreviewLink, setFbPreviewLink] = useState<string | null>(null);
  const [fbPreviewPostId, setFbPreviewPostId] = useState<string | null>(null);
  const [isApprovingFbPost, setIsApprovingFbPost] = useState(false);
  
  // Daily News states
  const [showDailyNewsModal, setShowDailyNewsModal] = useState(false);
  const [dailyNewsRssSources, setDailyNewsRssSources] = useState<{ url: string, category: Category }[]>([
    { url: 'https://www.bhaskar.com/rss-v1--category-1741.xml', category: Category.STATE },
    { url: 'https://www.abplive.com/news/states/chhattisgarh/feed', category: Category.STATE },
    { url: 'https://www.amarujala.com/rss/chhattisgarh.xml', category: Category.STATE },
    { url: 'https://rss.jagran.com/naidunia/chhattisgarh.xml', category: Category.STATE },
    { url: 'https://www.indiatvnews.com/rssnews/topstory-chhattisgarh.xml', category: Category.STATE }
  ]);
  const [newDailyNewsRssCategory, setNewDailyNewsRssCategory] = useState<Category>(Category.STATE);
  const [newDailyNewsRssLink, setNewDailyNewsRssLink] = useState('');
  const [dailyNewsModel, setDailyNewsModel] = useState<'gemini' | 'openrouter'>('gemini');
  const [dailyNewsImageStrategy, setDailyNewsImageStrategy] = useState<'auto' | 'manual'>('auto');
  const [dailyNewsImageGenModel, setDailyNewsImageGenModel] = useState<'gemini' | 'cloudflare'>('gemini');

  // --- Reel Generation State ---
  const [showReelModal, setShowReelModal] = useState(false);
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [reelStatus, setReelStatus] = useState('');
  const [reelScriptData, setReelScriptData] = useState<any>(null);
  const [reelAudioUrl, setReelAudioUrl] = useState<string | null>(null);

  // --- Auto Fetch Daily News State ---
  const [isFetchingDailyNews, setIsFetchingDailyNews] = useState(false);
  const isFetchingDailyNewsRef = useRef(false);
  const [rssStatus, setRssStatus] = useState<Record<string, { freshCount: number, error?: string } | null>>({});
  const [isCheckingRssStatus, setIsCheckingRssStatus] = useState(false);
  const [isAutoSchedulerEnabled, setIsAutoSchedulerEnabled] = useState(false);
  const [autoSchedulerInterval, setAutoSchedulerInterval] = useState(10);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isFetchingTrending, setIsFetchingTrending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- Init ---
  useEffect(() => {
    if (sessionStorage.getItem('kkt_admin_logged_in') === 'true') {
      setIsAuthenticated(true);
      refreshData();
    }

    const savedDailyNewsRssSources = localStorage.getItem('kkt_daily_news_rss_sources');
    if (savedDailyNewsRssSources) {
      try {
        setDailyNewsRssSources(JSON.parse(savedDailyNewsRssSources));
      } catch (e) {
        console.error('Error parsing daily news RSS sources', e);
      }
    }
    
    // Load scheduler settings
    const savedAutoSchedulerEnabled = localStorage.getItem('kkt_auto_scheduler_enabled');
    if (savedAutoSchedulerEnabled === 'true') setIsAutoSchedulerEnabled(true);
    const savedAutoSchedulerInterval = localStorage.getItem('kkt_auto_scheduler_interval');
    if (savedAutoSchedulerInterval) setAutoSchedulerInterval(parseInt(savedAutoSchedulerInterval, 10) || 10);
  }, []);

  // Sync state to ref for access in setInterval
  useEffect(() => {
    isFetchingDailyNewsRef.current = isFetchingDailyNews;
  }, [isFetchingDailyNews]);

  // The actual background scheduler
  useEffect(() => {
    if (!isAutoSchedulerEnabled || dailyNewsRssSources.length === 0 || autoSchedulerInterval <= 0) return;

    console.log(`Auto fetch scheduler started. Interval: ${autoSchedulerInterval} minutes.`);
    const intervalMs = autoSchedulerInterval * 60 * 1000;

    const backgroundFetch = async () => {
      // Prevents running multiple concurrent fetches
      if (isFetchingDailyNewsRef.current) return;
      
      console.log('Running scheduled background fetch...');
      try {
        setIsFetchingDailyNews(true);
        const { fetchDailyNews } = await import('../services/geminiService');
        const newArticles = await fetchDailyNews(dailyNewsRssSources, dailyNewsModel, dailyNewsImageStrategy, dailyNewsImageGenModel);
        if (newArticles.length > 0) {
          console.log(`Background fetch successful: ${newArticles.length} new articles.`);
          refreshData(); // Refresh UI silently
        } else {
          console.log('Background fetch ran, but no fresh articles found.');
        }
      } catch (error) {
        console.error('Background fetch error:', error);
      } finally {
        setIsFetchingDailyNews(false);
      }
    };

    const timer = setInterval(backgroundFetch, intervalMs);
    // You could also execute it once immediately if you want, 
    // but typically users expect it to run after the interval.

    return () => clearInterval(timer);
  }, [isAutoSchedulerEnabled, autoSchedulerInterval, dailyNewsRssSources, dailyNewsModel, dailyNewsImageStrategy, dailyNewsImageGenModel]);

  // --- Update Viral Image on Text Change ---
  useEffect(() => {
    if (rawViralGeneratedImage && viralPost) {
      const updateImage = async () => {
        const newImage = await overlayTextOnImage(rawViralGeneratedImage, {
          breaking_tag: viralPost.breaking_tag,
          headline_line_1: viralPost.headline_line_1,
          headline_line_2: viralPost.headline_line_2,
          subheadline: viralPost.subheadline,
          branding: viralPost.branding,
          theme: viralPost.theme
        });
        setViralGeneratedImage(newImage);
      };
      updateImage();
    }
  }, [viralPost?.breaking_tag, viralPost?.headline_line_1, viralPost?.headline_line_2, viralPost?.subheadline, viralPost?.branding, viralPost?.theme, rawViralGeneratedImage]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      setGlobalError(null);
      const [articlesResponse, breakingNewsData, settingsData] = await Promise.all([
        getArticles(1, 100), // Fetch more for admin list
        getBreakingNews(),
        getSiteSettings()
      ]);
      setArticles(articlesResponse.data);
      setTotalArticles(articlesResponse.count);
      setBreakingNews(breakingNewsData);
      setSiteSettings(settingsData || DEFAULT_SETTINGS);
      
      // Also refresh the global app context so the home page updates
      refreshGlobalData();
    } catch (error) {
      console.error('Error refreshing admin data:', error);
      setGlobalError('Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('kkt_admin_logged_in', 'true');
      refreshData();
    } else {
      alert("Invalid Password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('kkt_admin_logged_in');
    navigate('/');
  };

  // --- AI Auto-Generate Handler ---
  const handleCheckDailyNewsStatus = async () => {
    if (dailyNewsRssSources.length === 0) {
      alert("Please add at least one RSS link to check status.");
      return;
    }
    setIsCheckingRssStatus(true);
    setRssStatus({});
    try {
      const { checkDailyNewsStatus } = await import('../services/geminiService');
      const statuses = await checkDailyNewsStatus(dailyNewsRssSources); 
      const statusMap: Record<string, { freshCount: number, error?: string }> = {};
      statuses.forEach((s: any) => {
        statusMap[s.source.url] = s;
      });
      setRssStatus(statusMap);
    } catch (error: any) {
      console.error("Error checking RSS status:", error);
      alert(error.message || "An error occurred while checking RSS status.");
    } finally {
      setIsCheckingRssStatus(false);
    }
  };

  const handleFetchDailyNews = async () => {
    if (dailyNewsRssSources.length === 0) {
      alert("Please add at least one RSS link to fetch new articles.");
      return;
    }
    setIsFetchingDailyNews(true);
    try {
      const { fetchDailyNews } = await import('../services/geminiService');
      const newArticles = await fetchDailyNews(dailyNewsRssSources, dailyNewsModel, dailyNewsImageStrategy, dailyNewsImageGenModel);
      if (newArticles.length > 0) {
        alert(`Successfully fetched and drafted ${newArticles.length} new articles!`);
        refreshData();
        setShowDailyNewsModal(false);
      } else {
        alert("Failed to fetch new articles or they were already posted.");
      }
    } catch (error: any) {
      console.error("Error fetching daily news:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsFetchingDailyNews(false);
    }
  };

  const handleAiDraft = async () => {
    if (!aiNotes.trim() && !aiSourceUrl.trim() && !aiSourceImage) {
      alert("Please provide notes, a source URL, or a source image for the AI to draft.");
      return;
    }
    setIsDrafting(true);
    try {
      const draft = await draftNewsReport({
        rawNotes: aiNotes,
        location: aiLocation,
        sourceUrl: aiSourceUrl,
        sourceImageBase64: aiSourceImage || undefined,
        wordLimit: aiWordLimit
      });
      
      if (typeof draft === 'string') {
        alert(draft);
        return;
      }

      // Use centralized stock image helper
      const category = draft.category ? mapCategory(draft.category) : currentArticle.category;
      const imageUrl = getStockImageUrl(draft.imageKeywords || "news", category);
      
      setCurrentArticle(prev => ({
        ...prev,
        title: draft.title || prev.title,
        content: draft.content || prev.content,
        category: category,
        summary: draft.excerpt || (draft.content ? (draft.content.slice(0, 150) + '...') : prev.summary),
        tags: (draft.tags && draft.tags.length > 0) ? draft.tags : prev.tags,
        image: imageUrl,
        seoTitle: draft.seoTitle,
        metaDescription: draft.metaDescription,
        facebookCaption: draft.facebookCaption
      }));
      
      setAiNotes('');
      setAiLocation('');
      setAiSourceUrl('');
      setAiSourceImage(null);
      setShowAiDraftTool(false);
      alert("AI Draft generated and applied to the form below! A relevant stock photo has also been selected.");
    } catch (error) {
      console.error("Error drafting news:", error);
      alert("Failed to draft news. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleAiSourceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAiSourceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- Article Handlers ---
  const handleAiReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAiImageReferenceBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiImage = async () => {
    if (!currentArticle.title) {
      alert("Please enter a title first to generate a relevant image.");
      return;
    }
    
    setIsGeneratingImage(true);
    try {
      const base64Image = await generateAiImage(currentArticle.title, aiImageInstructions, aiImageReferenceBase64 || undefined);
      const imageUrl = await uploadImage(base64Image);
      setCurrentArticle(prev => ({ ...prev, image: imageUrl }));
      setAiImageInstructions(''); // Reset instructions after successful generation
    } catch (error) {
      console.error("AI Image Error:", error);
      alert("Failed to generate AI image. Please try again or use a stock URL.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      setCurrentArticle(prev => ({ ...prev, image: publicUrl }));
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Viral Post Handlers ---


  // --- Daily News Auto Fetch Handlers ---
  const handleAddDailyNewsRssSource = () => {
    if (!newDailyNewsRssLink.trim()) return;
    try {
      new URL(newDailyNewsRssLink);
    } catch {
      alert("Please enter a valid URL");
      return;
    }
    if (dailyNewsRssSources.some(source => source.url === newDailyNewsRssLink)) {
      alert("This RSS link is already added");
      return;
    }
    const updatedSources = [...dailyNewsRssSources, { url: newDailyNewsRssLink, category: newDailyNewsRssCategory }];
    setDailyNewsRssSources(updatedSources);
    localStorage.setItem('kkt_daily_news_rss_sources', JSON.stringify(updatedSources));
    setNewDailyNewsRssLink('');
  };

  const handleRemoveDailyNewsRssSource = (idxToRemove: number) => {
    const updatedSources = dailyNewsRssSources.filter((_, idx) => idx !== idxToRemove);
    setDailyNewsRssSources(updatedSources);
    localStorage.setItem('kkt_daily_news_rss_sources', JSON.stringify(updatedSources));
  };

  const handleOpenViralModal = () => {
    setFbPreviewLink(null);
    setFbPreviewPostId(null);
    if (articles.length === 0) {
      alert("No articles available to generate a viral post.");
      return;
    }
    setViralPost(null);
    setViralReferenceImage(null);
    setViralGeneratedImage(null);
    setRawViralGeneratedImage(null);
    setViralCustomPrompt('');
    setViralRegeneratePrompt('');
    setShowViralModal(true);
  };

  const handleGenerateViralPost = async () => {
    setFbPreviewLink(null);
    setFbPreviewPostId(null);
    let articleToUse: Article | null = null;

    if (viralSourceType === 'latest_post') {
      for (const article of articles) {
        const pubDate = new Date(article.published_at || article.created_at || new Date());
        const now = new Date();
        const diffHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
        if (diffHours <= 12) {
          articleToUse = article;
          break;
        }
      }

      if (!articleToUse) {
        alert("No recent articles (within the last 12 hours) available to generate a viral post.");
        return;
      }
    } else if (viralSourceType === 'select_article') {
      if (!viralSelectedArticleId) {
        alert("Please select an article first.");
        return;
      }
      articleToUse = articles.find(a => a.id === viralSelectedArticleId) || null;
      if (!articleToUse) {
        alert("Selected article not found.");
        return;
      }
    }

    setIsGeneratingViral(true);
    try {
      let cachedSeoInfo;
      try {
        if (typeof window !== 'undefined' && articleToUse?.slug) {
          const cached = localStorage.getItem(`seo_cache_${articleToUse.slug}`);
          if (cached) cachedSeoInfo = JSON.parse(cached);
        }
      } catch(e){}

      const post = await generateViralPost({
        article: articleToUse!,
        cachedSeoInfo,
        customInstructions: viralCustomPrompt || undefined
      });
      setViralPost(post);
      
      // Generate image
      const imageBase64 = await generateViralImage(post.image_prompt, viralReferenceImage || undefined, viralImageGenModel);
      setRawViralGeneratedImage(imageBase64);
    } catch (error) {
      console.error("Error generating viral post:", error);
      alert("Failed to generate viral post. Please try again.");
    } finally {
      setIsGeneratingViral(false);
    }
  };

  const handleRegenerateViralPost = async () => {
    setFbPreviewLink(null);
    setFbPreviewPostId(null);
    let articleToUse = articles[0];
    if (viralSourceType === 'select_article') {
      articleToUse = articles.find(a => a.id === viralSelectedArticleId) || articles[0];
    }
    
    if (!articleToUse || !viralPost) return;

    setIsGeneratingViral(true);
    try {
      let cachedSeoInfo;
      try {
        if (typeof window !== 'undefined' && articleToUse?.slug) {
          const cached = localStorage.getItem(`seo_cache_${articleToUse.slug}`);
          if (cached) cachedSeoInfo = JSON.parse(cached);
        }
      } catch(e){}

      const post = await generateViralPost({
         article: articleToUse,
         cachedSeoInfo,
         customInstructions: viralCustomPrompt || undefined,
         previousPost: viralPost,
         feedback: viralRegeneratePrompt || undefined
      });
      setViralPost(post);
      
      // Generate image
      const imageBase64 = await generateViralImage(post.image_prompt, viralReferenceImage || undefined, viralImageGenModel);
      setRawViralGeneratedImage(imageBase64);
      setViralRegeneratePrompt(''); // Clear feedback after successful regeneration
    } catch (error) {
      console.error("Error regenerating viral post:", error);
      alert("Failed to regenerate viral post. Please try again.");
    } finally {
      setIsGeneratingViral(false);
    }
  };

  const handleViralReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setViralReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFacebookPreview = async () => {
    if (!viralPost || !viralGeneratedImage) {
      alert("Please generate the viral post and image first.");
      return;
    }

    let unixScheduledTime: number | undefined = undefined;
    if (scheduledTime) {
      const date = new Date(scheduledTime);
      unixScheduledTime = Math.floor(date.getTime() / 1000);
      
      const now = Math.floor(Date.now() / 1000);
      const diff = unixScheduledTime - now;
      if (diff < 10 * 60 || diff > 75 * 24 * 60 * 60) {
        alert("Scheduled time must be between 10 minutes and 75 days from now.");
        return;
      }
    }

    setIsPostingToFacebook(true);
    setFbPreviewLink(null);
    setFbPreviewPostId(null);
    try {
      const imageUrl = await uploadImage(viralGeneratedImage);
      
      // Pass published = false
      const result = await postToFacebook(viralPost.caption, imageUrl, unixScheduledTime, false);
      
      if (result.success && result.id) {
        // Construct preview link. If it's a page post, we can usually preview it via page link or direct post link.
        // The ID format is often "PageID_PostID", so we can just use the returned ID directly or split it.
        const pageIdStr = result.pageId ? `/${result.pageId}` : '';
        const rawPostId = result.id.includes('_') ? result.id.split('_')[1] : result.id;
        const previewUrl = `https://www.facebook.com${result.pageId ? pageIdStr : ''}/posts/${rawPostId}`;
        
        setFbPreviewLink(previewUrl);
        setFbPreviewPostId(result.id);
        alert(unixScheduledTime ? "Successfully scheduled dark post! You can preview it now." : "Successfully created dark post! You can preview it before publishing.");
      } else {
        alert("Created post but could not retrieve ID for preview.");
      }
    } catch (error: any) {
      console.error("Facebook post error:", error);
      alert(`Failed to create Facebook post: ${error.message}`);
    } finally {
      setIsPostingToFacebook(false);
    }
  };

  const handleApproveAndPublishFbPost = async () => {
    if (!fbPreviewPostId) return;
    
    setIsApprovingFbPost(true);
    try {
      await publishFacebookPost(fbPreviewPostId);
      alert("Successfully published post to Timeline!");
      setShowViralModal(false);
      setScheduledTime('');
      setFbPreviewLink(null);
      setFbPreviewPostId(null);
    } catch (error: any) {
      console.error("Facebook publish error:", error);
      alert(`Failed to publish post: ${error.message}`);
    } finally {
      setIsApprovingFbPost(false);
    }
  };

  const handleOpenReelModal = () => {
    setShowReelModal(true);
    setReelScriptData(null);
    setReelAudioUrl(null);
    setReelStatus('');
  };

  const handleGenerateReel = async () => {
    if (articles.length === 0) {
      alert("No articles available to generate reel from.");
      return;
    }

    if (!settings || !settings.reelTemplates || settings.reelTemplates.filter(t => t.isActive).length === 0) {
      alert("No active reel templates found. Please add an active template in the Templates tab first.");
      return;
    }

    setIsGeneratingReel(true);
    setReelStatus('Step 1: Fetching latest published news post...');
    
    try {
      const latestArticle = articles[0]; 
      const articleContent = `${latestArticle.title}\n\n${latestArticle.content}`;

      // Find best active template
      const activeTemplates = settings.reelTemplates.filter(t => t.isActive);
      // Try to match category, else pick first
      let selectedTemplate = activeTemplates.find(t => t.category === latestArticle.category) || activeTemplates[0];

      setReelStatus(`Step 2: Matching template "${selectedTemplate.name}" & generating script...`);
      const { generateFullReelScript, generateReelAudio } = await import('../services/geminiService');
      const scriptData = await generateFullReelScript(articleContent, selectedTemplate);
      setReelScriptData({
        ...scriptData,
        fullScript: scriptData.voiceoverScript // for compatibility with editor UI
      });

      setReelStatus('Step 3: Initializing professional female Hindi news anchor voice...');
      await new Promise(r => setTimeout(r, 1000));
      
      setReelStatus('Step 4: Formulating natural pacing & reading styles...');
      await new Promise(r => setTimeout(r, 1500));
      
      setReelStatus('Step 5: Voice generated. Combining with Visuals using FFmpeg...');
      
      const { pcmBase64ToWavUrl, pcmBase64ToWavDataUri } = await import('../src/utils/audioUtils');
      const base64Audio = await generateReelAudio(scriptData.voiceoverScript);
      const audioUrl = pcmBase64ToWavUrl(base64Audio); // For browser preview
      const audioDataUri = pcmBase64ToWavDataUri(base64Audio); // For node backend
      setReelAudioUrl(audioUrl); // Store audio just in case they just want audio

      // We now call the server-side API to render the reel
      const renderRes = await fetch('/api/render-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioDataUri,
          templateMediaUrl: selectedTemplate.mediaUrl || selectedTemplate.screenshotUrl,
          visuals: [], // We can enhance this later
          scriptData: scriptData,
          template: selectedTemplate
        })
      });

      if (!renderRes.ok) {
        const errData = await renderRes.json();
        throw new Error(errData.error || 'Failed to render reel');
      }

      const blob = await renderRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      setReelStatus('✅ Success! Full Viral Reel generated completely.');
      
      // We will mount this reel visually instead of just audio
      setReelScriptData((prev: any) => ({ ...prev, videoBase64: objectUrl }));

    } catch (error: any) {
      console.error("Reel generation failed:", error);
      setReelStatus('Failed to generate reel: ' + String(error.message || error));
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const handleRegenerateVoiceOnly = async () => {
    if (!reelScriptData?.fullScript) return;
    
    setIsGeneratingReel(true);
    setReelStatus('Regenerating voiceover...');
    try {
      const { generateReelAudio } = await import('../services/geminiService');
      const { pcmBase64ToWavUrl } = await import('../src/utils/audioUtils');
      const base64Audio = await generateReelAudio(reelScriptData.fullScript);
      const audioUrl = pcmBase64ToWavUrl(base64Audio);
      setReelAudioUrl(audioUrl);
      setReelStatus('Voice regenerated successfully!');
    } catch (error: any) {
      console.error("Voice regeneration failed:", error);
      setReelStatus('Failed to regenerate voice: ' + String(error.message || error));
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const articleToSave = { ...currentArticle };
      
      // Ensure slug is generated
      if (!articleToSave.slug && articleToSave.title) {
        articleToSave.slug = generateSlug(articleToSave.title);
      }

      if (!articleToSave.id) {
        const { id, ...articleWithoutId } = articleToSave;
        const newArt = await createArticle(articleWithoutId);
        articleToSave.slug = newArt.slug;
      } else {
        await updateArticle(articleToSave.id, articleToSave);
      }
      
      try {
        if (typeof window !== 'undefined' && articleToSave.slug && (articleToSave.seoTitle || articleToSave.facebookCaption)) {
          localStorage.setItem(`seo_cache_${articleToSave.slug}`, JSON.stringify({
            seoTitle: articleToSave.seoTitle,
            metaDescription: articleToSave.metaDescription,
            facebookCaption: articleToSave.facebookCaption
          }));
        }
      } catch (e) {
        console.warn("Failed to cache SEO info locally:", e);
      }
      
      await refreshData();
      setIsEditingArticle(false);
      setCurrentArticle(initialArticleState);
      alert('Article saved successfully!');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    }
  };

  const handleDeleteArticle = (id: string) => {
    console.log('Setting article for deletion:', id);
    setDeletingArticleId(id);
  };

  const confirmDelete = async () => {
    if (!deletingArticleId) {
      console.warn('No article ID set for deletion');
      return;
    }
    
    try {
      console.log('Executing delete for article ID:', deletingArticleId);
      await deleteArticle(deletingArticleId);
      
      // Clear the ID and refresh the list
      setDeletingArticleId(null);
      await refreshData();
      
      alert('Article deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete article:', error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('RLS policy') || errorMessage.includes('permission')) {
        alert('Failed to delete article. Please check your Supabase Row-Level Security (RLS) policies. You need a policy that allows DELETE operations on the "articles" table.');
      } else {
        alert('Failed to delete article. Please check your connection and try again.');
      }
    }
  };

  const moveArticleUp = async (index: number) => {
    if (index === 0) return;
    const newArticles = [...articles];
    [newArticles[index - 1], newArticles[index]] = [newArticles[index], newArticles[index - 1]];
    setArticles(newArticles);
    // Note: Supabase doesn't support bulk order updates easily without a dedicated order column.
    // We'll skip saving the order for now.
  };

  const moveArticleDown = async (index: number) => {
    if (index === articles.length - 1) return;
    const newArticles = [...articles];
    [newArticles[index + 1], newArticles[index]] = [newArticles[index], newArticles[index + 1]];
    setArticles(newArticles);
    // Note: Supabase doesn't support bulk order updates easily without a dedicated order column.
    // We'll skip saving the order for now.
  };

  const startEditArticle = (article: Article) => {
    console.log('Editing article:', article);
    setCurrentArticle(article);
    setIsEditingArticle(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Breaking News Handlers ---
  const handleAddBreaking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreakingText.trim()) return;
    try {
      await addBreakingNews(newBreakingText);
      setNewBreakingText('');
      await refreshData();
    } catch (error: any) {
      console.error('Error adding breaking news:', error);
      alert(error.message || 'Failed to add breaking news.');
    }
  };

  const handleDeleteBreaking = async (id: string) => {
    try {
      await deleteBreakingNews(id);
      await refreshData();
    } catch (error: any) {
      console.error('Error deleting breaking news:', error);
      alert(error.message || 'Failed to delete breaking news.');
    }
  };

  // --- Settings Handlers ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      setIsSavingSettings(true);
      try {
        console.log('Saving settings:', settings);
        await saveSiteSettings(settings);
        alert('Site settings updated! Refresh the page to see changes in the header/footer.');
        await refreshData();
      } catch (error: any) {
        console.error('Error saving settings:', error);
        alert(`Failed to save settings: ${error.message || 'Check console for details.'}\nIf the error is about a missing column, please go to your Supabase Dashboard -> Table Editor -> site_settings and add it.`);
      } finally {
        setIsSavingSettings(false);
      }
    }
  };




  // --- Render Login ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">KKT Admin</h1>
            <p className="text-gray-500">Secure News Desk Login</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none transition-all"
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md">
              Login to Dashboard
            </button>

          </form>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed text-center">
              <strong>Note:</strong> Access is restricted to authorized administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-red-600 flex items-center gap-1">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <button 
            onClick={() => setActiveTab('articles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'articles' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText size={18} /> News Articles
          </button>
          <button 
            onClick={() => setActiveTab('breaking')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'breaking' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Type size={18} /> Ticker / Breaking
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Settings size={18} /> Site Settings
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'templates' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ImageIcon size={18} /> Templates
          </button>
        </div>

        {/* Global Error Alert */}
        {globalError && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-red-800 text-sm">System Alert</h3>
              <p className="text-red-700 text-sm leading-relaxed">{globalError}</p>
              <button 
                onClick={refreshData}
                className="mt-2 text-xs font-bold text-red-600 hover:text-red-800 underline flex items-center gap-1"
              >
                <RefreshCw size={12} /> Try Reconnecting
              </button>
            </div>
          </div>
        )}

        {isLoading && !globalError && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="text-red-600 animate-spin mb-4" size={40} />
            <p className="text-gray-500 font-bold">Loading dashboard data...</p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* --- TAB: ARTICLES --- */}
            {activeTab === 'articles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Editor */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {isEditingArticle ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-green-600" />}
                  {isEditingArticle ? 'Edit Article' : 'Add New Article'}
                </h2>

                {/* AI Draft Tool */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <button 
                    type="button"
                    onClick={() => setShowAiDraftTool(!showAiDraftTool)}
                    className="w-full flex items-center justify-between text-purple-700 font-bold text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles size={16} /> AI Writing Assistant
                    </span>
                    {showAiDraftTool ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  </button>
                  
                  {showAiDraftTool && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Location (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Raipur, Chhattisgarh"
                          className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                          value={aiLocation}
                          onChange={e => setAiLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Source URL (Optional)</label>
                        <input 
                          type="url"
                          placeholder="https://example.com/news"
                          className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                          value={aiSourceUrl}
                          onChange={e => setAiSourceUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Source Image (Optional)</label>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleAiSourceImageUpload}
                          className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none bg-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                        />
                        {aiSourceImage && (
                          <div className="mt-2 relative inline-block">
                            <img src={aiSourceImage} alt="Source Preview" className="h-20 rounded border border-purple-200" />
                            <button 
                              type="button" 
                              onClick={() => setAiSourceImage(null)} 
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Raw Notes / Facts (Optional)</label>
                        <textarea 
                          placeholder="Paste rough notes or facts here..."
                          rows={3}
                          className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                          value={aiNotes}
                          onChange={e => setAiNotes(e.target.value)}
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1 flex justify-between">
                          <span>Word Limit</span>
                          <span>~{aiWordLimit} words</span>
                        </label>
                        <input 
                          type="range"
                          min="100"
                          max="1500"
                          step="50"
                          value={aiWordLimit}
                          onChange={e => setAiWordLimit(parseInt(e.target.value))}
                          className="w-full accent-purple-600"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleAiDraft}
                        disabled={isDrafting}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isDrafting ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {isDrafting ? 'Drafting...' : 'Generate Draft'}
                      </button>
                      <p className="text-[10px] text-purple-400 text-center italic">
                        This will populate the title and content fields below.
                      </p>
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSaveArticle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                      value={currentArticle.title}
                      onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug (URL Path)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm"
                      value={currentArticle.slug || ''}
                      onChange={e => setCurrentArticle({...currentArticle, slug: e.target.value})}
                      placeholder="Auto-generated if left blank"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Leave blank to auto-generate a clean Hinglish slug from the title. 
                      <span className="text-red-500 font-bold ml-1">Warning: Changing this will break existing links to this article!</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none bg-white"
                      value={currentArticle.category}
                      onChange={e => setCurrentArticle({...currentArticle, category: e.target.value as Category})}
                    >
                      {Object.values(Category).map(cat => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat as Category) || cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reporter Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                      value={currentArticle.author}
                      onChange={e => setCurrentArticle({...currentArticle, author: e.target.value})}
                      placeholder="e.g. Ravi Kumar"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Source URL</label>
                      {currentArticle.source && (
                        <a 
                          href={currentArticle.source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe size={10} /> Visit Source
                        </a>
                      )}
                    </div>
                    <input 
                      type="url" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm text-blue-600"
                      value={currentArticle.source || ''}
                      onChange={e => setCurrentArticle({...currentArticle, source: e.target.value})}
                      placeholder="https://original-news-source.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (Comma separated)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      value={currentArticle.tags?.join(', ') || ''}
                      onChange={e => setCurrentArticle({...currentArticle, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                      placeholder="e.g. Politics, Raipur, Development"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        placeholder="Image URL (https://...)"
                        value={currentArticle.image}
                        onChange={e => setCurrentArticle({...currentArticle, image: e.target.value})}
                      />
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded border border-gray-300 flex items-center gap-2 transition-colors">
                        {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                        <span className="text-xs font-bold">Upload</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 bg-purple-50 p-3 rounded border border-purple-100">
                      <label className="text-xs font-bold text-purple-800 uppercase flex items-center gap-1">
                        <Sparkles size={12} /> AI Image Generator
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white border border-purple-200 text-purple-700 px-3 py-2 rounded text-xs font-bold hover:bg-purple-50 flex items-center gap-2 transition-colors">
                          <ImageIcon size={14} /> 
                          {aiImageReferenceBase64 ? 'Change Reference Face' : 'Upload Reference Face (Optional)'}
                          <input type="file" className="hidden" accept="image/*" onChange={handleAiReferenceUpload} />
                        </label>
                        {aiImageReferenceBase64 && (
                          <div className="relative h-9 w-9 rounded-full overflow-hidden shadow border border-purple-200">
                            <img src={aiImageReferenceBase64} alt="Reference" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setAiImageReferenceBase64(null)} 
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                          placeholder="Optional specifications (e.g. 'crowd', 'temple background')"
                          value={aiImageInstructions}
                          onChange={(e) => setAiImageInstructions(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={handleGenerateAiImage}
                          disabled={isGeneratingImage}
                          className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50 min-w-[150px] justify-center"
                          title="Generate AI Image with specifications and face"
                        >
                          {isGeneratingImage ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          {isGeneratingImage ? 'Generating...' : 'Generate AI Photo'}
                        </button>
                      </div>
                    </div>
                    {currentArticle.image && (
                      <div className="relative w-full h-32 rounded overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={currentArticle.image} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setCurrentArticle({...currentArticle, image: ''})}
                          className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Additional Images (Gallery)</label>
                    <div className="flex gap-2 mb-2">
                       <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded border border-gray-300 flex items-center gap-2 transition-colors w-full justify-center">
                        <ImageIcon size={18} />
                        <span className="text-sm font-bold">Upload Multiple Photos</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple
                          className="hidden" 
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              Array.from(files).forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCurrentArticle(prev => ({
                                    ...prev, 
                                    additionalImages: [...(prev.additionalImages || []), reader.result as string]
                                  }));
                                };
                                reader.readAsDataURL(file);
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    {currentArticle.additionalImages && currentArticle.additionalImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {currentArticle.additionalImages.map((img, idx) => (
                          <div key={idx} className="relative h-24 bg-gray-100 rounded overflow-hidden border border-gray-200 group">
                            <NewsImage src={img} alt={`Gallery ${idx}`} className="w-full h-full" fallbackText={`Gallery ${idx}`} />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...(currentArticle.additionalImages || [])];
                                newImages.splice(idx, 1);
                                setCurrentArticle({...currentArticle, additionalImages: newImages});
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Views Count</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                        value={currentArticle.views || 0}
                        onChange={e => setCurrentArticle({...currentArticle, views: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Likes</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                        value={currentArticle.initialLikes || 0}
                        onChange={e => setCurrentArticle({...currentArticle, initialLikes: parseInt(e.target.value) || 0})}
                        placeholder="e.g. 1500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        checked={currentArticle.isTrending || false}
                        onChange={e => setCurrentArticle({...currentArticle, isTrending: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-gray-700">Mark as Trending</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={currentArticle.isFeatured || false}
                        onChange={e => setCurrentArticle({...currentArticle, isFeatured: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-gray-700">Show in Big View</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source URL</label>
                    <input 
                      type="url" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      value={currentArticle.sourceUrl || currentArticle.source || ''}
                      onChange={e => setCurrentArticle({...currentArticle, sourceUrl: e.target.value, source: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Excerpt</label>
                    <textarea 
                      required
                      rows={2}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      value={currentArticle.excerpt}
                      onChange={e => setCurrentArticle({...currentArticle, excerpt: e.target.value})}
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500 outline-none"
                      value={currentArticle.content}
                      onChange={e => setCurrentArticle({...currentArticle, content: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
                      <Save size={16} /> Save
                    </button>
                    {isEditingArticle && (
                      <button 
                        type="button" 
                        onClick={() => { setIsEditingArticle(false); setCurrentArticle(initialArticleState); }}
                        className="px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2 order-1 lg:order-2">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                 <h2 className="font-bold text-xl text-slate-800">Articles List ({articles.length})</h2>
                 <div className="flex flex-wrap gap-2">
                   <button 
                     onClick={() => setShowDailyNewsModal(true)}
                     className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                   >
                     <Zap size={18} />
                     Auto Fetch Daily News
                   </button>
                   <button 
                     onClick={handleOpenViralModal}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                   >
                     <Sparkles size={18} />
                     Auto Viral Post
                   </button>
                   <button 
                     onClick={handleOpenReelModal}
                     className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                   >
                     <Zap size={18} />
                     Auto Reel
                   </button>
                 </div>
               </div>


               
               <div className="space-y-4">
                 {articles.map((article, index) => (
                   <div key={article.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                      <div className="flex flex-col justify-center gap-1 mr-2">
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); moveArticleUp(index); }} 
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp size={20} />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); moveArticleDown(index); }} 
                          disabled={index === articles.length - 1}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown size={20} />
                        </button>
                      </div>
                     <div className="w-20 h-20 shrink-0 rounded bg-gray-100 overflow-hidden">
                       <NewsImage src={article.image || article.imageUrl || ''} className="w-full h-full" alt="" fallbackText="News" />
                     </div>
                     <div className="flex-1">
                       <div className="flex justify-between">
                         <h3 className="font-bold text-slate-900 line-clamp-1">{article.title}</h3>
                         <div className="flex gap-2">
                           <button type="button" onClick={(e) => { e.stopPropagation(); startEditArticle(article); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={18} /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); console.log('Delete clicked', article.id); handleDeleteArticle(article.id); }} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={18} /></button>
                         </div>
                       </div>
                       <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.excerpt}</p>
                       <div className="mt-2 flex items-center gap-3">
                         {getCategoryLabel(article.category) && (
                           <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{getCategoryLabel(article.category)}</span>
                         )}
                         <span className="text-xs text-gray-400">{article.date}</span>
                         {(article.sourceUrl || article.source) && (
                            <a 
                              href={article.sourceUrl || article.source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Globe size={10} /> Source
                            </a>
                          )}
                         <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                           <Heart size={12} fill="currentColor" /> {article.initialLikes || 0} Initial
                         </span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* --- TAB: BREAKING NEWS --- */}
        {activeTab === 'breaking' && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg text-slate-800">Add Breaking News</h2>
                </div>
                <form onSubmit={handleAddBreaking} className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="E.g. Election results declared..."
                    value={newBreakingText}
                    onChange={e => setNewBreakingText(e.target.value)}
                  />
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">
                    Add
                  </button>
                </form>
             </div>

             <div className="space-y-3">
               {breakingNews.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                   <span className="font-medium text-slate-800">{item.text}</span>
                   <button onClick={() => handleDeleteBreaking(item.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-full">
                     <Trash2 size={16} />
                   </button>
                 </div>
               ))}
               {breakingNews.length === 0 && <p className="text-center text-gray-500">No breaking news active.</p>}
             </div>
          </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && settings && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="font-bold text-xl mb-6 text-slate-800 border-b pb-4">General Site Settings</h2>
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={settings.appName || ''}
                      onChange={e => setSiteSettings({...settings, appName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tagline</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={settings.tagline || ''}
                      onChange={e => setSiteSettings({...settings, tagline: e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ticker Speed (Animation Duration)</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <span className="text-xs font-bold text-gray-500 uppercase">Fast</span>
                      <input 
                        type="range" 
                        min="10" 
                        max="120" 
                        step="5"
                        className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-red-600"
                        value={settings.tickerSpeed || 30}
                        onChange={e => setSiteSettings({...settings, tickerSpeed: parseInt(e.target.value)})}
                      />
                      <span className="text-xs font-bold text-gray-500 uppercase">Slow</span>
                      <div className="bg-white px-3 py-1 rounded border border-gray-300 font-mono font-bold text-blue-600 min-w-[60px] text-center">
                        {settings.tickerSpeed || 30}s
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Adjust how long it takes for the ticker to scroll across. Higher number = Slower speed.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Footer Description</label>
                  <textarea 
                    rows={3}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.description || ''}
                    onChange={e => setSiteSettings({...settings, description: e.target.value})}
                  ></textarea>
                </div>

                <h3 className="font-bold text-lg text-slate-800 pt-4 border-t">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={settings.contactEmail || ''}
                      onChange={e => setSiteSettings({...settings, contactEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={settings.contactPhone || ''}
                      onChange={e => setSiteSettings({...settings, contactPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.address || ''}
                    onChange={e => setSiteSettings({...settings, address: e.target.value})}
                  />
                </div>

                <h3 className="font-bold text-lg text-slate-800 pt-4 border-t">Social Links (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Facebook URL</label>
                    <input type="text" className="w-full px-3 py-2 border rounded" value={settings.socials?.facebook || ''} onChange={e => setSiteSettings({...settings, socials: {...(settings.socials || DEFAULT_SETTINGS.socials), facebook: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Twitter/X URL</label>
                    <input type="text" className="w-full px-3 py-2 border rounded" value={settings.socials?.twitter || ''} onChange={e => setSiteSettings({...settings, socials: {...(settings.socials || DEFAULT_SETTINGS.socials), twitter: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instagram URL</label>
                    <input type="text" className="w-full px-3 py-2 border rounded" value={settings.socials?.instagram || ''} onChange={e => setSiteSettings({...settings, socials: {...(settings.socials || DEFAULT_SETTINGS.socials), instagram: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">YouTube URL</label>
                    <input type="text" className="w-full px-3 py-2 border rounded" value={settings.socials?.youtube || ''} onChange={e => setSiteSettings({...settings, socials: {...(settings.socials || DEFAULT_SETTINGS.socials), youtube: e.target.value}})} />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <TrendingUp size={20} className="text-bhaskar-orange" /> Trending Keywords (Below Ticker)
                    </h3>
                    <button 
                      type="button"
                      onClick={handleFetchTrendingKeywords}
                      disabled={isFetchingTrending || articles.length === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-all disabled:opacity-50"
                    >
                      {isFetchingTrending ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      AI Fetch Trending
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">These 4 keywords will appear as links below the news ticker on the home page. Link them to specific article slugs.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keyword {i + 1}</span>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Label (Hindi/English)</label>
                          <input 
                            type="text" 
                            placeholder="E.g. बजट 2024"
                            className="w-full px-3 py-2 border rounded text-sm"
                            value={trendingKeywords[i]?.label || ''}
                            onChange={(e) => updateTrendingKeyword(i, 'label', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Article Slug</label>
                          <select 
                            className="w-full px-3 py-2 border rounded text-sm bg-white"
                            value={trendingKeywords[i]?.articleSlug || ''}
                            onChange={(e) => updateTrendingKeyword(i, 'articleSlug', e.target.value)}
                          >
                            <option value="">Select an article...</option>
                            {articles.map(a => (
                              <option key={a.id} value={a.slug}>{a.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSavingSettings}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingSettings ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSavingSettings ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB: TEMPLATES --- */}
        {activeTab === 'templates' && (
          <ReelTemplatesAdmin 
             settings={settings}
             onSaveSettings={async (updatedSettings) => {
               try {
                 const result = await saveSiteSettings(updatedSettings);
                 setSiteSettings(updatedSettings);
                 if (result.strippedColumns && result.strippedColumns.length > 0) {
                   alert(`Warning: The following fields were NOT saved due to missing columns in Supabase: ${result.strippedColumns.join(', ')}`);
                 }
               } catch (error: any) {
                 throw error; // Rethrow so ReelTemplatesAdmin can catch it and display it
               }
             }}
          />
        )}
      </>
    )}

      </div>

      {deletingArticleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeletingArticleId(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Delete Article?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this article? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingArticleId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showViralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowViralModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Auto Viral Post</h2>
              <button onClick={() => setShowViralModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Facebook Integration Setup</h3>
              <p className="text-sm text-blue-700 mb-2">To automatically post to Facebook, you must manually complete these steps:</p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Create a Facebook App in the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="underline font-bold">Facebook Developer Portal</a>.</li>
                <li>Add the "Facebook Login for Business" product and get a <strong>Page Access Token</strong> with <code>pages_manage_posts</code> and <code>pages_read_engagement</code> permissions.</li>
                <li>Find your <strong>Facebook Page ID</strong>.</li>
                <li>Add these to your environment variables as <code>FB_PAGE_ID</code> and <code>FB_PAGE_ACCESS_TOKEN</code>.</li>
              </ol>
            </div>

            {!viralPost ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3">Select News Source</h3>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="viralSource" 
                        value="latest_post"
                        checked={viralSourceType === 'latest_post'}
                        onChange={() => setViralSourceType('latest_post')}
                        className="accent-blue-600"
                      />
                      <span className="text-sm font-medium">Latest Published Post</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="viralSource" 
                        value="select_article"
                        checked={viralSourceType === 'select_article'}
                        onChange={() => setViralSourceType('select_article')}
                        className="accent-blue-600"
                      />
                      <span className="text-sm font-medium">Select Article</span>
                    </label>
                  </div>

                  {viralSourceType === 'latest_post' && (
                    <p className="text-gray-600 text-sm bg-white p-3 rounded border">
                      Will generate from the latest article published within the last 12 hours.
                    </p>
                  )}

                  {viralSourceType === 'select_article' && (
                    <div className="space-y-3">
                      <select
                        value={viralSelectedArticleId}
                        onChange={(e) => setViralSelectedArticleId(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">-- Select an Article --</option>
                        {articles.map((article) => (
                          <option key={article.id} value={article.id}>
                            {new Date(article.published_at || article.created_at || '').toLocaleDateString('en-IN')} - {article.title}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">Pick any article from your database to generate a viral post.</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Reference Image (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Upload a real photo of a leader, place, or event. The AI will use this as a reference to create a more accurate and attractive viral image.</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleViralReferenceImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {viralReferenceImage && (
                    <img src={viralReferenceImage} alt="Reference" className="mt-4 h-48 object-cover rounded-lg border" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Wand2 size={16} className="text-blue-500" />
                    Custom Styling & Format Prompt (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Provide guidance to the AI on how the post should be created (e.g., "Make it very aggressive", "Focus on the financial impact", "Use a dark theme for the image").</p>
                  <textarea
                    value={viralCustomPrompt}
                    onChange={(e) => setViralCustomPrompt(e.target.value)}
                    placeholder="E.g., Make the headline extremely shocking and use red highlights..."
                    className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image Generation AI Model</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                    value={viralImageGenModel}
                    onChange={(e) => setViralImageGenModel(e.target.value as 'gemini' | 'cloudflare')}
                    disabled={isGeneratingViral}
                  >
                    <option value="gemini">Gemini API</option>
                    <option value="cloudflare">Cloudflare Workers AI (Stable Diffusion)</option>
                  </select>
                </div>

                <button 
                  onClick={handleGenerateViralPost}
                  disabled={isGeneratingViral}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingViral ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  {isGeneratingViral ? 'Generating Viral Content...' : 'Generate Viral Post'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Edit Form */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Edit Content</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme / Format</label>
                    <select 
                      value={viralPost.theme || 'breaking_red'} 
                      onChange={e => setViralPost({...viralPost, theme: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="breaking_red">1. Default Breaking News</option>
                      <option value="question_hook">2. Question Hook</option>
                      <option value="shock_yellow">3. Shocking News</option>
                      <option value="story_dark">4. Narrative Hook</option>
                      <option value="fact_light">5. Informational Bullet Points</option>
                      <option value="warning_alert">6. Cautionary Alert</option>
                      <option value="step_by_step">7. Sequential Story Step</option>
                      <option value="video_reel">8. Video Style Hook</option>
                      <option value="minimal_white">9. Clean Minimal Text</option>
                      <option value="opinion_poll">10. Opinion Poll</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Breaking Tag</label>
                    <input 
                      type="text" 
                      value={viralPost.breaking_tag} 
                      onChange={e => setViralPost({...viralPost, breaking_tag: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Headline Line 1</label>
                    <input 
                      type="text" 
                      value={viralPost.headline_line_1} 
                      onChange={e => setViralPost({...viralPost, headline_line_1: e.target.value})}
                      className="w-full p-2 border rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Headline Line 2</label>
                    <input 
                      type="text" 
                      value={viralPost.headline_line_2} 
                      onChange={e => setViralPost({...viralPost, headline_line_2: e.target.value})}
                      className="w-full p-2 border rounded-lg font-bold"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                    <textarea 
                      value={viralPost.subheadline} 
                      onChange={e => setViralPost({...viralPost, subheadline: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branding</label>
                    <input 
                      type="text" 
                      value={viralPost.branding} 
                      onChange={e => setViralPost({...viralPost, branding: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Caption</label>
                    <textarea 
                      value={viralPost.caption} 
                      onChange={e => setViralPost({...viralPost, caption: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                    <input 
                      type="text" 
                      value={(viralPost.hashtags || []).join(' ')} 
                      onChange={e => setViralPost({...viralPost, hashtags: e.target.value.split(' ')})}
                      className="w-full p-2 border rounded-lg text-blue-600"
                    />
                  </div>
                </div>

                {/* Preview & Actions */}
                <div className="space-y-6">
                  <h3 className="font-bold text-lg border-b pb-2">Preview & Post</h3>
                  
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    {viralGeneratedImage ? (
                      <img src={viralGeneratedImage} alt="Generated Viral" className="w-full aspect-[4/5] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-gray-100 flex items-center justify-center text-gray-400">
                        <RefreshCw className="animate-spin" size={32} />
                      </div>
                    )}
                    <div className="p-4 bg-white">
                      <p className="text-sm mb-2">{viralPost.caption}</p>
                      <p className="text-xs text-blue-600">{(viralPost.hashtags || []).join(' ')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Wand2 size={16} className="text-blue-500" />
                        Feedback for Regeneration (Optional)
                      </label>
                      <textarea
                        value={viralRegeneratePrompt}
                        onChange={(e) => setViralRegeneratePrompt(e.target.value)}
                        placeholder="E.g., Make the caption shorter, change the highlight words, use a different image style..."
                        className="w-full p-3 border rounded-lg h-20 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    <div className="border-t pt-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Schedule Post (Optional)</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank to post immediately. Must be at least 10 minutes in the future.</p>
                    </div>
                    <div className="flex gap-4">
                      {fbPreviewLink ? (
                        <>
                          <a 
                            href={fbPreviewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-3 border border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 flex items-center justify-center gap-2"
                          >
                            <ExternalLink size={20} />
                            View Preview
                          </a>
                          <button 
                            onClick={handleApproveAndPublishFbPost}
                            disabled={isApprovingFbPost}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isApprovingFbPost ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                            {isApprovingFbPost ? 'Publishing...' : 'Approve & Publish'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={handleRegenerateViralPost}
                            disabled={isGeneratingViral}
                            className="flex-1 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isGeneratingViral ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                            {isGeneratingViral ? 'Regenerating...' : 'Regenerate'}
                          </button>
                          <button 
                            onClick={handleCreateFacebookPreview}
                            disabled={isPostingToFacebook || !viralGeneratedImage || isGeneratingViral}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isPostingToFacebook ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {isPostingToFacebook ? 'Creating...' : (scheduledTime ? 'Schedule Dark Post' : 'Create Preview')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showReelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowReelModal(false)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <ReelWizard articles={articles} settings={settings} onClose={() => setShowReelModal(false)} />
          </div>
        </div>
      )}

      {/* Auto Fetch Daily News Modal */}
      {showDailyNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowDailyNewsModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
              <Zap className="text-orange-600" /> Auto Fetch Daily News
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Fetch the freshest news directly from Google News RSS. AI will rewrite it with human emotion and create an original article.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select AI Model</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none mb-4"
                  value={dailyNewsModel}
                  onChange={(e) => setDailyNewsModel(e.target.value as 'gemini' | 'openrouter')}
                  disabled={isFetchingDailyNews}
                >
                  <option value="gemini">Gemini 3.1 Pro (Default)</option>
                  <option value="openrouter">OpenRouter Free (Substitute)</option>
                </select>

                <label className="block text-sm font-bold text-gray-700 mb-2">Image Generation Strategy</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none mb-4"
                  value={dailyNewsImageStrategy}
                  onChange={(e) => setDailyNewsImageStrategy(e.target.value as 'auto' | 'manual')}
                  disabled={isFetchingDailyNews}
                >
                  <option value="auto">Auto-generate image with news</option>
                  <option value="manual">Create news only (Self-upload image later)</option>
                </select>

                {dailyNewsImageStrategy === 'auto' && (
                  <>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Image Generation AI Model</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none mb-4"
                      value={dailyNewsImageGenModel}
                      onChange={(e) => setDailyNewsImageGenModel(e.target.value as 'gemini' | 'cloudflare')}
                      disabled={isFetchingDailyNews}
                    >
                      <option value="gemini">Gemini API</option>
                      <option value="cloudflare">Cloudflare Workers AI (Stable Diffusion)</option>
                    </select>
                  </>
                )}

                <label className="block text-sm font-bold text-gray-700 mb-2">Google News RSS Links & Categories</label>
                <div className="flex flex-col gap-2 mb-3">
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newDailyNewsRssCategory}
                    onChange={(e) => setNewDailyNewsRssCategory(e.target.value as Category)}
                    disabled={isFetchingDailyNews}
                  >
                    {Object.values(Category).map(cat => (
                      <option key={cat} value={cat}>{getCategoryLabel(cat as Category) || cat}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="E.g., https://news.google.com/rss..."
                      value={newDailyNewsRssLink}
                      onChange={(e) => setNewDailyNewsRssLink(e.target.value)}
                      disabled={isFetchingDailyNews}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDailyNewsRssSource();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDailyNewsRssSource}
                      disabled={!newDailyNewsRssLink || isFetchingDailyNews}
                      className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-900 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {dailyNewsRssSources.length > 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-40 overflow-y-auto">
                    {dailyNewsRssSources.map((source, idx) => {
                      const status = rssStatus[source.url];
                      return (
                      <div key={idx} className="p-3 flex justify-between items-center group">
                        <div className="flex flex-col truncate mr-3 w-full">
                          <span className="text-xs font-bold text-orange-600 mb-0.5">{getCategoryLabel(source.category) || source.category}</span>
                          <span className="text-xs text-gray-600 truncate" title={source.url}>{source.url}</span>
                          {status && (
                            <span className={`text-xs mt-1 ${status.error ? 'text-red-500' : 'text-green-600 font-medium'}`}>
                              {status.error ? status.error : `${status.freshCount} fresh news available`}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDailyNewsRssSource(idx)}
                          disabled={isFetchingDailyNews || isCheckingRssStatus}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )})}
                  </div>
                ) : (
                  <p className="text-sm text-red-500 italic py-2">Please add at least one RSS link.</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCheckDailyNewsStatus}
                  disabled={isCheckingRssStatus || dailyNewsRssSources.length === 0}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {isCheckingRssStatus ? (
                    <><RefreshCw className="animate-spin" size={14} /> Checking...</>
                  ) : (
                    <><RefreshCw size={14} /> Check Status</>
                  )}
                </button>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-4 mb-2">
                <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                  <RefreshCw size={16} /> Background Scheduler loop
                </h3>
                <p className="text-xs text-orange-700 mb-4">
                  Run automatically in the background <strong>while this Admin page is open</strong>. (The site is serverless, so a background task needs to be driven by a loaded admin tab to avoid limits).
                </p>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-orange-900 cursor-pointer flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-orange-600"
                      checked={isAutoSchedulerEnabled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsAutoSchedulerEnabled(val);
                        localStorage.setItem('kkt_auto_scheduler_enabled', String(val));
                      }}
                    />
                    Enable Auto Fetch Loop
                  </label>
                </div>
                {isAutoSchedulerEnabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-orange-800">Fetch every</span>
                    <input 
                      type="number" 
                      className="w-20 px-2 py-1 text-sm border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                      min="1"
                      max="1440"
                      value={autoSchedulerInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        setAutoSchedulerInterval(val);
                        localStorage.setItem('kkt_auto_scheduler_interval', String(val));
                      }}
                    />
                    <span className="text-sm text-orange-800">minutes</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => setShowDailyNewsModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                  disabled={isFetchingDailyNews || isCheckingRssStatus}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFetchDailyNews}
                  disabled={isFetchingDailyNews || isCheckingRssStatus}
                  className="flex-[2] py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isFetchingDailyNews ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                  {isFetchingDailyNews ? 'Fetching & Generating...' : 'Start Fetching'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
