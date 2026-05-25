import { fetchDailyNews } from '../services/geminiService.js';
import { generateViralPost } from '../services/geminiService.js';
import { supabase } from '../services/supabase.js';
import { uploadImage } from '../services/supabase.js';
import { renderThemeOverlay } from '../src/utils/themeRenderer.js';
import { createCanvas, loadImage } from 'canvas';
import dotenv from 'dotenv';
dotenv.config();

import { overlayTextOnImageNode } from '../src/utils/nodeImageUtils.js';

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Very simple secret protection
  const { secret } = req.query;
  if (!secret || secret !== process.env.CRON_SECRET) {
    // We recommend user to add CRON_SECRET to their Vercel/environment vars
    if (process.env.CRON_SECRET) {
       return res.status(401).json({ error: 'Unauthorized. Invalid secret.' });
    } else {
       // if they didn't define it yet, we let it pass but alert
       console.warn("WARNING: CRON_SECRET is not set in environment variables. Anyone can trigger this endpoint.");
    }
  }

  try {
    const { data: settingsData, error: settingsError } = await supabase.from('site_settings').select('*').limit(1).single();
    if (!settingsData) {
        console.error("Failed to fetch settings:", settingsError);
        return res.status(500).json({ error: 'Failed to fetch settings', details: settingsError });
    }

    const dailyNewsRssSources = settingsData.dailyNewsRssSources || [];
    const dailyNewsModel = settingsData.dailyNewsModel || 'gemini';
    const dailyNewsImageStrategy = settingsData.dailyNewsImageStrategy || 'auto';
    const dailyNewsImageGenModel = settingsData.dailyNewsImageGenModel || 'gemini';
    const viralTemplates = settingsData.viralTemplates || [];

    if (dailyNewsRssSources.length === 0) {
      return res.status(400).json({ error: "Please add at least one RSS link to use Auto Robot." });
    }

    console.log("Fetching new articles...");
    const newArticles = await fetchDailyNews(dailyNewsRssSources, dailyNewsModel, dailyNewsImageStrategy, dailyNewsImageGenModel);
    
    if (newArticles.length === 0) {
      return res.status(200).json({ message: "No new articles found." });
    }

    let articleToUse = newArticles[0]; 

    const defaultThemes = ['kkt_premium_breaking', 'kkt_exclusive'];
    let customThemes: string[] = [];
    if (viralTemplates && viralTemplates.length > 0) {
        customThemes = viralTemplates.filter((t: any) => t.isActive).map((t: any) => `custom_${t.id}`);
    }
    const allThemes = customThemes.length > 0 ? [...customThemes, ...defaultThemes] : defaultThemes;
    
    // Choose a random theme for the cron job to avoid tracking indices via localStorage
    const themeToUse = allThemes[Math.floor(Math.random() * allThemes.length)];

    let finalInstructions = `\n\nTEMPLATE REQUIREMENTS:\nYou must use theme ID: "${themeToUse}".\n`;

    let customTemplate = undefined;
    if (themeToUse.startsWith('custom_')) {
      const tmplId = themeToUse.replace('custom_', '');
      customTemplate = viralTemplates.find((t: any) => t.id === tmplId);
      if (customTemplate) {
         const tmpl = customTemplate;
         const hasSub = tmpl.coordinates?.subheadline_box && tmpl.coordinates.subheadline_box !== 'hidden';
         const hasSum = tmpl.coordinates?.summary_box && tmpl.coordinates.summary_box !== 'hidden';
         const hasBreak = tmpl.coordinates?.breaking_tag_box && tmpl.coordinates.breaking_tag_box !== 'hidden';
         const hasHead1 = tmpl.coordinates?.headline_line_1_box && tmpl.coordinates.headline_line_1_box !== 'hidden';
         const hasHead2 = tmpl.coordinates?.headline_line_2_box && tmpl.coordinates.headline_line_2_box !== 'hidden';
         const hasHeadL = tmpl.coordinates?.headline_box && tmpl.coordinates.headline_box !== 'hidden';

         if (!hasSub) finalInstructions += "- DO NOT GENERATE a subheadline, it is hidden in this template.\n";
         if (!hasSum) finalInstructions += "- DO NOT GENERATE a summary, it is hidden in this template.\n";
         if (!hasBreak) finalInstructions += "- DO NOT GENERATE a breaking_tag, it is hidden.\n";
         if (!hasHead1 && !hasHead2 && !hasHeadL) { } 
         else {
             if (hasHead1) {} else if (!hasHeadL) finalInstructions += "- DO NOT GENERATE headline_line_1.\n";
             if (hasHead2) {} else if (!hasHeadL) finalInstructions += "- DO NOT GENERATE headline_line_2.\n";
         }
      }
    }

    console.log("Generating Viral Post...");
    const post = await generateViralPost({
      article: articleToUse,
      customInstructions: finalInstructions
    });
    
    post.theme = themeToUse;
    
    let reuseImageUrl = articleToUse.featuredCollageImage || articleToUse.image || articleToUse.imageUrl;
    let fallbackBase64 = reuseImageUrl || '';
    if (reuseImageUrl) {
       // Convert remote URL to Base64 for the canvas rendering
       try {
           const ibResponse = await fetch(reuseImageUrl);
           const ibBuffer = await ibResponse.arrayBuffer();
           fallbackBase64 = `data:image/jpeg;base64,${Buffer.from(ibBuffer).toString('base64')}`;
       } catch (e) {
           console.warn("Failed to fetch article image to base64", e);
       }
    }

    console.log("Overlaying text on image...");
    const newImageBase64 = await overlayTextOnImageNode(fallbackBase64, {
      breaking_tag: post.breaking_tag,
      headline_line_1: post.headline_line_1,
      headline_line_2: post.headline_line_2,
      subheadline: post.subheadline,
      summary: post.summary,
      branding: post.branding,
      theme: post.theme,
      customTemplate
    });
    
    console.log("Uploading final overlay image...");
    const overlaidImageUrl = await uploadImage(newImageBase64);
    
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${req.headers.host}`;
    
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;
    console.log("FB endpoint:", `${baseUrl}/api/facebook/post`);
    console.log("Token source:", "process.env (FB_PAGE_ACCESS_TOKEN or VITE_FB_PAGE_ACCESS_TOKEN)");
    console.log("Token prefix:", accessToken?.slice(0, 20));
    
    console.log("Posting to Facebook...");
    let fbResult;
    try {
        const postRes = await fetch(`${baseUrl}/api/facebook/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: post.caption,
                imageUrl: overlaidImageUrl,
                published: false
            })
        });
        
        fbResult = await postRes.json();
        
        if (!postRes.ok) {
            console.error("Facebook API internal post failed:", fbResult);
        }
    } catch(err: any) {
        console.error("Fetch to internal FB post API failed:", err);
        fbResult = { error: err.message };
    }
    
    return res.status(200).json({
      message: `Successfully auto-fetched and posted viral content!`,
      newArticlesCount: newArticles.length,
      publishedArticle: articleToUse.title,
      facebookResponse: fbResult
    });

  } catch (error: any) {
    console.error("Cron Auto Robot Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
