import { ViralPostOverlayData } from './imageUtils';

export const renderThemeOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number, data: ViralPostOverlayData) => {
  const fontStack = '"Inter", system-ui, -apple-system, sans-serif';
  const hindiFontStack = '"Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif';
  const maxTextWidth = width * 0.9;
  
  // Helper for text wrapping
  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (ctx.measureText(currentLine + " " + word).width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const drawBranding = (logoTheme: 'dark' | 'light' = 'dark') => {
      const logoX = 24;
      const logoY = 24;
      const boxSize = Math.max(48, height * 0.06);
      const appNameText = data.branding || 'Khabar Kal Tak';
      const subText = 'NEWS NETWORK';

      ctx.font = `bold ${boxSize * 0.45}px ${fontStack}`;
      const appNameWidth = ctx.measureText(appNameText).width;
      ctx.font = `bold ${boxSize * 0.25}px ${fontStack}`;
      const subTextWidth = ctx.measureText(subText).width + (subText.length * 2);
      
      const textWidth = Math.max(appNameWidth, subTextWidth);
      const totalLogoWidth = boxSize + 12 + textWidth + 16;
      
      ctx.fillStyle = logoTheme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(logoX - 12, logoY - 12, totalLogoWidth, boxSize + 24, 8);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, boxSize, boxSize, 6);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${boxSize * 0.5}px ${fontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KKT', logoX + boxSize / 2, logoY + boxSize / 2 + 2);

      const textX = logoX + boxSize + 12;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = logoTheme === 'dark' ? '#FFFFFF' : '#1e293b';
      ctx.font = `bold ${boxSize * 0.45}px ${fontStack}`;
      ctx.fillText(appNameText, textX, logoY + boxSize * 0.1);

      ctx.fillStyle = logoTheme === 'dark' ? '#9CA3AF' : '#64748b';
      ctx.font = `bold ${boxSize * 0.25}px ${fontStack}`;
      ctx.fillText(subText, textX, logoY + boxSize * 0.65);
  };

  const drawBreakingTag = (y: number, bg: string = '#DC2626', fg: string = '#FFFFFF') => {
    if (!data.breaking_tag) return 0;
    const tagFontSize = Math.max(18, height * 0.035);
    ctx.font = `bold ${tagFontSize}px ${hindiFontStack}`;
    const tagText = data.breaking_tag.toUpperCase();
    const metrics = ctx.measureText(tagText);
    const boxWidth = metrics.width + 32;
    const boxHeight = tagFontSize + 16;
    const boxX = (width / 2) - (boxWidth / 2);
    const boxY = y - boxHeight;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, width / 2, boxY + (boxHeight / 2));
    return boxHeight;
  };

  const drawDefaultLines = (startY: number) => {
      let currentY = startY;
      
      if (data.subheadline) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = `normal ${Math.max(20, height * 0.035)}px ${hindiFontStack}`;
        ctx.fillStyle = '#E5E7EB';
        const subLines = wrapText(data.subheadline, maxTextWidth);
        for (let i = subLines.length - 1; i >= 0; i--) {
          ctx.fillText(subLines[i], width / 2, currentY);
          currentY -= Math.max(26, height * 0.045);
        }
        currentY -= Math.max(10, height * 0.02);
      }

      if (data.headline_line_2) {
        const h2FontSize = Math.max(40, height * 0.08);
        ctx.font = `bold ${h2FontSize}px ${hindiFontStack}`;
        ctx.fillStyle = '#FFD700'; // Yellow
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 15;
        const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
        for (let i = h2Lines.length - 1; i >= 0; i--) {
          ctx.fillText(h2Lines[i], width / 2, currentY);
          currentY -= h2FontSize * 1.2;
        }
        currentY -= Math.max(5, height * 0.01);
      }

      if (data.headline_line_1) {
        const h1FontSize = Math.max(30, height * 0.055);
        ctx.font = `bold ${h1FontSize}px ${hindiFontStack}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 10;
        const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
        for (let i = h1Lines.length - 1; i >= 0; i--) {
          ctx.fillText(h1Lines[i], width / 2, currentY);
          currentY -= h1FontSize * 1.2;
        }
        currentY -= Math.max(15, height * 0.025);
      }
      ctx.shadowColor = 'transparent';
      const tagH = drawBreakingTag(currentY);
      return currentY - tagH;
  };
  
  // Theme logic starts here
  let currentY = height - Math.max(30, height * 0.05);
  const theme = data.theme || 'breaking_red';

  if (theme === 'minimal_white') {
     ctx.fillStyle = 'white';
     ctx.fillRect(0, 0, width, height);
     
     drawBranding('light');
     
     let cy = height * 0.3;
     ctx.textAlign = 'left';
     ctx.textBaseline = 'top';
     
     if (data.headline_line_1) {
       ctx.font = `bold ${Math.max(40, height * 0.07)}px ${hindiFontStack}`;
       ctx.fillStyle = '#000000';
       const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
       for (const line of h1Lines) {
         ctx.fillText(line, width * 0.06, cy);
         cy += Math.max(40, height * 0.07) * 1.2;
       }
       cy += Math.max(20, height * 0.03);
     }
     
     if (data.headline_line_2) {
       ctx.font = `bold ${Math.max(50, height * 0.09)}px ${hindiFontStack}`;
       ctx.fillStyle = '#DC2626'; // Red
       const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
       for (const line of h2Lines) {
         ctx.fillText(line, width * 0.06, cy);
         cy += Math.max(50, height * 0.09) * 1.2;
       }
       cy += Math.max(20, height * 0.03);
     }
     
     if (data.subheadline) {
       ctx.font = `normal ${Math.max(24, height * 0.04)}px ${hindiFontStack}`;
       ctx.fillStyle = '#4B5563';
       const subLines = wrapText(data.subheadline, maxTextWidth);
       for (const line of subLines) {
         ctx.fillText(line, width * 0.06, cy);
         cy += Math.max(24, height * 0.04) * 1.4;
       }
     }
     return;
  }
  else if (theme === 'fact_light') {
     ctx.fillStyle = '#F8FAFC';
     ctx.fillRect(0, 0, width, height);
     drawBranding('light');
     
     ctx.fillStyle = '#DC2626';
     const topH = Math.max(40, height * 0.08);
     ctx.fillRect(width * 0.3, height * 0.1, width * 0.4, topH);
     ctx.fillStyle = 'white';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.font = `bold ${topH*0.5}px ${hindiFontStack}`;
     ctx.fillText(data.breaking_tag || 'क्या हुआ?', width * 0.5, height * 0.1 + topH * 0.5);

     let cy = height * 0.25;
     ctx.textAlign = 'center';
     ctx.textBaseline = 'top';
     
     if (data.headline_line_1 || data.headline_line_2) {
       ctx.fillStyle = '#0F172A';
       ctx.font = `bold ${Math.max(34, height * 0.06)}px ${hindiFontStack}`;
       const htext = [data.headline_line_1, data.headline_line_2].filter(Boolean).join(' ');
       const hLines = wrapText(htext, maxTextWidth);
       for(const l of hLines) {
         ctx.fillText(l, width * 0.5, cy);
         cy += Math.max(34, height * 0.06) * 1.4;
       }
     }
     
     cy += height * 0.05;
     
     ctx.fillStyle = '#1E293B';
     ctx.beginPath();
     ctx.roundRect(width * 0.05, cy, width * 0.9, height * 0.45, 12);
     ctx.stroke();
     
     ctx.fillStyle = '#0F172A';
     const topSecH = Math.max(30, height*0.05);
     ctx.fillRect(width * 0.05, cy, width * 0.4, topSecH);
     ctx.fillStyle = 'white';
     ctx.textAlign = 'left';
     ctx.font = `bold ${topSecH*0.6}px ${hindiFontStack}`;
     ctx.fillText("क्या-क्या सामने आया?", width * 0.08, cy + topSecH*0.2);
     
     if (data.subheadline) {
       cy += topSecH + height * 0.05;
       ctx.fillStyle = '#334155';
       ctx.textAlign = 'left';
       ctx.font = `normal ${Math.max(26, height * 0.04)}px ${hindiFontStack}`;
       const subs = wrapText(data.subheadline, maxTextWidth - width*0.15);
       for(const l of subs) {
          ctx.beginPath();
          ctx.arc(width * 0.1, cy + height*0.02, 6, 0, Math.PI*2);
          ctx.fill();
          ctx.fillText(l, width * 0.15, cy);
          cy += Math.max(26, height * 0.04) * 1.5;
       }
     }
     return;
  }
  else if (theme === 'question_hook') {
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      drawBranding('dark');

      const qFontSize = Math.max(120, height * 0.2);
      ctx.font = `bold ${qFontSize}px ${hindiFontStack}`;
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 10;
      ctx.fillText('?', width * 0.95, height * 0.15);
      ctx.shadowBlur = 0;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let cy = height * 0.35;
      
      if (data.headline_line_1) {
        ctx.font = `bold ${Math.max(48, height * 0.08)}px ${hindiFontStack}`;
        ctx.fillStyle = '#FFFFFF';
        const lines = wrapText(data.headline_line_1, width * 0.8);
        for(const l of lines) {
           ctx.fillText(l, width * 0.08, cy);
           cy += Math.max(48, height * 0.08) * 1.3;
        }
      }
      if (data.headline_line_2) {
        ctx.font = `bold ${Math.max(54, height * 0.09)}px ${hindiFontStack}`;
        ctx.fillStyle = '#FCD34D'; // Yellow
        const lines = wrapText(data.headline_line_2, width * 0.8);
        for(const l of lines) {
           ctx.fillText(l, width * 0.08, cy);
           cy += Math.max(54, height * 0.09) * 1.3;
        }
      }
      
      if (data.subheadline) {
         cy += Math.max(20, height * 0.03);
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.fillRect(width * 0.08, cy, width * 0.8, height * 0.15);
         ctx.font = `bold ${Math.max(28, height * 0.05)}px ${hindiFontStack}`;
         ctx.fillStyle = '#1E293B';
         const lines = wrapText(data.subheadline, width * 0.7);
         let sy = cy + height * 0.03;
         for(const l of lines) {
            ctx.fillText(l, width * 0.12, sy);
            sy += Math.max(28, height * 0.05) * 1.5;
         }
      }
      
      if (data.breaking_tag) {
         ctx.fillStyle = '#FCD34D';
         ctx.font = `bold ${Math.max(30, height * 0.05)}px ${hindiFontStack}`;
         ctx.textAlign = 'left';
         ctx.textBaseline = 'bottom';
         ctx.fillText(data.breaking_tag, width * 0.08, height * 0.95);
      }
      return;
  }
  else if (theme === 'story_dark') {
      const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.4, 'rgba(0,0,0,0.85)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      drawBranding('dark');

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let cy = height * 0.45;
      
      if (data.headline_line_1) {
        ctx.font = `bold ${Math.max(40, height * 0.07)}px ${hindiFontStack}`;
        ctx.fillStyle = '#E5E7EB';
        const lines = wrapText(data.headline_line_1, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.1, cy);
           cy += Math.max(40, height * 0.07) * 1.4;
        }
      }
      
      cy += height * 0.05;
      
      if (data.headline_line_2) {
        ctx.font = `bold ${Math.max(56, height * 0.09)}px ${hindiFontStack}`;
        ctx.fillStyle = '#FCD34D';
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 15;
        const lines = wrapText(data.headline_line_2, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.1, cy);
           cy += Math.max(56, height * 0.09) * 1.3;
        }
        ctx.shadowBlur = 0;
      }
      
      if (data.breaking_tag) {
         ctx.fillStyle = '#DC2626';
         ctx.fillRect(0, height - height*0.15, width, height*0.15);
         ctx.fillStyle = '#FFFFFF';
         ctx.font = `bold ${Math.max(34, height * 0.06)}px ${hindiFontStack}`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillText(data.breaking_tag, width * 0.5, height - height*0.075);
      }
      return;
  }
  else if (theme === 'warning_alert') {
      const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      drawBranding('dark');
      
      const tagText = data.breaking_tag || 'सावधान!';
      const tagFontSize = Math.max(40, height * 0.07);
      ctx.font = `bold ${tagFontSize}px ${hindiFontStack}`;
      const boxW = ctx.measureText(tagText).width + 100;
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(width - boxW - 20, 20, boxW, 80);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ ' + tagText, width - boxW/2 - 20, 60);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let cy = height * 0.5;
      
      if (data.headline_line_1) {
        ctx.font = `bold ${Math.max(36, height * 0.06)}px ${hindiFontStack}`;
        ctx.fillStyle = '#FFFFFF';
        const lines = wrapText(data.headline_line_1, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(36, height * 0.06) * 1.4;
        }
      }
      
      cy += height * 0.05;
      
      if (data.headline_line_2) {
        ctx.font = `bold ${Math.max(48, height * 0.08)}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_2, maxTextWidth);
        for(const l of lines) {
           const lw = ctx.measureText(l).width;
           ctx.fillStyle = '#FCD34D';
           ctx.fillRect(width*0.5 - lw/2 - 20, cy - height*0.05, lw + 40, height*0.1);
           ctx.fillStyle = '#0F172A';
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(48, height * 0.08) * 1.5;
        }
      }
      
      if (data.subheadline) {
         ctx.fillStyle = '#FCD34D';
         ctx.font = `bold ${Math.max(26, height * 0.045)}px ${hindiFontStack}`;
         ctx.fillText(data.subheadline, width * 0.5, height - height*0.05);
      }
      return;
  }
  else if (theme === 'step_by_step') {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      drawBranding('dark');
      
      ctx.font = `bold ${Math.max(40, height * 0.07)}px ${hindiFontStack}`;
      ctx.fillStyle = '#FCD34D';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('बड़ी खबर!', width * 0.1, height * 0.3);
      
      ctx.fillStyle = 'white';
      let cy = height * 0.45;
      const combined = [data.headline_line_1, data.headline_line_2].filter(Boolean).join(' ');
      ctx.font = `bold ${Math.max(48, height * 0.08)}px ${hindiFontStack}`;
      const lines = wrapText(combined, width * 0.8);
      for(const l of lines) {
         ctx.fillText(l, width * 0.1, cy);
         cy += Math.max(48, height * 0.08) * 1.2;
      }
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, height - height*0.1, width, height*0.1);
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(24, height * 0.04)}px ${hindiFontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.breaking_tag || 'पूरा मामला जानने के लिए पढ़ते रहें ➡️', width * 0.5, height - height*0.05);
      return;
  }
  else if (theme === 'shock_yellow') {
      const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');
      
      ctx.font = `bold ${Math.max(80, height * 0.12)}px ${hindiFontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('😱', width * 0.5, height * 0.1);
      
      let cy = height * 0.3;
      if (data.headline_line_1) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(44, height * 0.07)}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_1, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(44, height * 0.07) * 1.2;
        }
      }
      
      cy += height * 0.05;
      
      if (data.headline_line_2) {
        ctx.fillStyle = '#FCD34D';
        ctx.font = `bold ${Math.max(54, height * 0.09)}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_2, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(54, height * 0.09) * 1.2;
        }
      }
      
      if (data.breaking_tag) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.fillRect(width*0.1, cy + height*0.05, width*0.8, height*0.15);
         ctx.fillStyle = '#DC2626';
         ctx.font = `bold ${Math.max(34, height * 0.06)}px ${hindiFontStack}`;
         ctx.textBaseline = 'middle';
         const lines = wrapText(data.breaking_tag, width*0.75);
         ctx.fillText(lines.join(' '), width * 0.5, cy + height*0.125);
      }
      return;
  }
  else if (theme === 'video_reel') {
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');
      
      // Play icon
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(60, height - 60, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(50, height - 75);
      ctx.lineTo(75, height - 60);
      ctx.lineTo(50, height - 45);
      ctx.fill();

      let cy = height * 0.5;
      ctx.textAlign = 'center';
      
      if (data.headline_line_1) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(40, height * 0.07)}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_1, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(40, height * 0.07) * 1.2;
        }
      }
      
      if (data.headline_line_2) {
        ctx.fillStyle = '#DC2626';
        const h2FontSize = Math.max(50, height * 0.08);
        ctx.font = `bold ${h2FontSize}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_2, maxTextWidth);
        for(const l of lines) {
           const lw = ctx.measureText(l).width;
           ctx.fillRect(width*0.5 - lw/2 - 20, cy - h2FontSize + 10, lw + 40, h2FontSize + 20);
           ctx.fillStyle = 'white';
           ctx.fillText(l, width * 0.5, cy + 10);
           ctx.fillStyle = '#DC2626';
           cy += h2FontSize * 1.4;
        }
      }
      
      ctx.fillStyle = '#FCD34D';
      ctx.font = `bold ${Math.max(28, height * 0.045)}px ${hindiFontStack}`;
      ctx.fillText(data.breaking_tag || 'पूरी कहानी जानिए इस वीडियो में...', width * 0.5, height - 50);
      return;
  }
  else if (theme === 'opinion_poll') {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');
      
      let cy = height * 0.3;
      ctx.textAlign = 'center';
      
      if (data.headline_line_1) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(44, height * 0.07)}px ${hindiFontStack}`;
        const lines = wrapText(data.headline_line_1, maxTextWidth);
        for(const l of lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(44, height * 0.07) * 1.2;
        }
      }
      if (data.headline_line_2) {
         cy += 20;
         ctx.fillStyle = '#FCD34D';
         ctx.font = `bold ${Math.max(50, height * 0.08)}px ${hindiFontStack}`;
         const lines = wrapText(data.headline_line_2, maxTextWidth);
         for(const l of lines) {
            ctx.fillText(l, width * 0.5, cy);
            cy += Math.max(50, height * 0.08) * 1.2;
         }
      }
      
      cy += height * 0.1;
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(34, height * 0.06)}px ${hindiFontStack}`;
      ctx.fillText(data.breaking_tag || 'आपकी क्या राय है?', width * 0.5, cy);
      
      cy += height * 0.1;
      ctx.fillStyle = '#22C55E';
      ctx.beginPath(); ctx.roundRect(width*0.2, cy, width*0.25, height*0.08, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.fillText('हाँ', width*0.325, cy + height*0.05);
      
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.roundRect(width*0.55, cy, width*0.25, height*0.08, 8); ctx.fill();
      ctx.fillStyle = 'white'; ctx.fillText('नहीं', width*0.675, cy + height*0.05);

      return;
  }
  else if (theme === 'breaking_modern') {
      drawBranding('light');
      const boxH = height * 0.35;
      ctx.fillStyle = '#DC2626'; // Red bar at bottom
      ctx.fillRect(0, height - boxH, width, boxH);
      
      let cy = height - boxH + 20;
      if (data.breaking_tag) {
         ctx.fillStyle = '#111827';
         ctx.fillRect(0, cy - 20, width * 0.4, 40);
         ctx.fillStyle = 'white';
         ctx.font = `bold ${Math.max(20, height * 0.035)}px ${hindiFontStack}`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillText(data.breaking_tag.toUpperCase(), width * 0.2, cy);
         cy += 40;
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(30, height * 0.055)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.fillText(l, width * 0.05, cy);
           cy += Math.max(30, height * 0.055) * 1.3;
         }
      }
      if (data.headline_line_2) {
         ctx.font = `bold ${Math.max(36, height * 0.065)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FCD34D';
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.fillText(l, width * 0.05, cy);
           cy += Math.max(36, height * 0.065) * 1.3;
         }
      }
  }
  else if (theme === 'breaking_cinematic') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height * 0.15); // Top bar
      ctx.fillRect(0, height - height * 0.25, width, height * 0.25); // Bottom bar
      drawBranding('dark');

      let cy = height - height * 0.25 + 20;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (data.breaking_tag) {
         ctx.fillStyle = '#DC2626';
         ctx.font = `bold ${Math.max(22, height * 0.04)}px ${hindiFontStack}`;
         ctx.fillText(data.breaking_tag.toUpperCase(), width / 2, cy);
         cy += Math.max(22, height * 0.04) * 1.5;
      }
      const combined = [data.headline_line_1, data.headline_line_2].filter(Boolean).join(' | ');
      ctx.font = `bold ${Math.max(28, height * 0.05)}px ${hindiFontStack}`;
      ctx.fillStyle = '#FFFFFF';
      const lines = wrapText(combined, width * 0.9);
      for (const l of lines) {
         ctx.fillText(l, width / 2, cy);
         cy += Math.max(28, height * 0.05) * 1.4;
      }
  }
  else if (theme === 'breaking_bold_center') {
      const gradient = ctx.createRadialGradient(width/2, height/2, height*0.1, width/2, height/2, height*0.7);
      gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let cy = height * 0.4;

      if (data.breaking_tag) {
         ctx.fillStyle = '#DC2626';
         ctx.font = `bold ${Math.max(50, height * 0.08)}px ${hindiFontStack}`;
         const textWidth = ctx.measureText(data.breaking_tag).width;
         ctx.fillRect(width/2 - textWidth/2 - 20, cy - 40, textWidth + 40, 80);
         ctx.fillStyle = '#FFFFFF';
         ctx.fillText(data.breaking_tag.toUpperCase(), width/2, cy);
         cy += 100;
      }
      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(48, height * 0.08)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 10;
           ctx.fillText(l, width / 2, cy);
           ctx.shadowBlur = 0;
           cy += Math.max(48, height * 0.08) * 1.3;
         }
      }
      if (data.headline_line_2) {
         ctx.font = `bold ${Math.max(56, height * 0.09)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FBBF24';
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 15;
           ctx.fillText(l, width / 2, cy);
           ctx.shadowBlur = 0;
           cy += Math.max(56, height * 0.09) * 1.3;
         }
      }
  }
  else if (theme === 'breaking_yellow_flare') {
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      let cy = height * 0.6;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      if (data.breaking_tag) {
         ctx.fillStyle = '#FBBF24';
         ctx.fillRect(width * 0.05, cy, width * 0.9, height * 0.06);
         ctx.fillStyle = '#000000';
         ctx.font = `bold ${Math.max(28, height * 0.045)}px ${hindiFontStack}`;
         ctx.fillText('⚡ ' + data.breaking_tag.toUpperCase(), width * 0.08, cy + 5);
         cy += height * 0.08;
      }
      
      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(40, height * 0.07)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.fillText(l, width * 0.08, cy);
           cy += Math.max(40, height * 0.07) * 1.3;
         }
      }
      if (data.headline_line_2) {
         ctx.font = `bold ${Math.max(48, height * 0.08)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FBBF24';
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.fillText(l, width * 0.08, cy);
           cy += Math.max(48, height * 0.08) * 1.3;
         }
      }
  }
  else if (theme === 'breaking_glassmorphism') {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      let boxY = height * 0.55;
      let boxH = height * 0.4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(width * 0.05, boxY, width * 0.9, boxH, 16);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      let cy = boxY + 20;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (data.breaking_tag) {
         ctx.fillStyle = '#EF4444';
         ctx.font = `bold ${Math.max(24, height * 0.04)}px ${hindiFontStack}`;
         ctx.fillText(data.breaking_tag.toUpperCase(), width / 2, cy);
         cy += Math.max(24, height * 0.04) * 1.5;
         ctx.fillStyle = 'rgba(255,255,255,0.2)';
         ctx.fillRect(width * 0.2, cy, width * 0.6, 2);
         cy += 15;
      }

      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(36, height * 0.06)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const lines = wrapText(data.headline_line_1, width * 0.8);
         for (const l of lines) {
           ctx.fillText(l, width / 2, cy);
           cy += Math.max(36, height * 0.06) * 1.3;
         }
      }
      if (data.headline_line_2) {
         cy += 10;
         ctx.font = `bold ${Math.max(44, height * 0.075)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FCD34D';
         const lines = wrapText(data.headline_line_2, width * 0.8);
         for (const l of lines) {
           ctx.fillText(l, width / 2, cy);
           cy += Math.max(44, height * 0.075) * 1.3;
         }
      }
  }
  else if (theme === 'breaking_split_box') {
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      let cy = height * 0.5;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      if (data.breaking_tag) {
         ctx.fillStyle = '#DC2626';
         ctx.font = `bold ${Math.max(28, height * 0.045)}px ${hindiFontStack}`;
         const textWidth = ctx.measureText(data.breaking_tag).width;
         ctx.fillRect(width * 0.05, cy, textWidth + 40, height * 0.06);
         ctx.fillStyle = '#FFFFFF';
         ctx.fillText(data.breaking_tag.toUpperCase(), width * 0.05 + 20, cy + height * 0.005);
         cy += height * 0.06 + 10;
      }
      
      const combined = [data.headline_line_1, data.headline_line_2].filter(Boolean).join(' ');
      ctx.font = `bold ${Math.max(44, height * 0.07)}px ${hindiFontStack}`;
      const lines = wrapText(combined, width * 0.8);
      for (const l of lines) {
         const lw = ctx.measureText(l).width;
         ctx.fillStyle = '#000000';
         ctx.fillRect(width * 0.05, cy, lw + 40, height * 0.08);
         ctx.fillStyle = '#FFFFFF';
         ctx.fillText(l, width * 0.05 + 20, cy + height * 0.005);
         cy += height * 0.08 + 10;
      }
  }
  else if (theme === 'breaking_magazine') {
      const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      let cy = height * 0.55;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      if (data.breaking_tag) {
         ctx.fillStyle = '#DC2626';
         ctx.font = `bold ${Math.max(26, height * 0.04)}px ${hindiFontStack}`;
         ctx.fillText(data.breaking_tag.toUpperCase(), width * 0.95, cy);
         cy += Math.max(26, height * 0.04) * 1.5;
         ctx.strokeStyle = '#DC2626';
         ctx.lineWidth = 3;
         ctx.beginPath();
         ctx.moveTo(width * 0.5, cy);
         ctx.lineTo(width * 0.95, cy);
         ctx.stroke();
         cy += 15;
      }

      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(40, height * 0.06)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 8;
           ctx.fillText(l, width * 0.95, cy);
           cy += Math.max(40, height * 0.06) * 1.3;
         }
         ctx.shadowBlur = 0;
      }
      if (data.headline_line_2) {
         ctx.font = `bold ${Math.max(54, height * 0.085)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FCD34D';
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 12;
           ctx.fillText(l, width * 0.95, cy);
           cy += Math.max(54, height * 0.085) * 1.2;
         }
         ctx.shadowBlur = 0;
      }
  }
  else if (theme === 'breaking_ticker') {
      const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      const bottomBarH = height * 0.08;
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(0, height - bottomBarH, width, bottomBarH);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(24, height * 0.04)}px ${hindiFontStack}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const tickerText = data.breaking_tag ? (data.breaking_tag + " | " + "KKT NEWS") : "KKT NEWS | LATEST UPDATES";
      ctx.fillText(tickerText, 20, height - bottomBarH/2);

      let cy = height * 0.45;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(44, height * 0.07)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(44, height * 0.07) * 1.3;
         }
      }
      if (data.headline_line_2) {
         ctx.font = `bold ${Math.max(54, height * 0.085)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FCD34D';
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(54, height * 0.085) * 1.3;
         }
      }
  }
  else if (theme === 'breaking_gradient_pop') {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.4, 'rgba(88,28,135,0.7)'); // dark purple
      gradient.addColorStop(1, 'rgba(153,27,27,0.95)'); // dark red
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawBranding('dark');

      let cy = height * 0.4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (data.breaking_tag) {
         ctx.fillStyle = '#FBBF24';
         ctx.font = `bold ${Math.max(34, height * 0.055)}px ${hindiFontStack}`;
         ctx.fillText(data.breaking_tag.toUpperCase(), width * 0.5, cy);
         cy += Math.max(34, height * 0.055) * 1.5;
         ctx.strokeStyle = '#FBBF24';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(width * 0.2, cy);
         ctx.lineTo(width * 0.8, cy);
         ctx.stroke();
         cy += 20;
      }

      if (data.headline_line_1) {
         ctx.font = `bold ${Math.max(42, height * 0.065)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF';
         const h1Lines = wrapText(data.headline_line_1, maxTextWidth);
         for (const l of h1Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 8;
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(42, height * 0.065) * 1.3;
         }
         ctx.shadowBlur = 0;
      }
      if (data.headline_line_2) {
         cy += 10;
         ctx.font = `bold ${Math.max(52, height * 0.08)}px ${hindiFontStack}`;
         ctx.fillStyle = '#FFFFFF'; // All white but bigger
         const h2Lines = wrapText(data.headline_line_2, maxTextWidth);
         for (const l of h2Lines) {
           ctx.shadowColor = 'black'; ctx.shadowBlur = 10;
           ctx.fillText(l, width * 0.5, cy);
           cy += Math.max(52, height * 0.08) * 1.2;
         }
         ctx.shadowBlur = 0;
      }
  }
  else {
      // Default (breaking_red / breaking_classic)
      const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.4, 'rgba(0,0,0,0.7)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      drawBranding('dark');
      drawDefaultLines(height - Math.max(30, height * 0.05));
  }
};
