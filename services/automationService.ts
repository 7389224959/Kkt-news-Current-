import { fetchDailyNews, generateViralPost } from './geminiService.js';
import { supabase, uploadImage } from './supabase.js';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const runAutoFetch = async () => {
    console.log("== [AutoRobot] Starting Auto Fetch ==");
    
    console.log("Loading settings...");
    const hasEnvUrl = !!(typeof process !== 'undefined' ? (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) : false);
    const hasEnvKey = !!(typeof process !== 'undefined' ? (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) : false);
    console.log("Firebase/Supabase env loaded:", hasEnvUrl && hasEnvKey);

    if (!supabase) {
        const err = new Error('Supabase client failed to initialize (missing or invalid env variables)');
        (err as any).stage = "db_connection";
        throw err;
    }

    const { data: settingsData, error: settingsError } = await supabase.from('site_settings').select('*').limit(1).single();
    
    if (settingsError) {
        const err = new Error(`Database connection or table read failed: ${settingsError.message} (Code: ${settingsError.code})`);
        (err as any).stage = "fetch_settings";
        throw err;
    }

    if (!settingsData) {
        const err = new Error('Settings document missing. Ensure settings exist in the database.');
        (err as any).stage = "fetch_settings";
        throw err;
    }
    
    console.log("Settings response loaded successfully");

    let dailyNewsRssSources = settingsData.dailyNewsRssSources || [];
    if (!Array.isArray(dailyNewsRssSources) || dailyNewsRssSources.length === 0) {
        console.log("No RSS links in DB, using fallback defaults...");
        dailyNewsRssSources = [
            { url: 'https://www.bhaskar.com/rss-v1--category-1741.xml', category: 'State News' },
            { url: 'https://www.amarujala.com/rss/chhattisgarh.xml', category: 'State News' },
            { url: 'https://rss.jagran.com/naidunia/chhattisgarh.xml', category: 'State News' },
            { url: 'https://www.indiatvnews.com/rssnews/topstory-chhattisgarh.xml', category: 'State News' }
        ];
    }
    
    const dailyNewsModel = settingsData.dailyNewsModel || 'gemini';
    const dailyNewsImageStrategy = settingsData.dailyNewsImageStrategy || 'auto';
    const dailyNewsImageGenModel = settingsData.dailyNewsImageGenModel || 'gemini';

    if (dailyNewsRssSources.length === 0) {
        throw new Error("No RSS links configured for Auto Fetch.");
    }

    const newArticles = await fetchDailyNews(dailyNewsRssSources, dailyNewsModel, dailyNewsImageStrategy, dailyNewsImageGenModel);
    console.log(`== [AutoRobot] Auto Fetch Completed. Found ${newArticles.length} new articles ==`);
    return { newArticles, settingsData };
};

export const runAutoViralPost = async (article: any, settings: any) => {
    console.log("== [AutoRobot] Starting Auto Viral Post ==");
    
    const viralTemplates = settings.viralTemplates || [];
    const defaultThemes = ['kkt_premium_breaking', 'kkt_exclusive'];
    let customThemes: string[] = [];
    if (viralTemplates && viralTemplates.length > 0) {
        customThemes = viralTemplates.filter((t: any) => t.isActive).map((t: any) => `custom_${t.id}`);
    }
    const allThemes = customThemes.length > 0 ? [...customThemes, ...defaultThemes] : defaultThemes;
    
    // Choose random theme on backend to avoid localStorage dependencies
    const themeToUse = allThemes[Math.floor(Math.random() * allThemes.length)];

    let finalInstructions = `\n\nTEMPLATE REQUIREMENTS:\nYou must use theme ID: "${themeToUse}".\n`;

    let customTemplate = undefined;
    if (themeToUse.startsWith('custom_')) {
      const tmplId = themeToUse.replace('custom_', '');
      customTemplate = viralTemplates.find((t: any) => t.id === tmplId);
      if (customTemplate) {
         const hasSub = customTemplate.coordinates?.subheadline_box && customTemplate.coordinates.subheadline_box !== 'hidden';
         const hasSum = customTemplate.coordinates?.summary_box && customTemplate.coordinates.summary_box !== 'hidden';
         const hasBreak = customTemplate.coordinates?.breaking_tag_box && customTemplate.coordinates.breaking_tag_box !== 'hidden';
         const hasHead1 = customTemplate.coordinates?.headline_line_1_box && customTemplate.coordinates.headline_line_1_box !== 'hidden';
         const hasHead2 = customTemplate.coordinates?.headline_line_2_box && customTemplate.coordinates.headline_line_2_box !== 'hidden';
         const hasHeadL = customTemplate.coordinates?.headline_box && customTemplate.coordinates.headline_box !== 'hidden';

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

    const post = await generateViralPost({
      article,
      customInstructions: finalInstructions
    });
    post.theme = themeToUse;
    console.log("== [AutoRobot] Viral Post Generated ==");

    let reuseImageUrl = article.featuredCollageImage || article.image || article.imageUrl;
    let fallbackBase64 = reuseImageUrl || '';
    if (reuseImageUrl) {
        try {
            const ibResponse = await fetch(reuseImageUrl);
            const ibBuffer = await ibResponse.arrayBuffer();
            fallbackBase64 = `data:image/jpeg;base64,${Buffer.from(ibBuffer).toString('base64')}`;
        } catch (e) {
            console.warn("Failed to fetch article image to base64", e);
        }
    }

    console.log("== [AutoRobot] Calling Vercel /api/proxy-image for overlay ==");
    // Cannot import canvas directly because automationService might be called by edge/client functions
    // Use an API call or dynamic import approach for the node canvas.
    const siteUrl = process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.URL) || 'http://localhost:3000';
    let overlaidImageUrl = reuseImageUrl;

    // We can conditionally call our own internal utility for node canvas if in Node.
    // Or just proxy it if required. But wait! The script runs purely in node, so we can use dynamic import of 'canvas'.
    let newImageBase64 = fallbackBase64;
    try {
        if (typeof window === 'undefined') {
            const nodeOverlayModule = await import('../src/utils/nodeImageUtils.js');
            newImageBase64 = await nodeOverlayModule.overlayTextOnImageNode(fallbackBase64, {
                breaking_tag: post.breaking_tag,
                headline_line_1: post.headline_line_1,
                headline_line_2: post.headline_line_2,
                subheadline: post.subheadline,
                summary: post.summary,
                branding: post.branding,
                theme: post.theme,
                customTemplate
            });
        } else {
            // Frontend fallback just in case it runs on client
            const { overlayTextOnImage } = await import('../src/utils/imageUtils.js');
            newImageBase64 = await overlayTextOnImage(fallbackBase64, {
                breaking_tag: post.breaking_tag,
                headline_line_1: post.headline_line_1,
                headline_line_2: post.headline_line_2,
                subheadline: post.subheadline,
                summary: post.summary,
                branding: post.branding,
                theme: post.theme,
                customTemplate
            });
        }
    } catch(e) {
        console.error("Overlay failed", e);
    }

    console.log("== [AutoRobot] Uploading Final Image ==");
    overlaidImageUrl = await uploadImage(newImageBase64);

    let fbResult;
    try {
        console.log("== [AutoRobot] Publishing to Facebook ==");
        // Import facebook service
        const { postToFacebook } = await import('./facebookService.js');
        fbResult = await postToFacebook(post.caption, overlaidImageUrl, undefined, true);
        console.log("== [AutoRobot] Facebook Published Done ==");
    } catch(err: any) {
        fbResult = { error: err.message };
        console.error("== [AutoRobot] Facebook Publish Failed:", err.message);
    }
    
    return { post, overlaidImageUrl, fbResult };
}

export const runAutoRobot = async () => {
    console.log("=== AUTO ROBOT INITIATED ===");
    try {
        const { newArticles, settingsData } = await runAutoFetch();
        
        let articleToUse = null;
        if (!newArticles || newArticles.length === 0) {
            console.log("=== AUTO ROBOT: No new articles fetched. Attempting to post the most recent article... ===");
            const { data: latestArticles, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false }).limit(1);
            if (!latestArticles || latestArticles.length === 0) {
                return { status: "success", message: "No new articles and no existing articles to viral post.", fetchedCount: 0 };
            }
            articleToUse = latestArticles[0];
        } else {
            console.log(`=== Auto fetch grabbed ${newArticles.length} new articles. ===`);
            articleToUse = newArticles[0]; 
        }
        
        console.log(`=== Generating viral post for article: ${articleToUse.title} ===`);
        const viralResult = await runAutoViralPost(articleToUse, settingsData);
        
        console.log("=== AUTO ROBOT COMPLETE ===");
        return { 
            status: "success", 
            message: "Auto robot completed successfully.",
            fetchedCount: newArticles?.length || 0,
            viralPost: viralResult
        };
    } catch (e: any) {
        console.error("=== AUTO ROBOT FAILED ===", e);
        return { status: "error", error: e.message };
    }
};
