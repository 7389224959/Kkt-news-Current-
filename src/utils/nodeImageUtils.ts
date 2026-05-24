import { renderThemeOverlay } from './themeRenderer';
import { createCanvas, loadImage } from 'canvas';

export const overlayTextOnImageNode = (base64Str: string, data: any): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      const imgBuffer = Buffer.from(base64Str.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      const newsImg = await loadImage(imgBuffer);
      let templateImg: any = null;
      
      if (data.customTemplate) {
        const bgUrl = data.customTemplate.templateImageUrl || data.customTemplate.referenceImageUrl;
        if (bgUrl) {
          try {
            templateImg = await loadImage(bgUrl);
          } catch (e) {
            console.warn("Could not load template image", e);
          }
        }
      }

      const CANVAS_WIDTH = 1080;
      const CANVAS_HEIGHT = 1350;
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const ctx = canvas.getContext('2d');

      if (templateImg && data.customTemplate) {
        ctx.drawImage(templateImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const tmpl = data.customTemplate;
        const coords = tmpl.coordinates || {};
        const styles = tmpl.style_rules || {};

        const parseBox = (boxStr: string | undefined) => {
          if (!boxStr || boxStr === 'hidden') return null;
          const parts = boxStr.split('%').map(p => parseFloat(p.replace(/,/g, '').trim()));
          if (parts.length >= 4 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2]) && !isNaN(parts[3])) {
            return {
              x: (parts[0] / 100) * CANVAS_WIDTH,
              y: (parts[1] / 100) * CANVAS_HEIGHT,
              w: (parts[2] / 100) * CANVAS_WIDTH,
              h: (parts[3] / 100) * CANVAS_HEIGHT,
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

        if (!data.customTemplate.templateImageUrl) {
          if (coords.headline_box) drawEraseBox(coords.headline_box, styles.headlineBg);
          if (coords.subheadline_box) drawEraseBox(coords.subheadline_box, styles.subheadlineBg);
          if (coords.summary_box) drawEraseBox(coords.summary_box, styles.summaryBg);
          if (coords.breaking_tag_box) drawEraseBox(coords.breaking_tag_box, styles.breakingTagBg);
        }

        if (coords.image_box && coords.image_box !== 'hidden') {
          const imgBox = parseBox(coords.image_box);
          if (imgBox) {
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
        }
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const imgAspect = newsImg.width / newsImg.height;
        const boxAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        let sx = 0, sy = 0, sw = newsImg.width, sh = newsImg.height;
        if (imgAspect > boxAspect) {
          sw = newsImg.height * boxAspect;
          sx = (newsImg.width - sw) / 2;
        } else {
          sh = newsImg.width / boxAspect;
          sy = (newsImg.height - sh) / 2;
        }
        ctx.drawImage(newsImg, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // @ts-ignore - The types strictly diverge somewhat for Node canvas, but structure is similar
      renderThemeOverlay(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, data);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    } catch (e) {
      console.error("Overlay failed in node canvas", e);
      resolve(base64Str);
    }
  });
};
