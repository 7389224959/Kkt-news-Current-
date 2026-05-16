import React, { useRef, useState, useEffect } from 'react';
import { ViralTemplate } from '../types';
import { renderThemeOverlay } from '../src/utils/themeRenderer';
import { ViralPostOverlayData } from '../src/utils/imageUtils';

interface ViralTemplateEditorProps {
  template: ViralTemplate;
  onChange: (updated: ViralTemplate) => void;
  previewData?: Partial<ViralPostOverlayData>;
  previewNewsImage?: string;
}

const ViralTemplateEditor: React.FC<ViralTemplateEditorProps> = ({ template, onChange, previewData, previewNewsImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [newsImgObj, setNewsImgObj] = useState<HTMLImageElement | null>(null);
  const [dragState, setDragState] = useState<{
    element: keyof ViralTemplate['coordinates'] | null;
    startX: number;
    startY: number;
    initialRect: { x: number; y: number; w: number; h: number } | null;
    mode: 'move' | 'resize-br' | null;
  }>({ element: null, startX: 0, startY: 0, initialRect: null, mode: null });

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [template.referenceImageUrl]);

  useEffect(() => {
    if (template.referenceImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setImgObj(img);
      img.src = template.referenceImageUrl;
    }
  }, [template.referenceImageUrl]);

  useEffect(() => {
    if (previewNewsImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setNewsImgObj(img);
      img.src = previewNewsImage;
    } else {
      setNewsImgObj(null);
    }
  }, [previewNewsImage]);

  useEffect(() => {
    if (!canvasRef.current || !imgObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = imgObj.width;
    const height = imgObj.height;

    // Set internal resolution based on original image
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // 1. Draw template background image
    ctx.drawImage(imgObj, 0, 0, width, height);

    const coords = template.coordinates || {};
    const styles = template.style_rules || {};

    const parseBoxFn = (boxStr: string | undefined) => {
      if (!boxStr || boxStr === 'hidden') return null;
      const parts = boxStr.split('%').map(p => parseFloat(p.replace(/,/g, '').trim()));
      if (parts.length >= 4 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2]) && !isNaN(parts[3])) {
        return {
          x: (parts[0] / 100) * width,
          y: (parts[1] / 100) * height,
          w: (parts[2] / 100) * width,
          h: (parts[3] / 100) * height,
        };
      }
      return null;
    };

    const drawEraseBox = (boxStr: string | undefined, bgColor: string | undefined) => {
      const box = parseBoxFn(boxStr);
      if (box && bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
    };

    // 2. Erase existing layout elements (if not a clean template)
    if (!template.templateImageUrl) {
      drawEraseBox(coords.headline_box, styles.headlineBg);
      drawEraseBox(coords.headline_line_1_box, styles.headlineBg);
      drawEraseBox(coords.headline_line_2_box, styles.headlineBg);
      drawEraseBox(coords.subheadline_box, styles.subheadlineBg);
      drawEraseBox(coords.summary_box, styles.summaryBg);
      drawEraseBox(coords.breaking_tag_box, styles.breakingTagBg);
    }

    // 3. Draw fallback box for image_box
    if (coords.image_box && coords.image_box !== 'hidden') {
      const imgBox = parseBoxFn(coords.image_box);
      if (imgBox) {
        if (newsImgObj) {
            const imgAspect = newsImgObj.width / newsImgObj.height;
            const boxAspect = imgBox.w / imgBox.h;
            let sx = 0, sy = 0, sw = newsImgObj.width, sh = newsImgObj.height;
            
            if (imgAspect > boxAspect) {
              sw = newsImgObj.height * boxAspect;
              sx = (newsImgObj.width - sw) / 2;
            } else {
              sh = newsImgObj.width / boxAspect;
              sy = (newsImgObj.height - sh) / 2;
            }
            ctx.drawImage(newsImgObj, sx, sy, sw, sh, imgBox.x, imgBox.y, imgBox.w, imgBox.h);
        } else {
            ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
            ctx.fillRect(imgBox.x, imgBox.y, imgBox.w, imgBox.h);
            ctx.fillStyle = 'white';
            const fontSize = Math.max(16, Math.floor(imgBox.h * 0.1));
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Main Image Box', imgBox.x + imgBox.w / 2, imgBox.y + imgBox.h / 2);
        }
      }
    }

    // 4. Render overlay data exactly like final outcome
    renderThemeOverlay(ctx, width, height, {
      breaking_tag: previewData?.breaking_tag || "BREAKING NEWS",
      headline_line_1: previewData?.headline_line_1 || "मुख्यमंत्री ने किया बड़ा ऐलान!",
      headline_line_2: previewData?.headline_line_2 || "",
      subheadline: previewData?.subheadline || "जनता को मिलेगा लाभ, जानिए डिटेल्स...",
      summary: previewData?.summary || "यह एक छोटा सारांश है जिसमें महत्वपूर्ण बिंदुओं को बताया गया है।",
      branding: previewData?.branding || "KKT NEWS",
      theme: previewData?.theme || "custom_" + template.id,
      customTemplate: template
    });

  }, [template, imgObj, newsImgObj, previewData]);

  const parseBox = (boxStr: string) => {
    if (!boxStr || boxStr === 'hidden') return null;
    const parts = boxStr.split('%').map(p => parseFloat(p.replace(/,/g, '').trim()));
    if (parts.length >= 4 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2]) && !isNaN(parts[3])) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
    return null;
  };

  const toBoxStr = (rect: { x: number; y: number; w: number; h: number }) => {
    return `${rect.x.toFixed(1)}%, ${rect.y.toFixed(1)}%, ${rect.w.toFixed(1)}%, ${rect.h.toFixed(1)}%`;
  };

  const coordinates = template.coordinates || {
    headline_box: 'hidden',
    subheadline_box: 'hidden',
    summary_box: 'hidden',
    breaking_tag_box: 'hidden'
  };

  const handlePointerDown = (e: React.PointerEvent, element: keyof ViralTemplate['coordinates'], mode: 'move' | 'resize-br') => {
    e.stopPropagation();
    e.preventDefault();
    const boxStr = coordinates[element] || 'hidden';
    const rect = parseBox(boxStr);
    if (!rect) return;
    
    setDragState({
      element,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialRect: rect
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.element || !dragState.initialRect || !containerSize.width) return;
    
    const deltaX_percent = ((e.clientX - dragState.startX) / containerSize.width) * 100;
    const deltaY_percent = ((e.clientY - dragState.startY) / containerSize.height) * 100;

    const newRect = { ...dragState.initialRect };

    if (dragState.mode === 'move') {
      newRect.x = Math.max(0, Math.min(100 - newRect.w, newRect.x + deltaX_percent));
      newRect.y = Math.max(0, Math.min(100 - newRect.h, newRect.y + deltaY_percent));
    } else if (dragState.mode === 'resize-br') {
      newRect.w = Math.max(5, Math.min(100 - newRect.x, newRect.w + deltaX_percent));
      newRect.h = Math.max(5, Math.min(100 - newRect.y, newRect.h + deltaY_percent));
    }

    onChange({
      ...template,
      coordinates: {
        ...coordinates,
        [dragState.element]: toBoxStr(newRect)
      }
    });
  };

  const handlePointerUp = () => {
    setDragState({ element: null, startX: 0, startY: 0, initialRect: null, mode: null });
  };

  const renderBox = (elementKey: keyof NonNullable<ViralTemplate['coordinates']>, label: string) => {
    const boxStr = coordinates[elementKey] || 'hidden';
    if (boxStr === 'hidden') return null;
    
    const rect = parseBox(boxStr);
    
    if (!rect) {
       return (
         <div className="absolute top-1/2 left-1/2 p-2 bg-red-500 text-white rounded opacity-50 transform -translate-x-1/2 -translate-y-1/2">
            Invalid {label}
         </div>
       );
    }
    
    return (
      <div 
        title={`Drag to move ${label}`}
        className={`absolute cursor-move flex items-center justify-center p-1 group overflow-hidden box-border outline outline-1 outline-dashed outline-blue-400/80 hover:outline-blue-500 hover:bg-blue-400/10 ${dragState.element === elementKey ? 'bg-blue-400/20 outline-blue-500 z-10' : 'z-0'}`}
        style={{
          left: `${rect.x}%`,
          top: `${rect.y}%`,
          width: `${rect.w}%`,
          height: `${rect.h}%`,
        }}
        onPointerDown={(e) => handlePointerDown(e, elementKey, 'move')}
      >
        <div 
          title="Drag to resize"
          className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500/50 cursor-se-resize rounded-tl-md hover:bg-blue-600 outline outline-1 outline-black/20"
          onPointerDown={(e) => handlePointerDown(e, elementKey, 'resize-br')}
        />
        <span className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-br-md opacity-0 group-hover:opacity-100 font-medium">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-100 p-4 rounded-lg">
         <p className="text-sm font-semibold mb-2">Editor Tools</p>
         <div className="flex flex-wrap gap-2">
            {(['image_box', 'headline_line_1_box', 'headline_line_2_box', 'headline_box', 'subheadline_box', 'summary_box', 'breaking_tag_box'] as const).map(key => {
               const isHidden = coordinates[key] === 'hidden' || !coordinates[key];
               if (key === 'headline_box' && isHidden) return null; // Only show legacy headline box if it's currently active

               let displayName = key.replace('_box', '');
               if (key === 'headline_line_1_box') displayName = 'Headline 1';
               if (key === 'headline_line_2_box') displayName = 'Headline 2';
               
               return (
                 <button 
                   key={key}
                   className={`px-3 py-1 rounded text-xs border transition-colors ${isHidden ? 'bg-gray-200 border-gray-300 text-gray-500' : 'bg-blue-100 border-blue-500 text-blue-800'}`}
                   onClick={() => {
                     onChange({
                       ...template,
                       coordinates: {
                         ...coordinates,
                         [key]: isHidden ? '10%, 10%, 80%, 10%' : 'hidden'
                       }
                     })
                   }}
                 >
                   {isHidden ? `Show ${displayName}` : `Hide ${displayName}`}
                 </button>
               )
            })}
         </div>
         <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-center">
            <p className="text-xs text-gray-500">Drag the boxes to position them. Drag the bottom-right corner to resize.</p>
            {previewData && (
                <button 
                  onClick={() => {
                     if (canvasRef.current) {
                        const link = document.createElement('a');
                        link.download = `preview-${template.id}.png`;
                        link.href = canvasRef.current.toDataURL('image/png');
                        link.click();
                     }
                  }}
                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 rounded text-xs font-semibold flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download Preview
                </button>
            )}
         </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full max-w-[400px] mx-auto aspect-[4/5] bg-gray-900 border-2 border-gray-300 overflow-hidden shadow-inner touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover pointer-events-none"
        />
        {!imgObj && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-400 pointer-events-none">
            Loading preview...
          </div>
        )}

        {renderBox('image_box', 'Main Image')}
        {renderBox('headline_line_1_box', 'Headline 1')}
        {renderBox('headline_line_2_box', 'Headline 2')}
        {renderBox('headline_box', 'Headline (Legacy)')}
        {renderBox('subheadline_box', 'Sub Headline')}
        {renderBox('summary_box', 'Summary / Details')}
        {renderBox('breaking_tag_box', 'Tag/Badge')}

      </div>
    </div>
  );
};

export default ViralTemplateEditor;

