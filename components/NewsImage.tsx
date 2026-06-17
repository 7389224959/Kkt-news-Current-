import React, { useState, useEffect } from 'react';

interface NewsImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  priority?: boolean;
}

const NewsImage: React.FC<NewsImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'News Image',
  aspectRatio = 'auto',
  priority = false
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!src) {
      setImgSrc(`https://placehold.co/800x450/e2e8f0/475569?text=${encodeURIComponent(fallbackText)}`);
      setIsLoading(false);
      setErrorCount(1);
    } else {
      setImgSrc(src);
      setIsLoading(true);
      setErrorCount(0);
      
      // Check if image is already loaded (for cached images)
      const img = new Image();
      img.src = src;
      if (img.complete) {
        setIsLoading(false);
      }

      // Fail-safe: if image doesn't load in 5s, show it anyway
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [src, fallbackText]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    const nextErrorCount = errorCount + 1;
    setErrorCount(nextErrorCount);

    if (nextErrorCount === 1) {
      // First fallback: Reliable generic news image
      setImgSrc(`https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80`);
    } else if (nextErrorCount === 2) {
      // Second fallback: LoremFlickr with fallback text
      const safeText = fallbackText.replace(/[^\w\s]/g, '') || 'News';
      setImgSrc(`https://loremflickr.com/800/450/${encodeURIComponent(safeText)}`);
    } else if (nextErrorCount === 3) {
      // Third fallback: Placeholder with English text only (to avoid boxes)
      const safeText = fallbackText.replace(/[^\w\s]/g, '') || 'News';
      setImgSrc(`https://placehold.co/800x450/e2e8f0/475569?text=${encodeURIComponent(safeText)}`);
    } else {
      // Final fallback: Stop trying
      setIsLoading(false);
    }
  };

  const aspectClass = aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'square' ? 'aspect-square' : '';

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${aspectClass} ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 overflow-hidden">
          <div className="absolute inset-0 shimmer-bg"></div>
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        key={imgSrc}
        src={imgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? undefined : "lazy"}
        decoding={priority ? "sync" : "async"}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default NewsImage;
