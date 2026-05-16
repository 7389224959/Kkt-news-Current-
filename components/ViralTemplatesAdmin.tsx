import React, { useState } from 'react';
import { SiteSettings, ViralTemplate, Article } from '../types';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Image as ImageIcon, Wand2, RefreshCw } from 'lucide-react';
import { uploadImage } from '../services/supabase';
import { analyzeViralTemplate, generateViralPost, generateViralImage } from '../services/geminiService';
import { ViralPostOverlayData } from '../src/utils/imageUtils';
import ViralTemplateEditor from './ViralTemplateEditor';

interface ViralTemplatesAdminProps {
  settings: SiteSettings;
  articles: Article[];
  onSaveSettings: (settings: SiteSettings) => Promise<void>;
}

const ViralTemplatesAdmin: React.FC<ViralTemplatesAdminProps> = ({ settings, articles, onSaveSettings }) => {
  const templates = settings.viralTemplates || [];
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ViralTemplate | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCleanImage, setUploadingCleanImage] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<ViralPostOverlayData> | undefined>(undefined);
  const [previewNewsImage, setPreviewNewsImage] = useState<string | undefined>(undefined);
  
  const handleAddNew = () => {
    const newTemplate: ViralTemplate = {
      id: crypto.randomUUID(),
      name: 'New Viral Template',
      referenceImageUrl: '',
      coordinates: {
        headline_box: '10%, 75%, 80%, 20%',
        subheadline_box: 'hidden',
        summary_box: 'hidden',
        breaking_tag_box: '10%, 65%, 40%, 8%'
      },
      usedElements: {
        hasHeadline: true,
        hasSubheadline: false,
        hasSummary: false,
        hasBreakingTag: true
      },
      style_rules: {
        headlineColor: '#FFFFFF',
        subheadlineColor: '#FCD34D',
        summaryColor: '#E5E7EB',
        breakingTagColor: '#FFFFFF',
        breakingTagBg: '#DC2626'
      },
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setEditingTemplate(newTemplate);
    setIsEditing(true);
  };

  const handleEdit = (tmpl: ViralTemplate) => {
    setEditingTemplate({ 
      ...tmpl, 
      coordinates: tmpl.coordinates || {
        headline_box: 'hidden',
        subheadline_box: 'hidden',
        summary_box: 'hidden',
        breaking_tag_box: 'hidden'
      },
      style_rules: tmpl.style_rules || {
        headlineColor: '#FFFFFF',
        subheadlineColor: '#FCD34D',
        summaryColor: '#E5E7EB',
        breakingTagColor: '#FFFFFF',
        breakingTagBg: '#DC2626'
      },
      usedElements: tmpl.usedElements || {
        hasHeadline: false,
        hasSubheadline: false,
        hasSummary: false,
        hasBreakingTag: false
      }
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updated = templates.filter((t: ViralTemplate) => t.id !== id);
      await onSaveSettings({ ...settings, viralTemplates: updated });
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const updated = templates.map((t: ViralTemplate) => t.id === id ? { ...t, isActive: !current } : t);
    await onSaveSettings({ ...settings, viralTemplates: updated });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    let updated;
    if (templates.find((t: ViralTemplate) => t.id === editingTemplate.id)) {
      updated = templates.map((t: ViralTemplate) => t.id === editingTemplate.id ? editingTemplate : t);
    } else {
      updated = [...templates, editingTemplate];
    }
    
    await onSaveSettings({ ...settings, viralTemplates: updated });
    setIsEditing(false);
    setEditingTemplate(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTemplate) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const url = await uploadImage(base64);
          setEditingTemplate({ ...editingTemplate, referenceImageUrl: url });
        } catch (uploadFailed) {
          console.warn("Upload to supabase failed, using base64 locally temporarily");
          setEditingTemplate({ ...editingTemplate, referenceImageUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Image upload error", e);
      alert("Failed to read image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCleanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTemplate) return;

    setUploadingCleanImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const url = await uploadImage(base64);
          setEditingTemplate({ ...editingTemplate, templateImageUrl: url });
        } catch (uploadFailed) {
          console.warn("Upload to supabase failed, using base64 locally temporarily");
          setEditingTemplate({ ...editingTemplate, templateImageUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Image upload error", e);
      alert("Failed to read image.");
    } finally {
      setUploadingCleanImage(false);
    }
  };

  const handleAnalyze = async () => {
    if (!editingTemplate || !editingTemplate.referenceImageUrl) return;
    
    setAnalyzingImage(true);
    try {
      // Analyze image
      const analysis = await analyzeViralTemplate(editingTemplate.referenceImageUrl);
      
      const newCoords = { ...editingTemplate.coordinates };
      const newUsed = { ...editingTemplate.usedElements };
      const newStyles = { ...editingTemplate.style_rules };

      if (analysis.hasImage && analysis.image_box) {
         newCoords.image_box = analysis.image_box;
         newUsed.hasImage = true;
      } else {
         newCoords.image_box = 'hidden';
      }

      if (analysis.hasHeadline && analysis.headline_box) {
         newCoords.headline_box = analysis.headline_box;
         newUsed.hasHeadline = true;
      } else {
         newCoords.headline_box = 'hidden';
      }

      if (analysis.hasSubheadline && analysis.subheadline_box) {
         newCoords.subheadline_box = analysis.subheadline_box;
         newUsed.hasSubheadline = true;
      } else {
         newCoords.subheadline_box = 'hidden';
      }

      if (analysis.hasSummary && analysis.summary_box) {
         newCoords.summary_box = analysis.summary_box;
         newUsed.hasSummary = true;
      } else {
         newCoords.summary_box = 'hidden';
      }

      if (analysis.hasBreakingTag && analysis.breaking_tag_box) {
         newCoords.breaking_tag_box = analysis.breaking_tag_box;
         newUsed.hasBreakingTag = true;
      } else {
         newCoords.breaking_tag_box = 'hidden';
      }

      if (analysis.style_rules) {
         if (analysis.style_rules.headlineColor) newStyles.headlineColor = analysis.style_rules.headlineColor;
         if (analysis.style_rules.subheadlineColor) newStyles.subheadlineColor = analysis.style_rules.subheadlineColor;
         if (analysis.style_rules.summaryColor) newStyles.summaryColor = analysis.style_rules.summaryColor;
         if (analysis.style_rules.breakingTagColor) newStyles.breakingTagColor = analysis.style_rules.breakingTagColor;
         if (analysis.style_rules.breakingTagBg) newStyles.breakingTagBg = analysis.style_rules.breakingTagBg;
         if (analysis.style_rules.headlineBg) newStyles.headlineBg = analysis.style_rules.headlineBg;
         if (analysis.style_rules.subheadlineBg) newStyles.subheadlineBg = analysis.style_rules.subheadlineBg;
         if (analysis.style_rules.summaryBg) newStyles.summaryBg = analysis.style_rules.summaryBg;
         if (analysis.style_rules.headlineFontSizeMult) newStyles.headlineFontSizeMult = analysis.style_rules.headlineFontSizeMult;
         if (analysis.style_rules.subheadlineFontSizeMult) newStyles.subheadlineFontSizeMult = analysis.style_rules.subheadlineFontSizeMult;
         if (analysis.style_rules.summaryFontSizeMult) newStyles.summaryFontSizeMult = analysis.style_rules.summaryFontSizeMult;
      }

      setEditingTemplate({
        ...editingTemplate,
        coordinates: newCoords,
        usedElements: newUsed,
        style_rules: newStyles
      });
      alert("Analysis complete! The bounding boxes have been updated to match the image.");
    } catch(err) {
      alert("Analysis failed. Please try again or manually adjust boxes.");
      console.error(err);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!editingTemplate || articles.length === 0) {
      alert("No articles available or template not ready.");
      return;
    }
    setIsGeneratingPreview(true);
    try {
      let finalInstructions = `\n\nTEMPLATE REQUIREMENTS:\nYou must use theme ID: "custom_${editingTemplate.id}".\n`;
      const parseBoxToChars = (boxString: string | undefined, mult: number) => {
         if(!boxString || boxString === 'hidden') return 0;
         const parts = boxString.split(',').map(s => parseFloat(s.replace('%','')));
         if(parts.length===4) {
           const w = parts[2];
           const h = parts[3];
           return Math.floor((w * h) / mult);
         }
         return 0;
      };

      const coords = editingTemplate.coordinates || {};
      const hasSub = coords.subheadline_box && coords.subheadline_box !== 'hidden';
      const hasSum = coords.summary_box && coords.summary_box !== 'hidden';
      const hasBreak = coords.breaking_tag_box && coords.breaking_tag_box !== 'hidden';
      const hasHead1 = coords.headline_line_1_box && coords.headline_line_1_box !== 'hidden';
      const hasHead2 = coords.headline_line_2_box && coords.headline_line_2_box !== 'hidden';
      const hasHeadL = coords.headline_box && coords.headline_box !== 'hidden';

      if (!hasSub) {
         finalInstructions += "- DO NOT GENERATE a subheadline, it is hidden in this template.\n";
      } else {
         const maxChars = editingTemplate.limits?.subheadlineMaxChars || Math.floor(parseBoxToChars(coords.subheadline_box, 15));
         if(maxChars > 0) finalInstructions += `- SUBHEADLINE MAX LENGTH: extremely strict limit of ~${maxChars} ALPHABETS/CHARACTERS.\n`;
      }

      if (!hasSum) {
         finalInstructions += "- DO NOT GENERATE a summary, it is hidden in this template.\n";
      } else {
         const maxChars = editingTemplate.limits?.summaryMaxChars || parseBoxToChars(coords.summary_box, 20);
         finalInstructions += `- IMPORTANT: You MUST GENERATE a 'summary' containing key bullet points or a short news summary for this template.\n`;
         if(maxChars > 0) finalInstructions += `- SUMMARY MAX LENGTH: strictly keep it under ~${Math.max(60, maxChars)} characters so it fits the screen box.\n`;
      }

      if (!hasBreak) finalInstructions += "- DO NOT GENERATE a breaking_tag, it is hidden in this template.\n";

      if (!hasHead1 && !hasHead2 && !hasHeadL) {
         finalInstructions += "- DO NOT GENERATE a headline (line 1 or 2), it is hidden in this template.\n";
      } else {
         if (hasHead1 || hasHeadL) {
             const limit1 = editingTemplate.limits?.headlineMaxChars || Math.floor(parseBoxToChars(coords.headline_line_1_box || coords.headline_box, 8));
             if(limit1 > 0) finalInstructions += `- HEADLINE LINE 1 MAX LENGTH: strictly keep it under ~${Math.max(5, limit1)} ALPHABETS/CHARACTERS.\n`;
         } else {
             finalInstructions += "- DO NOT GENERATE headline_line_1.\n";
         }
         
         if (hasHead2) {
             const limit2 = editingTemplate.limits?.headline2MaxChars || Math.floor(parseBoxToChars(coords.headline_line_2_box, 8));
             if(limit2 > 0) finalInstructions += `- HEADLINE LINE 2 MAX LENGTH: strictly keep it under ~${Math.max(5, limit2)} ALPHABETS/CHARACTERS.\n`;
         } else if (!hasHeadL) {
             finalInstructions += "- DO NOT GENERATE headline_line_2.\n";
         }
      }

      const post = await generateViralPost({
        article: articles[0],
        customInstructions: finalInstructions
      });
      
      const imageBase64 = await generateViralImage(post.image_prompt || articles[0].title, undefined, 'gemini');
      
      setPreviewData(post);
      setPreviewNewsImage(imageBase64);
    } catch (e) {
      console.error(e);
      alert("Failed to generate preview from AI.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="text-blue-600" />
            Viral Post Templates
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage image templates for automated viral news posts.</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} /> Add Template
          </button>
        )}
      </div>

      {isEditing && editingTemplate ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-4 border rounded-lg">
            <h3 className="font-bold text-lg">Editing: {editingTemplate.name || 'New Template'}</h3>
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-2">
                 <X size={16} /> Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2">
                 <Save size={16} /> Save Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold mb-1">Template Name</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} placeholder="e.g. Broken Red Frame" />
               </div>

               <div>
                  <label className="block text-sm font-semibold mb-1">Reference Image (Screenshot)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="ref-upload" 
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="ref-upload" className="px-4 py-2 border rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center gap-2">
                      <ImageIcon size={16} /> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                    {editingTemplate.referenceImageUrl && (
                      <button 
                        onClick={handleAnalyze} 
                        disabled={analyzingImage}
                        className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 rounded-lg flex items-center gap-2"
                      >
                         {analyzingImage ? <Wand2 className="animate-spin text-purple-600" size={16} /> : <Wand2 className="text-purple-600" size={16} />}
                         {analyzingImage ? 'Analyzing...' : 'AI Analyze Layout'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload a real viral post image, then click AI Analyze to automatically detect text boxes.</p>
               </div>

               <div>
                  <label className="block text-sm font-semibold mb-1">Clean Background Image (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="clean-upload" 
                      onChange={handleCleanImageUpload}
                    />
                    <label htmlFor="clean-upload" className="px-4 py-2 border rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center gap-2">
                      <ImageIcon size={16} /> {uploadingCleanImage ? 'Uploading...' : 'Upload Clean Background'}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload a clean version of the template without text. If provided, this will be used as the base instead of erasing text from the reference image.</p>
               </div>
               
               <div className="border-t pt-4 mt-6">
                 <h4 className="font-bold text-md mb-2">Style Rules</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                       <label className="block text-xs font-semibold mb-1">Headline Color</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.headlineColor || '#FFFFFF'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.headlineColor || '#FFFFFF'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Subhead Color</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.subheadlineColor || '#FCD34D'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.subheadlineColor || '#FCD34D'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Tag Bg Color</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.breakingTagBg || '#DC2626'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, breakingTagBg: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.breakingTagBg || '#DC2626'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, breakingTagBg: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Tag Text Color</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.breakingTagColor || '#FFFFFF'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, breakingTagColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.breakingTagColor || '#FFFFFF'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, breakingTagColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                       <label className="block text-xs font-semibold mb-1">Summary Color</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.summaryColor || '#E5E7EB'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.summaryColor || '#E5E7EB'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Highlight Color (Global)</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, highlightColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, highlightColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Headline Highlight</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.headlineHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineHighlightColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.headlineHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineHighlightColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Summary Highlight</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.summaryHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryHighlightColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.summaryHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryHighlightColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-semibold mb-1">Subhead Highlight</label>
                       <div className="flex gap-2">
                         <input type="color" value={editingTemplate.style_rules.subheadlineHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineHighlightColor: e.target.value}})} className="w-8 h-8 rounded shrink-0"/>
                         <input type="text" value={editingTemplate.style_rules.subheadlineHighlightColor || editingTemplate.style_rules.highlightColor || '#FF3B30'} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineHighlightColor: e.target.value}})} className="w-full p-1 border rounded text-sm"/>
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Headline Font</label>
                      <select value={editingTemplate.style_rules.headlineFont || ''} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineFont: e.target.value}})} className="w-full p-1 border rounded text-sm">
                        <option value="">Default (Hindi)</option>
                        <option value='"Inter", sans-serif'>Inter</option>
                        <option value='"Impact", sans-serif'>Impact</option>
                        <option value='"Arial", sans-serif'>Arial</option>
                        <option value='"Georgia", serif'>Georgia</option>
                        <option value='"Noto Sans Devanagari", sans-serif'>Noto Sans Devanagari</option>
                      </select>
                      <div className="mt-2 flex items-center gap-2">
                         <span className="text-xs">Aa-</span>
                         <input type="range" min="0.5" max="2.0" step="0.1" value={editingTemplate.style_rules.headlineFontSizeMult || 1.0} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, headlineFontSizeMult: parseFloat(e.target.value)}})} className="w-full" />
                         <span className="text-xs">Aa+</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Subhead Font</label>
                      <select value={editingTemplate.style_rules.subheadlineFont || ''} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineFont: e.target.value}})} className="w-full p-1 border rounded text-sm">
                        <option value="">Default (Hindi)</option>
                        <option value='"Inter", sans-serif'>Inter</option>
                        <option value='"Impact", sans-serif'>Impact</option>
                        <option value='"Arial", sans-serif'>Arial</option>
                        <option value='"Georgia", serif'>Georgia</option>
                        <option value='"Noto Sans Devanagari", sans-serif'>Noto Sans Devanagari</option>
                      </select>
                      <div className="mt-2 flex items-center gap-2">
                         <span className="text-xs">Aa-</span>
                         <input type="range" min="0.5" max="2.0" step="0.1" value={editingTemplate.style_rules.subheadlineFontSizeMult || 1.0} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, subheadlineFontSizeMult: parseFloat(e.target.value)}})} className="w-full" />
                         <span className="text-xs">Aa+</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Summary Font</label>
                      <select value={editingTemplate.style_rules.summaryFont || ''} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryFont: e.target.value}})} className="w-full p-1 border rounded text-sm">
                        <option value="">Default (Hindi)</option>
                        <option value='"Inter", sans-serif'>Inter</option>
                        <option value='"Impact", sans-serif'>Impact</option>
                        <option value='"Arial", sans-serif'>Arial</option>
                        <option value='"Georgia", serif'>Georgia</option>
                        <option value='"Noto Sans Devanagari", sans-serif'>Noto Sans Devanagari</option>
                      </select>
                      <div className="mt-2 flex items-center gap-2">
                         <span className="text-xs">Aa-</span>
                         <input type="range" min="0.5" max="2.0" step="0.1" value={editingTemplate.style_rules.summaryFontSizeMult || 1.0} onChange={e => setEditingTemplate({...editingTemplate, style_rules: {...editingTemplate.style_rules, summaryFontSizeMult: parseFloat(e.target.value)}})} className="w-full" />
                         <span className="text-xs">Aa+</span>
                      </div>
                    </div>
                 </div>
               </div>
               
               <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="font-bold mb-2 text-sm text-gray-700">Content Constraints (Word/Char Limits)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div>
                       <label className="block text-xs font-semibold mb-1">Headline 1 Max Alphabets/Chars</label>
                       <input type="number" 
                              value={editingTemplate.limits?.headlineMaxChars || ''} 
                              onChange={e => setEditingTemplate({...editingTemplate, limits: {...editingTemplate.limits, headlineMaxChars: e.target.value ? parseInt(e.target.value) : undefined}})} 
                              className="w-full p-2 border rounded" 
                              placeholder="e.g. 15" />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold mb-1">Headline 2 Max Alphabets/Chars</label>
                       <input type="number" 
                              value={editingTemplate.limits?.headline2MaxChars || ''} 
                              onChange={e => setEditingTemplate({...editingTemplate, limits: {...editingTemplate.limits, headline2MaxChars: e.target.value ? parseInt(e.target.value) : undefined}})} 
                              className="w-full p-2 border rounded" 
                              placeholder="e.g. 10" />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold mb-1">Subheadline Max Alphabets/Chars</label>
                       <input type="number" 
                              value={editingTemplate.limits?.subheadlineMaxChars || ''} 
                              onChange={e => setEditingTemplate({...editingTemplate, limits: {...editingTemplate.limits, subheadlineMaxChars: e.target.value ? parseInt(e.target.value) : undefined}})} 
                              className="w-full p-2 border rounded" 
                              placeholder="e.g. 20" />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold mb-1">Summary Max Chars</label>
                       <input type="number" 
                              value={editingTemplate.limits?.summaryMaxChars || ''} 
                              onChange={e => setEditingTemplate({...editingTemplate, limits: {...editingTemplate.limits, summaryMaxChars: e.target.value ? parseInt(e.target.value) : undefined}})} 
                              className="w-full p-2 border rounded" 
                              placeholder="e.g. 150" />
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-gray-50 p-4 border rounded-lg">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">Visual Layout Editor</h3>
                  {articles.length > 0 && (
                     <button
                        onClick={handleGeneratePreview}
                        disabled={isGeneratingPreview}
                        className="px-3 py-1.5 flex items-center gap-2 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 rounded-lg"
                     >
                        {isGeneratingPreview ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />}
                        {isGeneratingPreview ? 'Generating...' : 'Live Preview AI Text'}
                     </button>
                  )}
               </div>
               <ViralTemplateEditor template={editingTemplate} onChange={setEditingTemplate} previewData={previewData} previewNewsImage={previewNewsImage} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
               No viral templates created yet. Click "Add Template".
            </div>
          ) : (
            templates.map((tmpl: ViralTemplate) => (
              <div key={tmpl.id} className={`border rounded-lg overflow-hidden flex flex-col transition-shadow hover:shadow-md ${!tmpl.isActive ? 'opacity-60 saturate-50' : ''}`}>
                 <div className="aspect-[4/5] bg-gray-900 relative">
                   {tmpl.referenceImageUrl ? (
                     <img src={tmpl.referenceImageUrl} alt={tmpl.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                   )}
                   {!tmpl.isActive && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold">
                        INACTIVE
                      </div>
                   )}
                 </div>
                 <div className="p-4 bg-white flex flex-col flex-1">
                   <h3 className="font-bold text-lg mb-1">{tmpl.name}</h3>
                   <div className="flex gap-2 text-xs text-gray-500 mb-4 flex-wrap">
                     {tmpl.coordinates?.headline_box && tmpl.coordinates.headline_box !== 'hidden' && <span className="bg-gray-100 px-2 py-1 rounded">Headline</span>}
                     {tmpl.coordinates?.subheadline_box && tmpl.coordinates.subheadline_box !== 'hidden' && <span className="bg-gray-100 px-2 py-1 rounded">Subhead</span>}
                     {tmpl.coordinates?.breaking_tag_box && tmpl.coordinates.breaking_tag_box !== 'hidden' && <span className="bg-gray-100 px-2 py-1 rounded">Tag</span>}
                   </div>
                   
                   <div className="mt-auto flex justify-between pt-3 border-t">
                     <button
                        onClick={() => handleToggleActive(tmpl.id, tmpl.isActive)}
                        className="text-gray-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                     >
                       {tmpl.isActive ? <EyeOff size={16}/> : <Eye size={16}/>}
                       {tmpl.isActive ? 'Deactivate' : 'Activate'}
                     </button>
                     
                     <div className="flex gap-2">
                       <button onClick={() => handleEdit(tmpl)} className="text-gray-500 hover:text-blue-600 p-1">
                         <Edit2 size={16} />
                       </button>
                       <button onClick={() => handleDelete(tmpl.id)} className="text-gray-500 hover:text-red-600 p-1">
                         <Trash2 size={16} />
                       </button>
                     </div>
                   </div>
                 </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ViralTemplatesAdmin;
