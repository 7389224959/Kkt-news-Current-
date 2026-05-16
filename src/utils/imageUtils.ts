/**
 * Compresses a base64 image string to ensure it fits within Firestore limits
 */
export const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if compression fails
  });
};

import { renderThemeOverlay } from './themeRenderer';

import { ViralTemplate } from '../../types';

export interface ViralPostOverlayData {
  breaking_tag: string;
  headline_line_1: string;
  headline_line_2: string;
  subheadline: string;
  summary?: string;
  branding: string;
  theme?: string;
  customTemplate?: ViralTemplate;
}

export const overlayTextOnImage = (base64Str: string, data: ViralPostOverlayData): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => res(image);
        image.onerror = (e) => rej(e);
        image.src = src;
      });

      const newsImg = await loadImg(base64Str);
      let templateImg: HTMLImageElement | null = null;
      
      if (data.customTemplate) {
        const bgUrl = data.customTemplate.templateImageUrl || data.customTemplate.referenceImageUrl;
        if (bgUrl) {
          try {
            templateImg = await loadImg(bgUrl);
          } catch (e) {
            console.warn("Could not load template image", e);
          }
        }
      }

      const canvas = document.createElement('canvas');
      let width = newsImg.width;
      let height = newsImg.height;

      if (templateImg) {
        width = templateImg.width;
        height = templateImg.height;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      if (templateImg && data.customTemplate) {
        // Draw the template image as the background
        ctx.drawImage(templateImg, 0, 0, width, height);

        const tmpl = data.customTemplate;
        const coords = tmpl.coordinates || {};
        const styles = tmpl.style_rules || {};

        const parseBox = (boxStr: string | undefined) => {
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
          const box = parseBox(boxStr);
          if (box && bgColor && bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(box.x, box.y, box.w, box.h);
          }
        };

        // Erase old text only if we are not using a clean template image
        if (!data.customTemplate.templateImageUrl) {
          if (coords.headline_box) drawEraseBox(coords.headline_box, styles.headlineBg);
          if (coords.subheadline_box) drawEraseBox(coords.subheadline_box, styles.subheadlineBg);
          if (coords.summary_box) drawEraseBox(coords.summary_box, styles.summaryBg);
          if (coords.breaking_tag_box) drawEraseBox(coords.breaking_tag_box, styles.breakingTagBg);
        }

        // Draw the generated news photo into the image_box
        if (coords.image_box && coords.image_box !== 'hidden') {
          const imgBox = parseBox(coords.image_box);
          if (imgBox) {
            // object-cover
            const imgAspect = newsImg.width / newsImg.height;
            const boxAspect = imgBox.w / imgBox.h;
            let sx = 0, sy = 0, sw = newsImg.width, sh = newsImg.height;
            
            if (imgAspect > boxAspect) {
              sw = newsImg.height * boxAspect;
              sx = (newsImg.width - sw) / 2;
            } else {
              sh = newsImg.width / boxAspect;
              sy = (newsImg.height - sh) / 2;
            }
            
            ctx.drawImage(newsImg, sx, sy, sw, sh, imgBox.x, imgBox.y, imgBox.w, imgBox.h);
          }
        } else {
          // Fallback: If no image box but using template, maybe we don't draw it at all, or just draw it somewhere transparent?
          // We assume image_box covers where the picture should go.
        }
      } else {
        // Standard case: No custom template, news photo is full background
        ctx.drawImage(newsImg, 0, 0, width, height);
      }

      // Render the selected theme overlaid text
      renderThemeOverlay(ctx, width, height, data);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    } catch (e) {
      console.error("Overlay failed", e);
      resolve(base64Str);
    }
  });
};
