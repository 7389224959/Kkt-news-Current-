import React from 'react';
import { MapPin, Phone, MessageCircle, Instagram, ExternalLink, Sparkles, Smartphone } from 'lucide-react';

const BalajiAdBanner: React.FC = () => {
  const phoneNumber = '7828111444';
  const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent('नमस्ते श्री बालाजी मोबाईल, मुझे मोबाइल ऑफर्स के बारे में जानकारी चाहिए।')}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Shree Balaji Mobile New Bus Stand Shop 37 Durg Chhattisgarh')}`;
  const instaUrl = 'https://www.instagram.com';

  const renderMiniQr = (label: string, iconType: 'whatsapp' | 'instagram' | 'map') => (
    <div className="bg-white p-1 rounded-md shadow-sm border border-gray-200 flex flex-col items-center">
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="currentColor">
        <rect x="8" y="8" width="28" height="28" fill="#111827" rx="3" />
        <rect x="14" y="14" width="16" height="16" fill="#ffffff" rx="1" />
        <rect x="18" y="18" width="8" height="8" fill="#111827" />

        <rect x="64" y="8" width="28" height="28" fill="#111827" rx="3" />
        <rect x="70" y="14" width="16" height="16" fill="#ffffff" rx="1" />
        <rect x="74" y="18" width="8" height="8" fill="#111827" />

        <rect x="8" y="64" width="28" height="28" fill="#111827" rx="3" />
        <rect x="14" y="70" width="16" height="16" fill="#ffffff" rx="1" />
        <rect x="18" y="74" width="8" height="8" fill="#111827" />

        <rect x="44" y="12" width="6" height="6" fill="#111827" />
        <rect x="52" y="12" width="6" height="6" fill="#111827" />
        <rect x="44" y="24" width="6" height="12" fill="#111827" />
        <rect x="12" y="44" width="8" height="6" fill="#111827" />
        <rect x="24" y="44" width="10" height="6" fill="#111827" />
        <rect x="44" y="44" width="8" height="8" fill="#111827" />
        <rect x="60" y="44" width="6" height="8" fill="#111827" />
        <rect x="74" y="44" width="8" height="6" fill="#111827" />
        <rect x="44" y="58" width="8" height="6" fill="#111827" />
        <rect x="56" y="60" width="8" height="8" fill="#111827" />
        <rect x="74" y="60" width="8" height="14" fill="#111827" />
        <rect x="44" y="74" width="10" height="6" fill="#111827" />
        <rect x="60" y="76" width="8" height="10" fill="#111827" />
      </svg>
      <span className="text-[8px] font-bold text-gray-700 mt-0.5 tracking-tight uppercase leading-none">{label}</span>
    </div>
  );

  return (
    <div className="w-full flex justify-center mb-8">
      <section 
        id="balaji-mobile-ad-banner" 
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400/80 bg-gradient-to-b from-[#fffefc] via-white to-amber-50/40 relative font-sans text-gray-900"
      >
        {/* Top Header: Brand & Tagline */}
        <div className="bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 px-4 pt-4 pb-3 text-center border-b border-amber-200/80 relative">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
            <h3 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight font-serif drop-shadow-sm">
              श्री बालाजी मोबाईल
            </h3>
            <span className="inline-flex items-center gap-1 bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.41-9.78-11.48-20.87-15.19-33.26-3.71-12.39-5.57-23.86-5.57-34.42 0-14.54 3.71-26.65 11.13-36.33 7.42-9.68 16.65-14.63 27.69-14.85 4.91 0 10.37 1.25 16.38 3.76 6.01 2.51 10.12 3.82 12.33 3.93 1.83 0 6.06-1.39 12.7-4.17 6.64-2.78 12.38-4.05 17.23-3.82 13.06.66 23.44 5.35 31.14 14.07-11.45 6.94-17.06 16.48-16.83 28.61.23 9.48 3.82 17.51 10.77 24.1 6.95 6.59 15.22 10.22 24.81 10.89-2.39 7.08-5.32 14.42-8.79 22.02zM119.22 31.84c0-7.39 2.67-14.28 8.01-20.67 5.34-6.39 11.96-10.32 19.86-11.79.44 1.3.66 2.5.66 3.6 0 7.39-2.78 14.5-8.34 21.33-5.56 6.83-12.28 10.63-20.19 11.4-.22-1.31-.33-2.58-.33-3.87z" />
              </svg>
              Apple Authorised
            </span>
          </div>

          <div className="inline-block bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-extrabold text-xs px-3 py-0.5 rounded shadow-xs mb-1">
            आपकी भरोसेमंद मोबाइल शॉप 📱
          </div>

          <p className="text-[12px] text-gray-700 font-medium leading-tight">
            हमारे यहाँ सभी प्रकार के नए और सेकंड हैंड मोबाइल फोन उपलब्ध हैं
          </p>
        </div>

        {/* Center: Festival Offer & Phones Highlight */}
        <div className="p-3 sm:p-4">
          <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-950 rounded-xl p-3 text-white text-center border-2 border-amber-400 shadow-md relative overflow-hidden flex items-center justify-between gap-3">
            
            {/* Offer Circle */}
            <div className="flex-1">
              <span className="inline-block bg-amber-400 text-amber-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider mb-0.5">
                ★ FESTIVAL OFFER ★
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-amber-300 text-[10px] font-bold uppercase">UP TO</span>
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-400 font-serif leading-none">
                  50%
                </span>
                <span className="text-lg font-black text-amber-200">OFF</span>
              </div>
              <p className="text-[10px] font-semibold text-yellow-200 mt-0.5">
                इस त्योहार, दिल खुश करने वाले ऑफर!
              </p>
            </div>

            {/* Smart Phone Highlights */}
            <div className="bg-black/30 backdrop-blur-xs rounded-lg p-2 border border-white/10 text-left text-[11px] space-y-1 shrink-0">
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <Smartphone size={12} />
                <span>iPhone & Android</span>
              </div>
              <div className="flex items-center gap-1 text-gray-200 text-[10px]">
                <Sparkles size={11} className="text-yellow-400" />
                <span>Best Exchange & EMI</span>
              </div>
            </div>

          </div>

          {/* Direct CTA Buttons: Call & WhatsApp */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <a 
              href={`tel:${phoneNumber}`}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow transition-colors"
            >
              <Phone size={13} />
              <span>कॉल: {phoneNumber}</span>
            </a>
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow transition-colors"
            >
              <MessageCircle size={13} />
              <span>WhatsApp चैट</span>
            </a>
          </div>
        </div>

        {/* Bottom Section: Address & Social QR Codes */}
        <div className="bg-[#480808] text-white px-3.5 py-3 border-t-2 border-amber-400">
          
          {/* Address & Number Notice */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-start gap-1.5">
              <MapPin size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-amber-300 font-bold uppercase block">पता:</span>
                <p className="text-[11px] font-bold text-gray-100 leading-tight">
                  न्यू बस स्टैंड शॉप no 37, दुर्ग, छत्तीसगढ़
                </p>
              </div>
            </div>
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-2 py-1 rounded shrink-0 flex items-center gap-0.5"
            >
              मैप <ExternalLink size={9} />
            </a>
          </div>

          {/* Social QRs Row */}
          <div className="pt-2 border-t border-red-800/60 flex items-center justify-between">
            <div className="text-[10px] text-amber-200 font-semibold max-w-[120px] leading-tight">
              अपडेट्स पाने के लिए स्कैन व फॉलो करें
            </div>
            
            <div className="flex items-center gap-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform" title="WhatsApp">
                {renderMiniQr('WhatsApp', 'whatsapp')}
              </a>
              <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform" title="Instagram">
                {renderMiniQr('Instagram', 'instagram')}
              </a>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform" title="Google Map">
                {renderMiniQr('Shop Map', 'map')}
              </a>
            </div>
          </div>

        </div>

      </section>
    </div>
  );
};

export default BalajiAdBanner;
