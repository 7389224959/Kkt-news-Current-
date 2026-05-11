import React from 'react';
import { useApp } from '../context/AppContext';
import { Category } from '../types';
import { sortArticlesByDate } from '../services/articleService';
import NewsCard from '../components/NewsCard';
import NewsImage from '../components/NewsImage';
import { ChevronRight, TrendingUp, Zap, Newspaper } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getCategoryLabel } from '../newsUtils';

const Home: React.FC = () => {
  const { category } = useParams<{ category?: string }>();
  const { articles, isLoading, currentPage, totalPages, loadMoreArticles } = useApp();

  if (isLoading) return (
    <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-bhaskar-orange rounded-full animate-spin"></div>
      <span className="mt-4 font-bold text-bhaskar-dark">ताजा खबरें लोड हो रही हैं...</span>
    </div>
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "name": "KKT News",
    "url": window.location.origin,
    "logo": `${window.location.origin}/logo.png`
  };

  if (articles.length === 0) return (
    <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-white">
      <Newspaper size={64} className="text-gray-200 mb-6" />
      <h2 className="text-2xl font-bold text-bhaskar-dark mb-4">अभी कोई खबर उपलब्ध नहीं है।</h2>
      <p className="text-gray-500 mb-8 max-w-md">हम जल्द ही आपके लिए ताजा खबरें लेकर आएंगे। कृपया बाद में फिर से देखें।</p>
      <Link to="/admin" className="bg-bhaskar-dark text-white px-8 py-3 rounded-full font-bold hover:bg-bhaskar-orange transition-all shadow-lg shadow-bhaskar-orange/10">एडमिन पैनल पर जाएं</Link>
    </div>
  );

  const getCategoryFromSlug = (slug: string): Category | null => {
    if (slug === 'politics') return Category.POLITICS;
    if (slug === 'state') return Category.STATE;
    if (slug === 'crime') return Category.CRIME;
    if (slug === 'jobs') return Category.JOBS;
    if (slug === 'sports') return Category.SPORTS;
    if (slug === 'bollywood') return Category.BOLLYWOOD;
    if (slug === 'lifestyle') return Category.LIFESTYLE;
    if (slug === 'viral') return Category.VIRAL;
    if (slug === 'war-room') return Category.WAR_ROOM;
    return null;
  };

  // Filter if category is present in URL
  const filteredArticles = sortArticlesByDate(category 
    ? articles.filter(a => a.category === getCategoryFromSlug(category))
    : articles);

  const pageTitle = category && category !== 'all' 
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} न्यूज़ | Khabar Kal Tak`
    : 'Khabar Kal Tak | ताज़ा हिंदी समाचार, ब्रेकिंग न्यूज़, छत्तीसगढ़ न्यूज़';

  const pageDescription = category && category !== 'all'
    ? `Khabar Kal Tak पर पढ़ें ${category} की ताज़ा खबरें और अपडेट।`
    : 'Khabar Kal Tak आपके लिए लाया है ताज़ा हिंदी समाचार, ब्रेकिंग न्यूज़ और छत्तीसगढ़ की हर छोटी-बड़ी खबर।';

  // If viewing a specific category, show a list layout
  if (category && category !== 'all') {
    return (
      <div className="bg-white min-h-screen">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
        </Helmet>
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
            <div className="w-2 h-8 bg-bhaskar-orange rounded-full"></div>
            <h1 className="text-3xl font-black text-bhaskar-dark capitalize tracking-tight">
              {category ? (getCategoryLabel(getCategoryFromSlug(category) as Category) || category) : ''}
            </h1>
          </div>

          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArticles.map(article => <NewsCard key={article.id} article={article} />)}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Newspaper size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">इस कैटेगरी में अभी कोई खबर नहीं है।</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default Home Layout
  const sortedAll = sortArticlesByDate(articles);
  const featuredArticle = sortedAll.find(a => a.isFeatured) || sortedAll[0];
  const trendingArticles = sortedAll.filter(a => a.isTrending && a.id !== featuredArticle.id).slice(0, 5);
  const otherArticles = sortedAll.filter(a => a.id !== featuredArticle.id && !trendingArticles.find(t => t.id === a.id));

  return (
    <div className="bg-white min-h-screen pb-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Main Featured Story */}
          <div className="lg:col-span-8">
            <NewsCard article={featuredArticle} variant="featured" priority={true} />
          </div>

          {/* Trending Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-gray-50 rounded-2xl p-6 h-full border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-bhaskar-orange" />
                <h3 className="text-xl font-black text-bhaskar-dark tracking-tight">ट्रेंडिंग खबरें</h3>
              </div>
              <div className="space-y-1">
                {(trendingArticles.length > 0 ? trendingArticles : sortedAll.slice(1, 6)).map((article) => (
                  <Link 
                    key={article.id} 
                    to={`/article/${article.slug || article.id}`}
                    className="flex gap-4 group py-4 border-b border-gray-200 last:border-0"
                  >
                    <div className="w-24 h-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 relative">
                      <NewsImage 
                        src={article.image || article.imageUrl || ''} 
                        alt={article.title} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        fallbackText="News"
                      />
                    </div>
                    <p className="text-[15px] font-bold text-bhaskar-dark leading-snug group-hover:text-bhaskar-orange transition-colors line-clamp-2">
                      {article.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Sections */}
        <div className="space-y-16">
          {/* State News Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-bhaskar-orange rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">Chhattisgarh News</h2>
              </div>
              <Link to="/category/state" className="text-bhaskar-orange font-bold text-sm flex items-center gap-1 hover:underline">
                सभी देखें <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.STATE).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {/* Politics Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">Nation Update</h2>
              </div>
              <Link to="/category/politics" className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:underline">
                सभी देखें <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.POLITICS).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {/* Sports & Entertainment Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-green-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">Sports & Entertainment</h2>
              </div>
              <div className="flex gap-4">
                <Link to="/category/sports" className="text-green-600 font-bold text-sm flex items-center gap-1 hover:underline">
                  खेल <ChevronRight size={16} />
                </Link>
                <Link to="/category/bollywood" className="text-green-600 font-bold text-sm flex items-center gap-1 hover:underline">
                  मनोरंजन <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.SPORTS || a.category === Category.BOLLYWOOD).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {/* War Room Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-red-700 rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">War Room</h2>
              </div>
              <Link to="/category/war-room" className="text-red-700 font-bold text-sm flex items-center gap-1 hover:underline">
                सभी देखें <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.WAR_ROOM).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {/* Viral Today Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">Viral Today</h2>
              </div>
              <Link to="/category/viral" className="text-yellow-600 font-bold text-sm flex items-center gap-1 hover:underline">
                सभी देखें <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.VIRAL).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {/* Lifestyle Section */}
          <section>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-bhaskar-dark tracking-tight uppercase">Lifestyle</h2>
              </div>
              <Link to="/category/lifestyle" className="text-purple-600 font-bold text-sm flex items-center gap-1 hover:underline">
                सभी देखें <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedAll.filter(a => a.category === Category.LIFESTYLE).slice(0, 4).map(article => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          {currentPage < totalPages && (
            <div className="mt-16 text-center">
              <button 
                onClick={loadMoreArticles}
                className="bg-bhaskar-dark text-white px-10 py-4 rounded-full font-bold hover:bg-bhaskar-orange transition-all shadow-xl shadow-bhaskar-orange/10 flex items-center gap-2 mx-auto"
              >
                और खबरें लोड करें <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
