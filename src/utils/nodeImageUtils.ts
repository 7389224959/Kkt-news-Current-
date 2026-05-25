import { createCanvas, loadImage, registerFont } from 'canvas';
import { renderThemeOverlay } from './themeRenderer.js';
import path from 'path';
import fs from 'fs';
import https from 'https';
import os from 'os';

let fontsRegistered = false;

const downloadFont = async (url: string, dest: string): Promise<void> => {
  if (fs.existsSync(dest)) {
    const stats = fs.statSync(dest);
    if (stats.size > 0) return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
};

const ensureFonts = async () => {
  if (fontsRegistered) return;
  const tmpDir = os.tmpdir();
  const fontRegularPath = path.join(tmpDir, 'Mukta-Regular.ttf');
  const fontBoldPath = path.join(tmpDir, 'Mukta-Bold.ttf');
  const fontEmojiPath = path.join(tmpDir, 'NotoColorEmoji.ttf');
  
  try {
    await downloadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/mukta/Mukta-Regular.ttf', fontRegularPath);
    await downloadFont('https://raw.githubusercontent.com/google/fonts/main/ofl/mukta/Mukta-Bold.ttf', fontBoldPath);
    await downloadFont('https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf', fontEmojiPath);
    
    registerFont(fontRegularPath, { family: 'NotoDevanagari' });
    registerFont(fontBoldPath, { family: 'NotoDevanagariBold' });
    registerFont(fontBoldPath, { family: 'NotoDevanagari', weight: 'bold' });
    registerFont(fontRegularPath, { family: 'Noto Sans Devanagari' });
    registerFont(fontBoldPath, { family: 'Noto Sans Devanagari', weight: 'bold' });
    registerFont(fontRegularPath, { family: 'Mukta' });
    registerFont(fontBoldPath, { family: 'Mukta', weight: 'bold' });
    registerFont(fontEmojiPath, { family: 'NotoEmoji' });
    fontsRegistered = true;
    console.log("Fonts downloaded and registered successfully to /tmp");
  } catch (e) {
    console.error("Failed to download or register fonts:", e);
    
    // Fallback to local repo paths if testing locally
    const localReg = path.join(process.cwd(), 'assets', 'fonts', 'Mukta-Regular.ttf');
    const localBold = path.join(process.cwd(), 'assets', 'fonts', 'Mukta-Bold.ttf');
    
    if (fs.existsSync(localReg) && fs.existsSync(localBold)) {
      try {
        registerFont(localReg, { family: 'NotoDevanagari' });
        registerFont(localBold, { family: 'NotoDevanagariBold' });
        fontsRegistered = true;
        console.log("Fallback fonts registered successfully");
      } catch (err) {}
    }
  }
};

export const overlayTextOnImageNode = (base64Str: string, data: any): Promise<string> => {
  return new Promise(async (resolve) => {
    try {
      await ensureFonts();
      
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
          const parts = boxStr.split(',').map((p: string) => parseFloat(p.replace(/%/g, '').trim()));
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
          if (coords.headline_line_1_box) drawEraseBox(coords.headline_line_1_box, styles.headlineBg);
          if (coords.headline_line_2_box) drawEraseBox(coords.headline_line_2_box, styles.headlineBg);
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

      // Substitute "Inter" with "NotoDevanagari" since node-canvas doesn't have Inter
      if (data.customTemplate && data.customTemplate.style_rules) {
        const rules = data.customTemplate.style_rules;
        Object.keys(rules).forEach(k => {
          if (typeof rules[k] === 'string') {
            if (rules[k].includes('Inter')) {
              rules[k] = rules[k].replace(/Inter/g, 'NotoDevanagari');
            }
            if (rules[k].includes('sans-serif') && !rules[k].includes('NotoEmoji')) {
               rules[k] = rules[k].replace(/sans-serif/g, '"NotoEmoji", sans-serif');
            }
          }
        });
      }

      // @ts-ignore
      renderThemeOverlay(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, data);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    } catch (e) {
      console.error("Overlay failed in node canvas", e);
      resolve(base64Str);
    }
  });
};
