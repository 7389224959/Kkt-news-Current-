import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { Clock, MessageSquare, Share2, Heart, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsImage from './NewsImage';
import { calculateDynamicLikes, formatLikes, getCategoryLabel } from '../newsUtils';

interface NewsCardProps {
  article: Article;
  variant?: 'vertical' | 'horizontal' | 'featured' | 'compact';
  isTrending?: boolean;
  priority?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, variant = 'vertical', isTrending = false, priority = false }) => {
  const [liked, setLiked] = useState(false);
  const categoryLabel = getCategoryLabel(article.category);

  useEffect(() => {
    const savedLikes = JSON.parse(localStorage.getItem('kkt_likes') || '{}');
    setLiked(!!savedLikes[article.id]);
  }, [article.id]);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    
    const savedLikes = JSON.parse(localStorage.getItem('kkt_likes') || '{}');
    if (newLiked) {
      savedLikes[article.id] = true;
    } else {
      delete savedLikes[article.id];
    }
    localStorage.setItem('kkt_likes', JSON.stringify(savedLikes));
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/#/article/${article.slug || article.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Featured Layout (Large Hero style)
  if (variant === 'featured') {
    return (
      <Link to={`/article/${article.slug || article.id}`} className="group block relative overflow-hidden rounded-xl bg-bhaskar-dark">
        <div className="aspect-[16/9] md:aspect-[21/9] w-full relative">
          <NewsImage 
            src={article.image || article.imageUrl || ''} 
            alt={article.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            fallbackText="News"
            priority={priority}
          />
          {article.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors z-10">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl border border-white/40 backdrop-blur-sm">
                <Play className="w-6 h-6 md:w-8 md:h-8 text-bhaskar-orange translate-x-1" fill="currentColor" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bhaskar-dark via-bhaskar-dark/40 to-transparent z-0"></div>
          <div className="absolute bottom-0 left-0 p-4 md:p-8 w-full z-20">
            <span className="bg-bhaskar-orange text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-wider mb-2 inline-block">
              {categoryLabel || 'TOP NEWS'}
            </span>
            <h2 className="text-xl md:text-4xl font-bold text-white leading-tight mb-3 group-hover:text-bhaskar-orange transition-colors">
              {article.title}
            </h2>
            <div className="flex items-center gap-4 text-gray-300 text-xs md:text-sm">
              <span className="flex items-center gap-1"><Clock size={14} /> {article.date || 'Today'}</span>
              <span className="flex items-center gap-1"><Heart size={14} className={liked ? 'text-bhaskar-orange fill-current' : ''} /> {formatLikes(calculateDynamicLikes(article) + (liked ? 1 : 0))}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Horizontal Layout (Sidebar or List style)
  if (variant === 'horizontal') {
    return (
      <Link to={`/article/${article.slug || article.id}`} className="flex gap-3 group py-3 border-b border-gray-100 last:border-0">
        <div className="w-24 h-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 relative">
          <NewsImage 
            src={article.image || article.imageUrl || ''} 
            alt={article.title} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            fallbackText="News"
          />
          {article.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg border border-white/40">
                <Play className="w-3.5 h-3.5 text-bhaskar-orange translate-x-0.5" fill="currentColor" />
              </div>
            </div>
          )}
          {isTrending && (
            <div className="absolute top-0 left-0 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-br-lg">
              HOT
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <span className="category-tag">{categoryLabel}</span>
          <h3 className="text-sm font-bold text-bhaskar-dark leading-snug line-clamp-3 group-hover:text-bhaskar-orange transition-colors">
            {article.title}
          </h3>
        </div>
      </Link>
    );
  }

  // Compact Layout (Grid style)
  return (
    <Link to={`/article/${article.slug || article.id}`} className="group flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <NewsImage 
          src={article.image || article.imageUrl || ''} 
          alt={article.title} 
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          fallbackText={article.category}
          priority={priority}
        />
        {article.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg border border-white/40">
              <Play className="w-5 h-5 text-bhaskar-orange translate-x-0.5" fill="currentColor" />
            </div>
          </div>
        )}
        {isTrending && (
          <div className="absolute top-3 left-3 bg-bhaskar-orange text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-lg">
            TRENDING
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <span className="category-tag">{categoryLabel}</span>
        <h3 className="text-lg font-bold text-bhaskar-dark leading-tight mb-3 line-clamp-3 group-hover:text-bhaskar-orange transition-colors">
          {article.title}
        </h3>
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock size={12} /> {article.date || 'Today'}</span>
            <span className="flex items-center gap-1"><Heart size={12} className={liked ? 'text-bhaskar-orange fill-current' : ''} /> {formatLikes(calculateDynamicLikes(article) + (liked ? 1 : 0))}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLike} className={`p-1.5 rounded-full hover:bg-gray-100 ${liked ? 'text-bhaskar-orange' : ''}`}>
              <Heart size={14} fill={liked ? "currentColor" : "none"} />
            </button>
            <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-gray-100">
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;
