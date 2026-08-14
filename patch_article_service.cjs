const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'articleService.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace getSiteSettings
content = content.replace(
  /export const getSiteSettings = async \(\): Promise<SiteSettings \| null> => \{[\s\S]*?return data as SiteSettings;\n\};/,
  `export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  
  if (data) {
    const allReels = data.reelTemplates || [];
    data.clientReelTemplates = allReels.filter((r: any) => r.isClientTemplate);
    data.reelTemplates = allReels.filter((r: any) => !r.isClientTemplate);
  }
  
  return data as SiteSettings;
};`
);

// Replace saveSiteSettings
content = content.replace(
  /export const saveSiteSettings = async \(settings: SiteSettings\): Promise<any> => \{[\s\S]*?\}\n\};/,
  `export const saveSiteSettings = async (settings: SiteSettings): Promise<any> => {
  try {
    let targetId = (settings as any).id;
    
    if (!targetId) {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        targetId = existing.id;
      }
    }

    const payload = targetId ? { ...settings, id: targetId } : { ...settings };
    
    // Combine reelTemplates and clientReelTemplates
    const combinedReels = [
      ...(payload.reelTemplates || []).map((t: any) => ({ ...t, isClientTemplate: false })),
      ...(payload.clientReelTemplates || []).map((t: any) => ({ ...t, isClientTemplate: true }))
    ];
    
    payload.reelTemplates = combinedReels;
    delete payload.clientReelTemplates;

    const { data, error } = await supabase
      .from('site_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      const allReels = data.reelTemplates || [];
      data.clientReelTemplates = allReels.filter((r: any) => r.isClientTemplate);
      data.reelTemplates = allReels.filter((r: any) => !r.isClientTemplate);
    }

    return data;
  } catch (error) {
    console.error("Error in saveSiteSettings:", error);
    throw error;
  }
};`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('articleService.ts patched');
