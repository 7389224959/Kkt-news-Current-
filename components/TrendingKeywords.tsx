import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TrendingUp } from 'lucide-react';

const TrendingKeywords: React.FC = () => {
  const { trendingKeywords: keywords } = useApp();

  if (keywords.length === 0) return null;

  return (
    <div className="bg-gray-50 border-b border-gray-100 py-2">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <TrendingUp size={14} className="text-bhaskar-orange" />
            <span className="text-[11px] font-black text-bhaskar-dark uppercase tracking-wider">ट्रेंडिंग:</span>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            {keywords.map((kw) => (
              <Link
                key={kw.id}
                to={kw.articleSlug ? `/article/${kw.articleSlug}` : '#'}
                className="text-[13px] font-bold text-gray-600 hover:text-bhaskar-orange transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span className="text-gray-300">#</span>
                {kw.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingKeywords;
