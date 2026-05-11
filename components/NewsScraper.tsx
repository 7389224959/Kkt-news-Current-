import React, { useState } from 'react';
import { Search, CheckSquare, Square, RefreshCw, FileText, Check, X, Edit, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { rewriteArticle, getStockImageUrl } from '../services/geminiService';
import { createArticle } from '../services/articleService';
import { generateSlug } from '../newsUtils';
import { postToFacebook } from '../services/facebookService';

interface Headline {
  title: string;
  link: string;
}

interface ScrapedArticle {
  originalTitle: string;
  sourceUrl: string;
  rewrittenTitle?: string;
  rewrittenContent?: string;
  rewrittenExcerpt?: string;
  image?: string;
  tags?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'error' | 'loading';
  error?: string;
  isEditing?: boolean;
}

interface NewsScraperProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewsScraper: React.FC<NewsScraperProps> = ({ onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<Category>(Category.POLITICS);
  const [isFetchingHeadlines, setIsFetchingHeadlines] = useState(false);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  
  const [isProcessingArticles, setIsProcessingArticles] = useState(false);
  const [processedArticles, setProcessedArticles] = useState<ScrapedArticle[]>([]);

  const handleFetchHeadlines = async () => {
    if (!url) {
      alert("Please enter a URL");
      return;
    }
    
    setIsFetchingHeadlines(true);
    setHeadlines([]);
    setSelectedLinks(new Set());
    
    try {
      const response = await fetch(`/api/extract-links?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch headlines");
      }
      
      if (data.results && data.results.length > 0) {
        setHeadlines(data.results);
      } else {
        alert("No headlines found on this page.");
      }
    } catch (error: any) {
      alert(`Error fetching headlines: ${error.message}`);
    } finally {
      setIsFetchingHeadlines(false);
    }
  };

  const toggleSelection = (link: string) => {
    const newSelection = new Set(selectedLinks);
    if (newSelection.has(link)) {
      newSelection.delete(link);
    } else {
      newSelection.add(link);
    }
    setSelectedLinks(newSelection);
  };

  const processSelectedArticles = async () => {
    if (selectedLinks.size === 0) return;
    
    setIsProcessingArticles(true);
    
    const selectedHeadlines = headlines.filter(h => selectedLinks.has(h.link)).slice(0, 10); // Limit to 10
    
    const initialArticles: ScrapedArticle[] = selectedHeadlines.map(h => ({
      originalTitle: h.title,
      sourceUrl: h.link,
      status: 'loading'
    }));
    
    setProcessedArticles(initialArticles);
    
    for (let i = 0; i < initialArticles.length; i++) {
      const article = initialArticles[i];
      try {
        // 1. Fetch full article content
        const extractRes = await fetch(`/api/extract-article?url=${encodeURIComponent(article.sourceUrl)}`);
        const extractData = await extractRes.json();
        
        if (!extractRes.ok) {
          throw new Error(extractData.error || "Failed to extract article");
        }
        
        if (extractData.length < 400) {
          throw new Error("Article content too short (< 400 chars)");
        }
        
        // 2. Rewrite with AI
        const rewriteRes = await rewriteArticle(extractData.content, category);
        
        if (typeof rewriteRes === 'string') {
          throw new Error(rewriteRes); // AI Error
        }
        
        // 3. Get Stock Image
        const imageUrl = getStockImageUrl(rewriteRes.imageKeywords || "news", category);
        
        setProcessedArticles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            rewrittenTitle: rewriteRes.title,
            rewrittenContent: rewriteRes.content,
            rewrittenExcerpt: rewriteRes.excerpt,
            image: imageUrl,
            tags: rewriteRes.tags,
            status: 'pending'
          };
          return updated;
        });
        
      } catch (error: any) {
        setProcessedArticles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: error.message
          };
          return updated;
        });
      }
    }
    
    setIsProcessingArticles(false);
  };

  const handleApprove = async (index: number) => {
    const article = processedArticles[index];
    if (article.status !== 'pending' || !article.rewrittenTitle || !article.rewrittenContent) return;
    
    try {
      const newArticle = {
        title: article.rewrittenTitle,
        slug: generateSlug(article.rewrittenTitle),
        summary: article.rewrittenExcerpt || article.rewrittenContent.substring(0, 150) + '...',
        content: article.rewrittenContent,
        category: category,
        image: article.image || getStockImageUrl("news", category),
        tags: article.tags || [],
        published_at: new Date().toISOString(),
        is_breaking: false,
        source_url: article.sourceUrl
      };
      
      await createArticle(newArticle);
      
      // Try to post to Facebook
      try {
        await postToFacebook(
          `${newArticle.title}\n\nRead more: https://kktnews.vercel.app/article/${newArticle.slug}`,
          newArticle.image
        );
      } catch (fbError) {
        console.error("Failed to auto-post to Facebook:", fbError);
        // Don't fail the whole approval if FB fails
      }
      
      setProcessedArticles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'approved' };
        return updated;
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error approving article:", error);
      alert("Failed to save article.");
    }
  };

  const handleReject = (index: number) => {
    setProcessedArticles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'rejected' };
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="text-blue-600" /> News Scraper
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {processedArticles.length === 0 ? (
            <>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Homepage URL</label>
                  <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/news"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(Category).map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleFetchHeadlines}
                    disabled={isFetchingHeadlines || !url}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isFetchingHeadlines ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                    Fetch Headlines
                  </button>
                </div>
              </div>

              {headlines.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-800">Extracted Headlines ({headlines.length})</h4>
                    <button 
                      onClick={processSelectedArticles}
                      disabled={selectedLinks.size === 0 || isProcessingArticles}
                      className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Sparkles size={18} />
                      Fetch & Rewrite Selected ({selectedLinks.size})
                    </button>
                  </div>
                  
                  <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
                    {headlines.map((headline, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 hover:bg-gray-50 flex items-start gap-3 cursor-pointer"
                        onClick={() => toggleSelection(headline.link)}
                      >
                        <div className="mt-1 text-blue-600">
                          {selectedLinks.has(headline.link) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{headline.title}</p>
                          <a 
                            href={headline.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {headline.link}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-lg text-gray-800">Review & Approve</h4>
                <button 
                  onClick={() => setProcessedArticles([])}
                  className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                  Back to Headlines
                </button>
              </div>
              
              {processedArticles.map((article, idx) => (
                <div key={idx} className="border rounded-lg p-5 shadow-sm bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-gray-900">
                        {article.status === 'loading' ? 'Processing...' : (article.rewrittenTitle || 'No Title')}
                      </h5>
                      <p className="text-xs text-gray-500 mt-1">Source: <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{article.originalTitle}</a></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {article.status === 'loading' && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Processing</span>}
                      {article.status === 'error' && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Error</span>}
                      {article.status === 'approved' && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1"><Check size={12} /> Approved & Published</span>}
                      {article.status === 'rejected' && <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center gap-1"><X size={12} /> Rejected</span>}
                      {article.status === 'pending' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending Review</span>}
                    </div>
                  </div>
                  
                  {article.status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md mb-4">
                      {article.error}
                    </div>
                  )}
                  
                  {article.status === 'pending' && article.rewrittenContent && (
                    <>
                      {article.isEditing ? (
                        <div className="mb-4 space-y-3">
                          <input 
                            type="text" 
                            value={article.rewrittenTitle} 
                            onChange={(e) => setProcessedArticles(prev => {
                              const updated = [...prev];
                              updated[idx].rewrittenTitle = e.target.value;
                              return updated;
                            })}
                            className="w-full p-2 border rounded-md font-bold"
                          />
                          <textarea 
                            value={article.rewrittenContent} 
                            onChange={(e) => setProcessedArticles(prev => {
                              const updated = [...prev];
                              updated[idx].rewrittenContent = e.target.value;
                              return updated;
                            })}
                            className="w-full p-2 border rounded-md h-48 font-mono text-sm"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-md mb-4 max-h-48 overflow-y-auto text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: article.rewrittenContent }} />
                      )}
                      
                      <div className="flex gap-3 justify-end border-t pt-4">
                        <button 
                          onClick={() => handleReject(idx)}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 font-medium flex items-center gap-2"
                        >
                          <X size={16} /> Reject
                        </button>
                        <button 
                          onClick={() => setProcessedArticles(prev => {
                            const updated = [...prev];
                            updated[idx].isEditing = !updated[idx].isEditing;
                            return updated;
                          })}
                          className="px-4 py-2 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 font-medium flex items-center gap-2"
                        >
                          <Edit size={16} /> {article.isEditing ? 'Save Edits' : 'Edit'}
                        </button>
                        <button 
                          onClick={() => handleApprove(idx)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex items-center gap-2"
                        >
                          <Check size={16} /> Approve & Publish
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsScraper;
