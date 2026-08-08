import articleHandler from '../api-handlers/article.js';
import cloudflareImageHandler from '../api-handlers/cloudflare-image.js';
import extractArticleHandler from '../api-handlers/extract-article.js';
import extractLinksHandler from '../api-handlers/extract-links.js';
import facebookPostVideoHandler from '../api-handlers/facebook/post-video.js';
import facebookPostHandler from '../api-handlers/facebook/post.js';
import facebookPublishHandler from '../api-handlers/facebook/publish.js';
import instagramPostVideoHandler from '../api-handlers/instagram/post-video.js';
import migrateOldSupabaseHandler from '../api-handlers/migrate-old-supabase.js';
import proxyImageHandler from '../api-handlers/proxy-image.js';
import searchImagesHandler from '../api-handlers/search-images.js';
import youtubePostVideoHandler from '../api-handlers/youtube/post-video.js';

export default async function handler(req, res) {
  let pathSegments = req.query.path;
  
  if (!pathSegments) {
    const urlPath = (req.url || '').split('?')[0].replace(/^\/api\//, '').replace(/^\//, '');
    pathSegments = urlPath ? urlPath.split('/') : [];
  } else if (typeof pathSegments === 'string') {
    pathSegments = [pathSegments];
  }

  const route = pathSegments.join('/');

  switch (route) {
    case 'article':
      return articleHandler(req, res);
    case 'cloudflare-image':
      return cloudflareImageHandler(req, res);
    case 'extract-article':
      return extractArticleHandler(req, res);
    case 'extract-links':
      return extractLinksHandler(req, res);
    case 'facebook/post':
      return facebookPostHandler(req, res);
    case 'facebook/post-video':
      return facebookPostVideoHandler(req, res);
    case 'facebook/publish':
      return facebookPublishHandler(req, res);
    case 'instagram/post-video':
      return instagramPostVideoHandler(req, res);
    case 'youtube/post-video':
      return youtubePostVideoHandler(req, res);
    case 'migrate-old-supabase':
      return migrateOldSupabaseHandler(req, res);
    case 'proxy-image':
      return proxyImageHandler(req, res);
    case 'search-images':
      return searchImagesHandler(req, res);
    default:
      return res.status(404).json({ error: `API route not found: /api/${route}` });
  }
}
