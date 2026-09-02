import React from 'react';

const PromoBanner = () => {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-[#060a14] via-[#0d162a] to-[#060a14] text-white border border-[#1f2e4d] shadow-lg">
      
      {/* Glow Effects & Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-900/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-yellow-600/15 rounded-full blur-2xl"></div>
        
        {/* Geometric Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="premium-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#premium-grid)" />
        </svg>
      </div>

      <div className="relative z-10 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Brand Logo & Scope */}
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-5 text-center sm:text-left">
          <div className="shrink-0 flex flex-col items-center sm:items-start border-b sm:border-b-0 sm:border-r border-[#1f2e4d] pb-2 sm:pb-0 sm:pr-4">
            <h2 className="text-2xl md:text-3xl font-serif font-black text-white tracking-tight leading-none">
              KKT NEWS
            </h2>
            <div className="h-0.5 w-14 bg-gradient-to-r from-yellow-300 to-yellow-500 my-1 rounded-full"></div>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Digital News Network
            </span>
          </div>

          <div className="flex flex-col">
            <div className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">
              Reaching <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 font-black">1M+ Chhattisgarhis</span> Every Month
            </div>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              <span className="text-yellow-400 font-medium">Website, Instagram & Facebook</span> • <span className="text-white font-medium">5 Lakh+</span> group network
            </p>
          </div>
        </div>

        {/* Right Side: Compact Stats Chips */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-center">
          <div className="bg-[#152038]/80 border border-[#2a3c5a] rounded-lg px-3 py-1.5 flex flex-col items-center">
            <span className="text-sm md:text-base font-black text-yellow-400 leading-none">1M+</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Monthly Reach</span>
          </div>

          <div className="bg-[#152038]/80 border border-[#2a3c5a] rounded-lg px-3 py-1.5 flex flex-col items-center">
            <span className="text-xs md:text-sm font-bold text-white leading-none whitespace-nowrap">Web • Insta • FB</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Digital Channels</span>
          </div>

          <div className="bg-[#152038]/80 border border-[#2a3c5a] rounded-lg px-3 py-1.5 flex flex-col items-center">
            <span className="text-sm md:text-base font-black text-white leading-none">24/7</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">AI Newsroom</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PromoBanner;
