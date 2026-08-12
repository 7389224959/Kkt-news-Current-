import React from 'react';

const PromoBanner = () => {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-[#060a14] via-[#0d162a] to-[#060a14] text-white border border-[#1f2e4d] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
      
      {/* Premium Glow Effects & Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Top left subtle glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl"></div>
        {/* Bottom right gold glow */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl"></div>
        
        {/* Geometric Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="premium-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#premium-grid)" />
        </svg>

        {/* Elegant network curves */}
        <svg viewBox="0 0 800 400" className="absolute right-0 top-0 bottom-0 w-full h-full object-cover opacity-30 mix-blend-screen" preserveAspectRatio="none">
          <path d="M400,400 C500,300 450,150 650,200 C750,220 800,100 800,0" fill="none" stroke="url(#gold-grad)" strokeWidth="2" />
          <path d="M200,400 C300,250 500,300 700,50 L800,0" fill="none" stroke="rgba(96,165,250,0.3)" strokeWidth="1" />
          <defs>
            <linearGradient id="gold-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'rgb(253,224,71)', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'rgb(234,179,8)', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(202,138,4)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          
          {/* Light Nodes */}
          <circle cx="650" cy="200" r="3" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }} />
          <circle cx="700" cy="50" r="2" fill="#60a5fa" style={{ filter: 'drop-shadow(0 0 6px #60a5fa)' }} />
        </svg>
      </div>

      <div className="relative z-10 p-8 md:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-10">
        
        {/* Left Side: Brand Logo / Title */}
        <div className="flex-shrink-0 text-center lg:text-left border-b lg:border-b-0 lg:border-r border-[#1f2e4d] pb-8 lg:pb-0 lg:pr-12">
          <div className="flex flex-col">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight mb-3 drop-shadow-md">
              KKT NEWS
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 mb-4 mx-auto lg:mx-0 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.3)]"></div>
            <p className="text-slate-400 font-medium text-xs md:text-sm tracking-[0.25em] uppercase">
              AI-Powered Digital News Network
            </p>
          </div>
        </div>

        {/* Right Side: Stats & Info */}
        <div className="flex-grow flex flex-col justify-center w-full lg:max-w-4xl">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-5 leading-tight text-center lg:text-left drop-shadow-sm">
            Reaching <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-500 font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">7 Lakh+</span><br/>
            Chhattisgarhis Every Month
          </h3>
          <p className="text-slate-300 mb-8 text-base md:text-lg text-center lg:text-left max-w-2xl leading-relaxed font-light mx-auto lg:mx-0">
            <span className="text-yellow-400 font-medium">Across Web, Facebook & Video</span> — distributed through 
            a network of <span className="text-white font-medium">5 Lakh+</span> local group members.
          </p>
          
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-6">
            {/* Stat Box 1 */}
            <div className="bg-[#152038]/60 backdrop-blur-md border border-[#2a3c5a] rounded-xl px-6 py-4 flex flex-col items-center lg:items-start transition-all duration-300 hover:bg-[#1a2744] hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:-translate-y-1 group">
              <span className="text-2xl md:text-3xl font-black bg-gradient-to-br from-yellow-200 to-yellow-500 bg-clip-text text-transparent mb-1 drop-shadow-sm">7 Lakh+</span>
              <span className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-[0.2em] uppercase">
                 Monthly Reach
              </span>
            </div>
            
            {/* Stat Box 2 */}
            <div className="bg-[#152038]/60 backdrop-blur-md border border-[#2a3c5a] rounded-xl px-6 py-4 flex flex-col items-center lg:items-start transition-all duration-300 hover:bg-[#1a2744] hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:-translate-y-1 group">
              <span className="text-2xl md:text-3xl font-black text-white mb-1 group-hover:text-yellow-100 transition-colors drop-shadow-sm">65K+</span>
              <span className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-[0.2em] uppercase">
                 Facebook
              </span>
            </div>
            
            {/* Stat Box 3 */}
            <div className="bg-[#152038]/60 backdrop-blur-md border border-[#2a3c5a] rounded-xl px-6 py-4 flex flex-col items-center lg:items-start transition-all duration-300 hover:bg-[#1a2744] hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:-translate-y-1 group">
              <span className="text-2xl md:text-3xl font-black text-white mb-1 group-hover:text-yellow-100 transition-colors drop-shadow-sm">24/7</span>
              <span className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-[0.2em] uppercase">
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
