import { overlayTextOnImageNode } from './api/cron-auto-robot';

(async () => {
    try {
      const b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP..."; // Just an invalid or empty image would crash loadImage if valid is required. Let me create a small valid base64
      // 1x1 white pixel
      const validBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
      const res = await overlayTextOnImageNode(validBase64, {
        breaking_tag: 'test',
        headline_line_1: 'test headline',
        headline_line_2: 'test headline 2',
        subheadline: 'test sub',
        summary: 'test sum',
        branding: 'test brand',
        theme: 'breaking_red'
      });
      console.log('Result length:', res.length);
    } catch(e) {
      console.error(e);
    }
})();
