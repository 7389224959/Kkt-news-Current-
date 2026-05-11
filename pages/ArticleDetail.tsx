import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { Article } from '../types';
import { Clock, User, Share2, MessageSquare, Heart, Globe, ChevronRight, Bookmark, ArrowLeft } from 'lucide-react';
import NewsImage from '../components/NewsImage';
import { calculateDynamicLikes, formatLikes, getCategoryLabel } from '../newsUtils';
import { getArticleBySlug } from '../services/articleService';
import Markdown from 'react-markdown';

const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { articles, isLoading: isAppLoading } = useApp();
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<{id: number, text: string, date: string}[]>([]);
  const [showToast, setShowToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      setIsLoading(true);
      
      let found = articles.find(a => a.slug === slug || a.id === slug);
      
      if (!found) {
        found = await getArticleBySlug(slug) || undefined;
      }
      
      if (found) {
        setArticle(found);
        
        const savedLikes = JSON.parse(localStorage.getItem('kkt_likes') || '{}');
        setLiked(!!savedLikes[found.id]);

        const savedComments = JSON.parse(localStorage.getItem(`kkt_comments_${found.id}`) || '[]');
        setComments(savedComments);

        const related = articles
          .filter(a => a.id !== found.id && a.category === found.category)
          .slice(0, 5);
        
        if (related.length < 3) {
          const extra = articles
            .filter(a => a.id !== found.id && a.category !== found.category)
            .slice(0, 5 - related.length);
          setRelatedArticles([...related, ...extra]);
        } else {
          setRelatedArticles(related);
        }
      }
      
      window.scrollTo(0, 0);
      setIsLoading(false);
    };
    
    if (!isAppLoading) {
      loadData();
    }
  }, [slug, articles, isAppLoading]);

  const triggerToast = (message: string) => {
    setShowToast({ show: true, message });
    setTimeout(() => setShowToast({ show: false, message: '' }), 3000);
  };

  const handleLike = () => {
    if (!article) return;
    const newLiked = !liked;
    setLiked(newLiked);
    
    const savedLikes = JSON.parse(localStorage.getItem('kkt_likes') || '{}');
    if (newLiked) {
      savedLikes[article.id] = true;
    } else {
      delete savedLikes[article.id];
    }
    localStorage.setItem('kkt_likes', JSON.stringify(savedLikes));
    
    triggerToast(newLiked ? "लेख पसंद आया!" : "पसंद हटाया गया");
  };

  const handleShare = async () => {
    if (!article) return;
    
    const canonicalUrl = `https://kktnews.vercel.app/article/${article.slug}`;
    const shareData = {
      title: article.title,
      text: article.summary || article.excerpt || article.title,
      url: canonicalUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        triggerToast("सफलतापूर्वक साझा किया गया!");
      } catch (err: any) {
        if (err.name !== 'AbortError' && !err.message?.includes('canceled')) {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(canonicalUrl);
        triggerToast("लिंक कॉपी किया गया!");
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !article) return;
    
    const newComment = {
      id: Date.now(),
      text: commentText,
      date: new Date().toLocaleString('hi-IN')
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    setCommentText('');
    
    localStorage.setItem(`kkt_comments_${article.id}`, JSON.stringify(updatedComments));
    
    triggerToast("कमेंट पोस्ट किया गया!");
  };

  if (isAppLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-bhaskar-orange/20 border-t-bhaskar-orange rounded-full animate-spin mb-4"></div>
        <p className="text-bhaskar-dark font-bold animate-pulse">खबर लोड हो रही है...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-6 bg-white px-4 text-center">
        <div className="bg-gray-100 p-8 rounded-full">
          <Globe size={64} className="text-gray-300" />
        </div>
        <h2 className="text-3xl font-black text-bhaskar-dark">खबर नहीं मिली</h2>
        <p className="text-gray-500 max-w-md">क्षमा करें, जिस खबर को आप ढूंढ रहे हैं वह उपलब्ध नहीं है या हटा दी गई है।</p>
        <Link to="/" className="bg-bhaskar-orange text-white px-8 py-3 rounded-sm font-bold hover:bg-bhaskar-orange/90 transition-all flex items-center gap-2">
          <ArrowLeft size={20} /> होम पेज पर जाएं
        </Link>
      </div>
    );
  }

  const articleUrl = `https://kktnews.vercel.app/article/${encodeURIComponent(article.slug || '')}`;
  let imageUrl = article.image || article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80";
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = imageUrl.startsWith('/') ? `https://kktnews.vercel.app${imageUrl}` : `https://kktnews.vercel.app/${imageUrl}`;
  }
  try {
    imageUrl = new URL(imageUrl).href;
  } catch (e) {
    imageUrl = encodeURI(imageUrl);
  }
  const summary = article.summary || article.excerpt || article.title;
  const publishedAt = article.published_at || article.created_at || new Date().toISOString();
  const updatedAt = article.updated_at || publishedAt;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": [imageUrl],
    "datePublished": publishedAt,
    "dateModified": updatedAt,
    "author": {
      "@type": "Organization",
      "name": "KKT News"
    },
    "publisher": {
      "@type": "Organization",
      "name": "KKT News",
      "logo": {
        "@type": "ImageObject",
        "url": "https://kktnews.vercel.app/logo.png"
      }
    },
    "description": summary,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <Helmet>
        <title>{article.title}</title>
        <meta name="description" content={summary} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={summary} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={articleUrl} />
        <meta property="og:site_name" content="KKT News" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={summary} />
        <meta name="twitter:image" content={imageUrl} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Link to="/" className="hover:text-bhaskar-orange">होम</Link>
            <ChevronRight size={12} />
            <Link to={`/category/${article.category}`} className="hover:text-bhaskar-orange">
              {getCategoryLabel(article.category)}
            </Link>
            <ChevronRight size={12} className="hidden md:block" />
            <span className="text-bhaskar-dark hidden md:block truncate max-w-[300px]">{article.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <article>
              <div className="mb-6">
                <span className="bg-bhaskar-orange text-white px-3 py-1 text-xs font-black uppercase rounded-sm mb-4 inline-block">
                  {getCategoryLabel(article.category)}
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-bhaskar-dark leading-[1.15] mb-6">
                  {article.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-y-4 gap-x-6 py-6 border-t border-b border-gray-100 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-bhaskar-dark">{article.author}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">KKT REPORTER</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {article.published_at ? new Date(article.published_at).toLocaleString('hi-IN', { dateStyle: 'long', timeStyle: 'short' }) : (article.date || '')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 ml-auto">
                    <button onClick={handleLike} className={`flex items-center gap-1.5 transition-all ${liked ? 'text-bhaskar-orange' : 'text-gray-400 hover:text-bhaskar-orange'}`}>
                      <Heart size={20} fill={liked ? "currentColor" : "none"} />
                      <span className="text-xs font-black">{formatLikes(calculateDynamicLikes(article) + (liked ? 1 : 0))}</span>
                    </button>
                    <button onClick={handleShare} className="text-gray-400 hover:text-bhaskar-orange transition-all">
                      <Share2 size={20} />
                    </button>
                    <button className="text-gray-400 hover:text-bhaskar-orange transition-all">
                      <Bookmark size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-10 rounded-sm overflow-hidden bg-gray-100 aspect-video relative group">
                <NewsImage 
                  src={article.image || article.imageUrl || ''} 
                  alt={article.title} 
                  className="w-full h-full object-cover" 
                  fallbackText={article.title}
                  priority={true}
                />
                {article.imageCaption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 text-xs font-medium backdrop-blur-sm">
                    {article.imageCaption}
                  </div>
                )}
              </div>

              <div className="prose prose-lg max-w-none text-bhaskar-dark leading-relaxed font-medium">
                {article.summary && (
                  <div className="bg-gray-50 p-6 border-l-4 border-bhaskar-orange mb-8 rounded-r-sm italic text-xl text-gray-700 font-bold leading-relaxed">
                    {article.summary}
                  </div>
                )}
                
                <div className="markdown-body">
                  <Markdown>{article.content}</Markdown>
                </div>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2 flex items-center">टैग्स:</span>
                  {article.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-sm text-xs font-bold hover:bg-bhaskar-orange hover:text-white transition-all cursor-pointer">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {article.source && (
                <div className="mt-10 p-6 bg-gray-50 rounded-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Globe size={20} className="text-bhaskar-orange" />
                    <span className="text-sm font-bold text-gray-600">मूल स्रोत:</span>
                  </div>
                  <a 
                    href={article.source} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-bhaskar-dark text-white px-6 py-2 rounded-sm text-xs font-black uppercase tracking-widest hover:bg-bhaskar-orange transition-all"
                  >
                    पूरी रिपोर्ट देखें
                  </a>
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-16 pt-12 border-t border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-bhaskar-dark">कमेंट्स ({comments.length})</h3>
                  <button 
                    onClick={() => setShowComments(!showComments)}
                    className="text-bhaskar-orange font-black text-sm uppercase tracking-widest flex items-center gap-2"
                  >
                    <MessageSquare size={18} /> {showComments ? 'बंद करें' : 'लिखें'}
                  </button>
                </div>
                
                {(showComments || comments.length > 0) && (
                  <div className="space-y-8">
                    <form onSubmit={handleCommentSubmit} className="bg-gray-50 p-6 rounded-sm border border-gray-100">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="अपनी राय साझा करें..."
                        className="w-full p-4 rounded-sm border border-gray-200 focus:ring-2 focus:ring-bhaskar-orange/20 focus:border-bhaskar-orange outline-none min-h-[120px] mb-4 font-medium"
                      />
                      <button 
                        type="submit"
                        className="bg-bhaskar-orange text-white px-10 py-3 rounded-sm font-black uppercase tracking-widest hover:bg-bhaskar-orange/90 transition-all text-sm"
                      >
                        कमेंट पोस्ट करें
                      </button>
                    </form>

                    <div className="space-y-6">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-4 p-6 border-b border-gray-50 last:border-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                            <User size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-black text-bhaskar-dark">पाठक</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{comment.date}</span>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-10">
            {/* Related News */}
            <div className="sticky top-24">
              <div className="mb-6 flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <h3 className="font-black text-xl text-bhaskar-dark uppercase tracking-tight">संबंधित खबरें</h3>
                <div className="w-12 h-1 bg-bhaskar-orange"></div>
              </div>
              
              <div className="space-y-6">
                {relatedArticles.map((related, idx) => (
                  <Link key={related.id} to={`/article/${related.slug || related.id}`} className="flex gap-4 group">
                    <div className="w-24 h-24 shrink-0 rounded-sm overflow-hidden bg-gray-100">
                      <NewsImage 
                        src={related.image || related.imageUrl || ''} 
                        alt={related.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        fallbackText={related.title}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-bhaskar-dark group-hover:text-bhaskar-orange transition-colors line-clamp-3 leading-snug mb-2">
                        {related.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>{getCategoryLabel(related.category)}</span>
                        <span>•</span>
                        <span>{related.published_at ? new Date(related.published_at).toLocaleDateString('hi-IN') : (related.date || '')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Newsletter */}
              <div className="mt-12 bg-bhaskar-dark p-8 rounded-sm text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-bhaskar-orange/10 rounded-full -mr-12 -mt-12"></div>
                <h3 className="font-black text-white text-xl mb-3 relative z-10">खबरें मिस न करें!</h3>
                <p className="text-gray-400 text-sm mb-6 relative z-10 font-medium">लेटेस्ट अपडेट्स सीधे अपने इनबॉक्स में पाने के लिए सब्सक्राइब करें।</p>
                <div className="space-y-3 relative z-10">
                  <input 
                    type="email" 
                    placeholder="ईमेल पता" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-bhaskar-orange transition-all text-sm"
                  />
                  <button className="w-full bg-bhaskar-orange text-white px-6 py-3 rounded-sm font-black uppercase tracking-widest text-xs hover:bg-bhaskar-orange/90 transition-all">
                    सब्सक्राइब करें
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast.show && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-bhaskar-dark text-white px-8 py-4 rounded-sm shadow-2xl border-l-4 border-bhaskar-orange flex items-center gap-4 animate-slide-up">
            <div className="w-2 h-2 bg-bhaskar-orange rounded-full animate-ping"></div>
            <span className="font-black text-sm uppercase tracking-widest">{showToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;
