import React from 'react';
import { useApp } from '../context/AppContext';

const Ticker: React.FC = () => {
  const { breakingNews: newsList, settings } = useApp();
  const speed = settings.tickerSpeed || 30;

  if (newsList.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white flex items-center h-10 overflow-hidden border-b border-slate-800">
      <div className="bg-red-600 h-full px-4 flex items-center font-bold text-sm shrink-0 z-10 shadow-md uppercase tracking-wider">
        Breaking News
      </div>
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div 
          className="animate-ticker whitespace-nowrap flex gap-12"
          style={{ animationDuration: `${speed}s` }}
        >
          {/* Duplicating list to ensure smooth infinite scroll */}
          {newsList.concat(newsList).map((news: any, idx: number) => (
            <span key={`${news.id}-${idx}`} className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
              {news.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ticker;
