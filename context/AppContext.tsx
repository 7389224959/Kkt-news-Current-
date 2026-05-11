import React, { createContext, useContext, useState, useEffect } from 'react';
import { Article, BreakingNews, SiteSettings, TrendingKeyword } from '../types';
import { getArticles, getBreakingNews, getSiteSettings, getTrendingKeywords } from '../services/articleService';
import { DEFAULT_SETTINGS } from '../constants';

interface AppContextType {
  articles: Article[];
  breakingNews: BreakingNews[];
  settings: SiteSettings;
  trendingKeywords: TrendingKeyword[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  loadMoreArticles: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ARTICLES_PER_PAGE = 10;

  const loadData = async (page: number = 1) => {
    if (page === 1) setIsLoading(true);
    try {
      // Fetch articles from Supabase
      const { data: newArticles, count } = await getArticles(page, ARTICLES_PER_PAGE);
      
      if (page === 1) {
        setArticles(newArticles);
        setTotalPages(Math.ceil(count / ARTICLES_PER_PAGE));
        
        // Fetch breaking news, settings, and trending keywords from Supabase
        try {
          const [newsData, settingsData, keywordsData] = await Promise.all([
            getBreakingNews(),
            getSiteSettings(),
            getTrendingKeywords()
          ]);
          
          setBreakingNews(newsData || []);
          if (settingsData) {
            setSettings(settingsData);
          }
          setTrendingKeywords(keywordsData || []);
        } catch (newsError) {
          console.error('Error loading settings/breaking news/keywords:', newsError);
        }
      } else {
        setArticles(prev => [...prev, ...newArticles]);
      }
      
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading app data:', error);
      if (page === 1) {
        setArticles([]);
      }
    } finally {
      if (page === 1) setIsLoading(false);
    }
  };

  const loadMoreArticles = async () => {
    if (currentPage < totalPages) {
      await loadData(currentPage + 1);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppContext.Provider value={{ 
      articles, 
      breakingNews, 
      settings, 
      trendingKeywords,
      isLoading, 
      currentPage,
      totalPages,
      loadMoreArticles,
      refreshData: () => loadData(1) 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
