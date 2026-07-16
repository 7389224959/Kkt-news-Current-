import React from 'react';
import { TrendingUp, Users, Radio } from 'lucide-react';

const PromoBanner = () => {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl mb-8 bg-[#0b132b] text-white border border-[#1e2a4a] shadow-xl">
      {/* Background Graphic Elements */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 md:w-2/3 opacity-30 pointer-events-none">
        <svg viewBox="0 0 800 400" className="w-full h-full object-cover" preserveAspectRatio="none">
          <path d="M0,400 L200,300 L300,350 L500,150 L650,200 L800,0" fill="none" stroke="rgba(255,215,0,0.5)" strokeWidth="4" />
          <path d="M0,400 L200,300 L300,350 L500,150 L650,200 L800,0 L800,400 Z" fill="url(#grad1)" opacity="0.2" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'rgb(255,215,0)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(255,215,0)', stopOpacity: 0 }} />
            </linearGradient>
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.1)" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
          
          {/* Decorative glowing lines */}
          <path d="M-100,200 L300,100 L500,250 L900,50" fill="none" stroke="#3b82f6" strokeWidth="2" className="opacity-50" />
          <path d="M-100,300 L400,150 L600,200 L900,-50" fill="none" stroke="#8b5cf6" strokeWidth="1" className="opacity-30" />
          
          {/* Glowing nodes */}
          <circle cx="300" cy="100" r="4" fill="#60a5fa" className="shadow-[0_0_10px_#60a5fa]" />
          <circle cx="500" cy="250" r="3" fill="#60a5fa" />
          <circle cx="600" cy="200" r="5" fill="#3b82f6" />
        </svg>
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Side: Brand Logo / Title */}
        <div className="flex-shrink-0 text-center md:text-left border-b md:border-b-0 md:border-r border-[#1e2a4a] pb-6 md:pb-0 md:pr-10">
          <div className="flex flex-col">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight mb-2">
              KKT NEWS
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-yellow-300 to-yellow-600 mb-3 mx-auto md:mx-0"></div>
            <p className="text-slate-400 font-medium text-sm md:text-base tracking-wide uppercase">
              AI-Powered Digital News Network
            </p>
          </div>
        </div>

        {/* Right Side: Stats & Info */}
        <div className="flex-grow flex flex-col justify-center max-w-3xl">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-white mb-4 leading-tight text-center md:text-left">
            Reaching <span className="text-white">2.5 Lakh+</span><br/>
            Chhattisgarhis Every Month
          </h3>
          <p className="text-slate-300 mb-8 text-sm md:text-base text-center md:text-left max-w-2xl leading-relaxed">
            <span className="text-yellow-400 font-medium">Across Web, Facebook & Video</span> — distributed through 
            a network of 5 Lakh+ local group members.
          </p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            {/* Stat Box 1 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 flex flex-col items-center md:items-start transition-all hover:bg-white/10 hover:border-white/20">
              <span className="text-xl md:text-2xl font-bold text-yellow-500 mb-1">2.5 Lakh+</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                 Monthly Reach
              </span>
            </div>
            
            {/* Stat Box 2 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 flex flex-col items-center md:items-start transition-all hover:bg-white/10 hover:border-white/20">
              <span className="text-xl md:text-2xl font-bold text-white mb-1">65K+</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                 Facebook
              </span>
            </div>
            
            {/* Stat Box 3 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 flex flex-col items-center md:items-start transition-all hover:bg-white/10 hover:border-white/20">
              <span className="text-xl md:text-2xl font-bold text-white mb-1">24/7</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                 AI Newsroom
              </span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PromoBanner;
