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

export interface ViralPostOverlayData {
  breaking_tag: string;
  headline_line_1: string;
  headline_line_2: string;
  subheadline: string;
  branding: string;
  theme?: string;
}

export const overlayTextOnImage = (base64Str: string, data: ViralPostOverlayData): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Render the selected theme
      renderThemeOverlay(ctx, width, height, data);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(base64Str);
  });
};
