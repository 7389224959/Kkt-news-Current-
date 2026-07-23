import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Zap, X, Image as ImageIcon, Video, Upload, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { Article } from '../types';
import { generateFullReelScript, generateReelAudio, generateAiImage, findVisualsForScript, planScenesForScript, findShotsForScene } from '../services/geminiService';
import { pcmBase64ToWavUrl, pcmBase64ToWavDataUri } from '../src/utils/audioUtils';
import { uploadImage } from '../services/supabase';
import { saveSiteSettings } from '../services/articleService';

export default function ReelWizard({ articles, settings, onClose, autoStart = false }: { articles: Article[], settings: any, onClose: () => void, autoStart?: boolean }) {
  const [step, setStep] = useState(1);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('latest');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [scriptData, setScriptData] = useState<any>({ fullScript: '', headline: '', ticker: '', voiceoverScript: '', subtitles: [] });
  
  const [showHeadline, setShowHeadline] = useState(true);
  const [showTicker, setShowTicker] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  const [visualMode, setVisualMode] = useState<'template'|'post'|'upload'|'ai'|'scenes'>('template');
  const [customMediaUrl, setCustomMediaUrl] = useState<string>('');
  
  const [overlayMode, setOverlayMode] = useState<'none'|'post'|'upload'|'ai'>('post');
  const [overlayMediaUrl, setOverlayMediaUrl] = useState<string>('');

  const [audioUrl, setAudioUrl] = useState('');
  const [audioDataUri, setAudioDataUri] = useState('');
  const [videoBase64, setVideoBase64] = useState('');
  
  const [customCoords, setCustomCoords] = useState({ headline: '', ticker: '', subtitle: '', video: '' });
  const [publishPlatforms, setPublishPlatforms] = useState({ facebook: true, instagram: autoStart ? true : false, youtube: false });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState('');
  const [scenes, setScenes] = useState<any[]>([]);
  const [plannedScenes, setPlannedScenes] = useState<any[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);

  const activeTemplates = settings?.reelTemplates?.filter((t: any) => t.isActive) || [];

  useEffect(() => {
    if (articles.length > 0 && selectedArticleId === 'latest') {
      setSelectedArticle(articles[0]);
    } else if (articles.length > 0) {
      setSelectedArticle(articles.find(a => a.id === selectedArticleId) || null);
    }
  }, [selectedArticleId, articles]);

  useEffect(() => {
    if (activeTemplates.length > 0 && !selectedTemplateId) {
      const first = activeTemplates[0];
      setSelectedTemplateId(first.id);
      setCustomCoords({
        headline: first.coordinates?.headline_box || '',
        ticker: first.coordinates?.ticker_box || '',
        subtitle: first.coordinates?.subtitle_box || '',
        video: first.coordinates?.video_box || ''
      });
      setShowHeadline(first.coordinates?.headline_box && first.coordinates.headline_box !== 'hidden');
      setShowTicker(first.coordinates?.ticker_box && first.coordinates.ticker_box !== 'hidden');
      setShowSubtitles(first.coordinates?.subtitle_box && first.coordinates.subtitle_box !== 'hidden');
    }
  }, [activeTemplates, selectedTemplateId]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const t = activeTemplates.find((temp: any) => temp.id === id);
    if (t) {
      setCustomCoords({
        headline: t.coordinates?.headline_box || '',
        ticker: t.coordinates?.ticker_box || '',
        subtitle: t.coordinates?.subtitle_box || '',
        video: t.coordinates?.video_box || ''
      });
      setShowHeadline(t.coordinates?.headline_box && t.coordinates.headline_box !== 'hidden');
      setShowTicker(t.coordinates?.ticker_box && t.coordinates.ticker_box !== 'hidden');
      setShowSubtitles(t.coordinates?.subtitle_box && t.coordinates.subtitle_box !== 'hidden');
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedArticle) return alert('Select an article');
    if (!selectedTemplateId) return alert('Select a template');
    
    setIsGenerating(true);
    setStatus('Generating script and element text...');
    try {
      const template = activeTemplates.find((t: any) => t.id === selectedTemplateId);
      const articleContent = `${selectedArticle.title}\n\n${selectedArticle.content}`;

      const modifiedTemplate = JSON.parse(JSON.stringify(template));
      if (!showHeadline) modifiedTemplate.coordinates.headline_box = 'hidden';
      if (!showTicker) modifiedTemplate.coordinates.ticker_box = 'hidden';
      if (!showSubtitles) modifiedTemplate.coordinates.subtitle_box = 'hidden';
      
      // Call the helper to fetch
      const result = await generateFullReelScript(articleContent, modifiedTemplate);
      
      setScriptData({
        ...result,
        headline: showHeadline ? result.headline : '',
        ticker: showTicker ? result.ticker : '',
        subtitles: showSubtitles ? result.subtitles : [],
        fullScript: result.voiceoverScript
      });
      setStep(2);
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const doPublishReel = async (blob: Blob, message: string) => {
    setIsPublishing(true);
    setStatus('Preparing video upload...');
    try {
      let finalVideoUrl = '';
      let payloadVideo = '';
      
      try {
         setStatus('Uploading video to storage (bypassing limits)...');
         const fileToUpload = new File([blob], `reel-${Date.now()}.mp4`, { type: 'video/mp4' });
         finalVideoUrl = await uploadImage(fileToUpload);
         setStatus('Video uploaded, ready to publish...');
      } catch (uploadErr: any) {
         console.warn('Storage upload failed, falling back to direct base64 transfer...', uploadErr);
         const rawBase64 = await new Promise<string>((res, rej) => { 
            const reader = new FileReader(); 
            reader.onloadend = () => res(reader.result as string); 
            reader.onerror = rej; 
            reader.readAsDataURL(blob); 
         });
         payloadVideo = rawBase64;
      }

      let successCount = 0;
      let errorMsgs = [];

      if (publishPlatforms.facebook) {
        try {
          setStatus('Publishing to Facebook...');
          const res = await fetch('/api/facebook/post-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               message, 
               videoUrl: finalVideoUrl || undefined,
               videoBase64: finalVideoUrl ? undefined : payloadVideo
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          successCount++;
        } catch(e: any) {
          errorMsgs.push('Facebook: ' + e.message);
        }
      }

      if (publishPlatforms.instagram) {
        try {
          setStatus('Publishing to Instagram...');
          const res = await fetch('/api/instagram/post-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               message, 
               videoUrl: finalVideoUrl || undefined,
               videoBase64: finalVideoUrl ? undefined : payloadVideo
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          successCount++;
        } catch(e: any) {
          errorMsgs.push('Instagram: ' + e.message);
        }
      }

      if (publishPlatforms.youtube) {
        try {
          setStatus('Publishing to YouTube Shorts...');
          const res = await fetch('/api/youtube/post-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               title: scriptData?.headline || selectedArticle?.title || 'New Short',
               description: message, 
               videoUrl: finalVideoUrl || undefined,
               videoBase64: finalVideoUrl ? undefined : payloadVideo
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          successCount++;
        } catch(e: any) {
          errorMsgs.push('YouTube: ' + e.message);
        }
      }
      
      if (errorMsgs.length > 0) {
        alert('Some publishes failed:\n' + errorMsgs.join('\n'));
      } else if (successCount > 0) {
        alert('Successfully published to selected platforms!');
      } else {
        alert('No platforms selected for publishing. Please select at least one.');
      }
      
      if (autoStart && successCount > 0 && errorMsgs.length === 0) {
        onClose(); // Automatically close wizard on success if autoStart is true
      }
    } catch (e: any) {
      alert('Error publishing reel: ' + e.message);
    } finally {
      setIsPublishing(false);
      setStatus('');
    }
  };

  const handleAutoAllSteps = async (article: Article, templateId: string) => {
    setIsGenerating(true);
    try {
      setStatus('Step 1/3: Generating full script & text...');
      const template = activeTemplates.find((t: any) => t.id === templateId) || activeTemplates[0];
      const articleContent = `${article.title}\n\n${article.content}`;
      
      const modifiedTemplate = JSON.parse(JSON.stringify(template));
      if (!showHeadline) modifiedTemplate.coordinates.headline_box = 'hidden';
      if (!showTicker) modifiedTemplate.coordinates.ticker_box = 'hidden';
      if (!showSubtitles) modifiedTemplate.coordinates.subtitle_box = 'hidden';

      const result = await generateFullReelScript(articleContent, modifiedTemplate);
      const updatedScriptData = {
        ...result,
        headline: showHeadline ? result.headline : '',
        ticker: showTicker ? result.ticker : '',
        subtitles: showSubtitles ? result.subtitles : [],
        fullScript: result.voiceoverScript
      };
      setScriptData(updatedScriptData);

      setStatus('Step 2/3: Generating voiceover...');
      const base64Audio = await generateReelAudio(updatedScriptData.fullScript || updatedScriptData.voiceoverScript);
      const newAudioUrl = pcmBase64ToWavUrl(base64Audio);
      const newAudioDataUri = pcmBase64ToWavDataUri(base64Audio);
      setAudioUrl(newAudioUrl);
      setAudioDataUri(newAudioDataUri);

      setStatus('Step 3/3: Rendering Final FFMPEG Video...');
      setVisualMode('template');
      setOverlayMode('post');

      let finalMediaUrl = template.mediaUrl || template.screenshotUrl;
      
      let finalOverlayUrl = article.image; // Default overlay from post

      // Gather visual materials just in case
      let initialVisuals = [];
      if (article.videoUrl) initialVisuals.push(article.videoUrl);
      if (finalOverlayUrl && finalOverlayUrl !== article.videoUrl) initialVisuals.push(finalOverlayUrl);
      if ((article as any).additionalImages && Array.isArray((article as any).additionalImages)) {
         initialVisuals.push(...(article as any).additionalImages);
      } else {
         const contentStr = article.content || '';
         const match = contentStr.match(/<!-- (?:KKT_META:\s*\{.*?"additionalImages"\s*:\s*(\[.*?\]).*?\}|additionalImages:\s*(\[.*?\]))\s*-->/s);
         if (match) {
            try {
               const parsedArray = JSON.parse(match[1] || match[2]);
               if (Array.isArray(parsedArray)) initialVisuals.push(...parsedArray);
            } catch(e) {}
         }
      }
      const uniqueVisuals = Array.from(new Set(initialVisuals.filter(Boolean)));
      
      const renderRes = await fetch('/api/render-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: newAudioDataUri,
          templateMediaUrl: finalMediaUrl,
          overlayMediaUrl: finalOverlayUrl,
          visuals: uniqueVisuals,
          scriptData: updatedScriptData,
          template: modifiedTemplate,
          styleOverrides: {}
        })
      });

      if (!renderRes.ok) throw new Error(await renderRes.text());
      const blob = await renderRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVideoBase64(objectUrl);
      
      if (autoStart) {
         setStatus('Step 4/4: Publishing to Social Media...');
         let hashtagsStr = '';
         if (article && article.tags && article.tags.length > 0) {
            const selectedTags = article.tags.slice(0, 2);
            hashtagsStr = '\n\n' + selectedTags.map((t: string) => '#' + t.replace(/\\s+/g, '')).join(' ') + ' #kktnews';
         } else {
            hashtagsStr = '\n\n#kktnews';
         }
         const fbMessage = updatedScriptData.facebookCaption || ((updatedScriptData.headline || article.title || 'Check out our latest reel!') + hashtagsStr);
         await doPublishReel(blob, fbMessage);
      } else {
         setStep(4);
      }
    } catch(e: any) {
      console.error(e);
      alert('1-Click Auto failed: ' + e.message);
      setStep(1);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const autoStarted = React.useRef(false);
  useEffect(() => {
    if (autoStart && articles.length > 0 && activeTemplates.length > 0 && !autoStarted.current) {
       autoStarted.current = true;
       let articleToUse = selectedArticle || articles[0];
       
       let templateToUse = activeTemplates[0];
       let oldestTime = templateToUse.lastUsedTimestamp || 0;
       
       for (const t of activeTemplates) {
         const tTime = t.lastUsedTimestamp || 0;
         if (tTime < oldestTime) {
           oldestTime = tTime;
           templateToUse = t;
         }
       }
       
       const templateIdToUse = templateToUse.id;
       
       if (settings && settings.reelTemplates) {
         const updatedReelTemplates = settings.reelTemplates.map((t: any) => 
           t.id === templateIdToUse ? { ...t, lastUsedTimestamp: Date.now() } : t
         );
         const updatedSettings = { ...settings, reelTemplates: updatedReelTemplates };
         saveSiteSettings(updatedSettings).catch(e => console.error("Failed to save reel template usage", e));
       }
       
       handleAutoAllSteps(articleToUse, templateIdToUse);
    }
  }, [autoStart, articles, activeTemplates, selectedArticle, settings]);

  const handleGenerateVoice = async () => {
    setIsGenerating(true);
    setStatus('Generating professional female voiceover...');
    try {
      const base64Audio = await generateReelAudio(scriptData.fullScript || scriptData.voiceoverScript);
      setAudioUrl(pcmBase64ToWavUrl(base64Audio));
      setAudioDataUri(pcmBase64ToWavDataUri(base64Audio));
      setStep(3);
    } catch (e: any) {
      console.error(e);
      alert('Voice error: ' + e.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const handleGenerateVisualAI = async () => {
    setIsGenerating(true);
    setStatus('Generating AI visual...');
    try {
      const prompt = selectedArticle?.title || "Indian news";
      const base64 = await generateAiImage(prompt);
      setCustomMediaUrl(`data:image/jpeg;base64,${base64}`);
    } catch(e) {
      console.error(e);
      alert("AI Image generation failed.");
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  }

  const handleGenerateOverlayAI = async () => {
    setIsGenerating(true);
    setStatus('Generating AI overlay visual...');
    try {
      const prompt = selectedArticle?.title || "Indian news";
      const base64 = await generateAiImage(prompt);
      setOverlayMediaUrl(`data:image/jpeg;base64,${base64}`);
    } catch(e) {
      console.error(e);
      alert("AI Image generation failed.");
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  }

  const handlePlanScenes = async () => {
    setIsGenerating(true);
    setStatus('Auto Finding Visuals... (Splitting script, classifying, and searching images)');
    try {
      const data = await findVisualsForScript(scriptData.fullScript || scriptData.voiceoverScript);
      setPlannedScenes(data.scenes || []);
      setScenes(data.scenes || []); // Automatically populate all shots
      setCurrentSceneIndex((data.scenes || []).length);
    } catch(e: any) {
      console.error(e);
      alert('Error finding visuals: ' + e.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const handleGenerateShotsForScene = async (sceneIndex: number) => {
    const scene = plannedScenes[sceneIndex];
    if (!scene) return;
    
    setIsGenerating(true);
    setStatus(`Directing Scene ${sceneIndex + 1} and planning fast-paced shots...`);
    try {
      const shots = await findShotsForScene(scene.voiceover_text, scene.purpose);
      
      const newFormattedShots = shots.map((shot: any) => ({
        scene_number: scenes.length + shot.shot_id, // Global shot index roughly
        scene_group_id: scene.scene_id || `group_${sceneIndex}`,
        shot_id_in_scene: shot.shot_id,
        voiceover_text: scene.voiceover_text,
        purpose: shot.purpose || scene.purpose,
        information_added: shot.information_added,
        visual_requirements: shot.visual_requirements,
        visual_hierarchy: shot.visual_hierarchy,
        search_queries: shot.search_queries,
        selected_visual: shot.selected_visual,
        relevance_score: shot.relevance_score,
        source: shot.source,
        motion: shot.motion,
        transition: shot.transition,
        text_animation: shot.text_animation,
        graphics: shot.graphics,
        sfx: shot.sfx,
        ffmpeg_instructions: shot.ffmpeg_instructions
      }));
      
      setScenes(prev => [...prev, ...newFormattedShots]);
      setCurrentSceneIndex(sceneIndex + 1);
    } catch(e: any) {
      console.error(e);
      alert(`Error generating shots for scene ${sceneIndex + 1}: ` + e.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const generateHTMLPreview = () => {
    setStep(4);
  };

  const handleRender = async (styleOverrides: any = {}) => {
    setIsGenerating(true);
    setStatus('Rendering Final Video (FFmpeg processing)...');
    try {
      const template = activeTemplates.find((t: any) => t.id === selectedTemplateId);
      
      let finalMediaUrl = template.mediaUrl || template.screenshotUrl;
      if (visualMode === 'post') {
         if (selectedArticle?.videoUrl) finalMediaUrl = selectedArticle.videoUrl;
         else if (selectedArticle?.image) finalMediaUrl = selectedArticle.image;
      } else if (visualMode === 'upload' || visualMode === 'ai') {
         if (!customMediaUrl) throw new Error("No custom media provided");
         finalMediaUrl = customMediaUrl;
      }

      let finalOverlayUrl: string | null = null;
      if (visualMode === 'template' && overlayMode !== 'none') {
         if (overlayMode === 'post') {
            if (selectedArticle?.videoUrl) finalOverlayUrl = selectedArticle.videoUrl;
            else if (selectedArticle?.image) finalOverlayUrl = selectedArticle.image;
         } else if ((overlayMode === 'upload' || overlayMode === 'ai') && overlayMediaUrl) {
            finalOverlayUrl = overlayMediaUrl;
         }
      }

      // Hide elements if requested by zeroing them in a cloned template
      const renderTemplate = JSON.parse(JSON.stringify(template));
      if (!showHeadline) renderTemplate.coordinates.headline_box = "hidden";
      else if (customCoords.headline) renderTemplate.coordinates.headline_box = customCoords.headline;
      
      if (!showTicker) renderTemplate.coordinates.ticker_box = "hidden";
      else if (customCoords.ticker) renderTemplate.coordinates.ticker_box = customCoords.ticker;
      
      if (!showSubtitles) renderTemplate.coordinates.subtitle_box = "hidden";
      else if (customCoords.subtitle) renderTemplate.coordinates.subtitle_box = customCoords.subtitle;

      if (customCoords.video) renderTemplate.coordinates.video_box = customCoords.video;

      let initialVisuals = [];
      if (visualMode === 'scenes' && scenes.length > 0) {
         scenes.forEach((s: any) => {
            if (s.selected_visual) initialVisuals.push(s.selected_visual);
         });
      } else {
         if (selectedArticle?.videoUrl) initialVisuals.push(selectedArticle.videoUrl);
         if (finalOverlayUrl && finalOverlayUrl !== selectedArticle?.videoUrl) initialVisuals.push(finalOverlayUrl);
         if (selectedArticle?.image) initialVisuals.push(selectedArticle.image);
         
         if ((selectedArticle as any)?.additionalImages && Array.isArray((selectedArticle as any).additionalImages)) {
            initialVisuals.push(...(selectedArticle as any).additionalImages);
         } else {
            const contentStr = selectedArticle?.content || '';
            const match = contentStr.match(/<!-- (?:KKT_META:\s*\{.*?"additionalImages"\s*:\s*(\[.*?\]).*?\}|additionalImages:\s*(\[.*?\]))\s*-->/s);
            if (match) {
               try {
                  const parsedArray = JSON.parse(match[1] || match[2]);
                  if (Array.isArray(parsedArray)) {
                     initialVisuals.push(...parsedArray);
                  }
               } catch(e) {}
            }
         }
      }
      
      const uniqueVisuals = Array.from(new Set(initialVisuals.filter(Boolean)));

      const renderRes = await fetch('/api/render-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioDataUri,
          templateMediaUrl: finalMediaUrl,
          overlayMediaUrl: finalOverlayUrl,
          visuals: uniqueVisuals,
          scriptData: scriptData,
          template: renderTemplate,
          styleOverrides: styleOverrides,
          directorScenes: scenes
        })
      });

      if (!renderRes.ok) throw new Error(await renderRes.text());
      const blob = await renderRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVideoBase64(objectUrl);
    } catch(e: any) {
      console.error(e);
      alert('Render error: ' + e.message);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const groupedScenes = useMemo(() => {
    const groups: any[] = [];
    const map = new Map();
    scenes.forEach((shot: any, index: number) => {
      const groupId = shot.scene_group_id || `group_${index}`;
      if (!map.has(groupId)) {
        const newGroup = {
          id: groupId,
          voiceover_text: shot.voiceover_text,
          purpose: shot.purpose,
          shots: []
        };
        map.set(groupId, newGroup);
        groups.push(newGroup);
      }
      map.get(groupId).shots.push({ ...shot, originalIndex: index });
    });
    return groups;
  }, [scenes]);

  if (activeTemplates.length === 0) {
    return <div className="p-6 bg-white rounded-lg"><h2 className="text-xl font-bold">No Active Templates</h2><p>Please create and activate a template in the Templates tab.</p><button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button></div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-pink-100 w-full max-w-4xl mx-auto my-4 relative max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-black">
        <X size={24} />
      </button>

      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6 text-pink-700">
        <Video className="text-pink-600" /> Advanced Reel Creator
      </h2>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 text-sm font-medium text-gray-500 overflow-x-auto">
        <span className={step >= 1 ? 'text-pink-600' : ''}>1. Setup</span> <ChevronRight size={16}/>
        <span className={step >= 2 ? 'text-pink-600' : ''}>2. Script & Text</span> <ChevronRight size={16}/>
        <span className={step >= 3 ? 'text-pink-600' : ''}>3. Visuals & Audio</span> <ChevronRight size={16}/>
        <span className={step >= 4 ? 'text-pink-600' : ''}>4. Preview & Render</span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Select Post</label>
            <select 
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="latest">Latest Published Post</option>
              {articles.slice(0,10).map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1">Select Template</label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activeTemplates.map((t: any) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleTemplateChange(t.id)}
                    className={`cursor-pointer border-2 rounded-lg p-2 text-center aspect-[9/16] bg-slate-100 relative ${selectedTemplateId === t.id ? 'border-pink-500 shadow-md ring-2 ring-pink-200' : 'border-transparent'}`}
                  >
                     <p className="text-xs font-bold absolute bottom-2 left-0 w-full bg-white/80">{t.name}</p>
                     {t.screenshotUrl && <img src={t.screenshotUrl} className="w-full h-full object-cover rounded" />}
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded border">
            <h4 className="font-medium mb-2">Element Visibility</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showHeadline} onChange={(e)=>setShowHeadline(e.target.checked)} /> Headline</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showTicker} onChange={(e)=>setShowTicker(e.target.checked)} /> Ticker</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showSubtitles} onChange={(e)=>setShowSubtitles(e.target.checked)} /> Subtitles</label>
            </div>
            <p className="text-xs text-gray-500 mt-2">AI will only generate text for visible elements.</p>
          </div>

          <button onClick={handleGenerateScript} disabled={isGenerating} className="btn-primary w-full py-3 flex gap-2 items-center justify-center bg-gray-900 text-white rounded">
             {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18} />} Generate Script & Element Text
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="font-medium text-sm">Voiceover Script (Hindi/Hinglish)</label>
            <textarea 
              rows={6}
              value={scriptData.fullScript || ''}
              onChange={(e) => setScriptData({...scriptData, fullScript: e.target.value})}
              className="w-full border rounded p-2"
            />
          </div>
          
          {showHeadline && (
            <div>
              <label className="font-medium text-sm">Headline Text (Top box)</label>
              <input 
                type="text"
                value={scriptData.headline || ''}
                onChange={(e) => setScriptData({...scriptData, headline: e.target.value})}
                className="w-full border rounded p-2"
              />
            </div>
          )}

          {showTicker && (
            <div>
              <label className="font-medium text-sm">Ticker Text (Bottom sliding)</label>
              <input 
                type="text"
                value={scriptData.ticker || ''}
                onChange={(e) => setScriptData({...scriptData, ticker: e.target.value})}
                className="w-full border rounded p-2"
              />
            </div>
          )}

          <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Back</button>
             <button onClick={() => { setAudioUrl(''); setAudioDataUri(''); setStep(3); }} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 font-bold">Skip Voiceover</button>
             <button onClick={handleGenerateVoice} disabled={isGenerating} className="flex-1 bg-gray-900 text-white rounded py-2 flex items-center justify-center gap-2">
               {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : null} Generate Voiceover
             </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
           {audioUrl && (
             <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2 text-green-800"><Zap size={16}/> Voiceover Ready!</h4>
                <audio src={audioUrl} controls className="w-full h-8" />
             </div>
           )}

           <div>
              <h4 className="font-medium mb-2">Select Visual Source</h4>
              <div className="flex flex-wrap gap-4 mb-4">
                 <button onClick={()=>setVisualMode('template')} className={`px-4 py-2 rounded border ${visualMode === 'template' ? 'bg-pink-50 border-pink-500' : 'bg-gray-50'}`}>Default Template</button>
                 <button onClick={()=>setVisualMode('post')} className={`px-4 py-2 rounded border ${visualMode === 'post' ? 'bg-pink-50 border-pink-500' : 'bg-gray-50'}`}>From Post</button>
                 <button onClick={()=>setVisualMode('upload')} className={`px-4 py-2 rounded border ${visualMode === 'upload' ? 'bg-pink-50 border-pink-500' : 'bg-gray-50'}`}>Upload custom</button>
                 <button onClick={()=>setVisualMode('ai')} className={`px-4 py-2 rounded border ${visualMode === 'ai' ? 'bg-pink-50 border-pink-500' : 'bg-gray-50'}`}>Generate AI</button>
                 <button onClick={()=>setVisualMode('scenes')} className={`px-4 py-2 rounded border ${visualMode === 'scenes' ? 'bg-pink-50 border-pink-500 font-bold' : 'bg-gray-50'}`}>Auto Find Visuals</button>
              </div>

              {visualMode === 'scenes' && (
                <div className="p-4 border rounded">
                  {plannedScenes.length === 0 ? (
                    <button onClick={handlePlanScenes} disabled={isGenerating} className="px-4 py-3 bg-pink-100 border-pink-300 text-pink-800 font-bold rounded flex gap-2 items-center text-sm w-full justify-center hover:bg-pink-200">
                      {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18} />} Auto Find All Visuals
                    </button>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <h5 className="font-bold">Scene Planning ({currentSceneIndex} of {plannedScenes.length} Completed)</h5>
                        <button onClick={() => { setPlannedScenes([]); setScenes([]); setCurrentSceneIndex(0); }} className="text-xs text-red-600 hover:text-red-800 border border-red-200 px-2 py-1 rounded">Reset All</button>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto pr-2 space-y-6">
                        {plannedScenes.map((scene, sceneIdx) => {
                          if (sceneIdx > currentSceneIndex) return null; // Don't show future scenes yet
                          
                          // Find shots for this scene in 'scenes' array
                          const shotsForThisScene = groupedScenes.find((g: any) => g.id === scene.scene_id || g.voiceover_text === scene.voiceover_text)?.shots || [];
                          
                          return (
                            <div key={sceneIdx} className={`bg-white border ${sceneIdx === currentSceneIndex ? 'border-indigo-400 ring-1 ring-indigo-400 shadow-md' : 'border-gray-200 shadow-sm'} rounded-lg p-4`}>
                               <div className="flex items-center justify-between mb-2 border-b pb-2">
                                 <div className="flex items-center gap-2">
                                   <div className={`font-bold text-sm px-2 py-0.5 rounded ${sceneIdx === currentSceneIndex ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}>Scene {sceneIdx + 1}</div>
                                   <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{scene.purpose}</span>
                                 </div>
                                 {sceneIdx < currentSceneIndex && <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">✓ Completed</div>}
                               </div>
                               <p className="text-sm text-gray-800 italic border-l-2 border-indigo-400 pl-3 mb-4 bg-indigo-50/30 p-2 rounded-r">"{scene.voiceover_text}"</p>
                               
                               {shotsForThisScene.length === 0 ? (
                                 <button onClick={() => handleGenerateShotsForScene(sceneIdx)} disabled={isGenerating} className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded border border-indigo-300 hover:bg-indigo-100 flex items-center justify-center gap-2 text-sm shadow-sm transition-all">
                                   {isGenerating && sceneIdx === currentSceneIndex ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>} 
                                   Step 2: Direct Scene & Plan Fast-Paced Shots
                                 </button>
                               ) : (
                                 <div className="space-y-4">
                                   {shotsForThisScene.map((shot: any, shotLocalIdx: number) => {
                                     const idx = shot.originalIndex;
                                     return (
                                       <div key={idx} className="border border-gray-100 rounded bg-gray-50 p-3">
                                          <div className="flex justify-between items-start mb-2">
                                             <div className="flex items-center gap-2">
                                                <div className="font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded inline-block">Shot {shot.scene_number}</div>
                                                {shot.purpose && <div className="text-[10px] font-semibold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">{shot.purpose}</div>}
                                             </div>
                                             {shot.relevance_score !== undefined && (
                                               <div className={`text-[10px] px-1.5 py-0.5 border rounded font-semibold ${(shot.relevance_score || 0) >= 75 ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>Score: {shot.relevance_score}/100</div>
                                             )}
                                          </div>
                                          {shot.information_added && (
                                            <div className="text-xs text-gray-700 italic bg-white p-2 rounded border border-gray-200 mb-3 shadow-sm border-l-2 border-l-blue-400">
                                              Info Added: {shot.information_added}
                                            </div>
                                          )}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Visual Asset Planner */}
                                            <div className="bg-white p-3 rounded border border-gray-100">
                                               <h6 className="font-semibold text-xs text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1"><ImageIcon size={12}/> Visual Asset</h6>
                                               {shot.search_queries && shot.search_queries.length > 0 ? (
                                                 <div className="mb-2">
                                                   <div className="text-[10px] text-gray-500 font-bold mb-1">SEARCH QUERIES:</div>
                                                   <div className="flex flex-wrap gap-1">
                                                     {shot.search_queries.map((q: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 border border-blue-200 rounded">{q}</span>
                                                     ))}
                                                   </div>
                                                 </div>
                                               ) : (
                                                 shot.visual_requirements && shot.visual_requirements.map((req: string, i: number) => (
                                                   <p key={i} className="text-[10px] text-gray-600 mb-2 whitespace-normal break-words font-medium">{req}</p>
                                                 ))
                                               )}
                                               <div className="flex gap-2 mt-2">
                                                 {shot.selected_visual ? 
                                                   <img src={shot.selected_visual} className="w-16 h-16 object-cover rounded shadow-sm border border-gray-300" />
                                                 :
                                                   <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-[10px] text-center border border-gray-300 p-1 text-gray-500 leading-tight">No Target<br/>Visual</div>
                                                 }
                                                 <div className="flex-1">
                                                    <label className="block text-[10px] font-bold text-gray-700 mb-1">SET VISUAL URL (IMAGE/VIDEO):</label>
                                                    <input type="text" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-indigo-500 mb-1" placeholder="Paste URL..." value={shot.selected_visual || ''} onChange={(e) => {
                                                       const newScenes = [...scenes];
                                                       newScenes[idx].selected_visual = e.target.value;
                                                       setScenes(newScenes);
                                                    }} />
                                                    <div className="flex items-center gap-2">
                                                       <span className="text-[10px] text-gray-500">Or upload:</span>
                                                       <input type="file" accept="image/*,video/mp4" className="text-[10px] w-full" onChange={(e) => {
                                                          const file = e.target.files?.[0];
                                                          if (!file) return;
                                                          const reader = new FileReader();
                                                          reader.onloadend = () => {
                                                             const newScenes = [...scenes];
                                                             newScenes[idx].selected_visual = reader.result as string;
                                                             setScenes(newScenes);
                                                          };
                                                          reader.readAsDataURL(file);
                                                       }} />
                                                    </div>
                                                    {shot.motion && <div className="text-[10px] mt-1 text-indigo-600 font-medium">Motion: {shot.motion}</div>}
                                                 </div>
                                               </div>
                                            </div>
                                            
                                            {/* Elements Asset Planner */}
                                            <div className="bg-white p-3 rounded border border-gray-100 space-y-3">
                                               <div>
                                                 <h6 className="font-semibold text-[10px] text-gray-700 uppercase tracking-wider mb-1">Text & Animations</h6>
                                                 {shot.text_animation ? (
                                                   <div className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 inline-block mb-2">Animation: {shot.text_animation}</div>
                                                 ) : <div className="text-[10px] text-gray-400 mb-2">No text animation</div>}
                                               </div>
                                               <div>
                                                 <h6 className="font-semibold text-[10px] text-gray-700 uppercase tracking-wider mb-1">Graphics & Overlays</h6>
                                                 {shot.graphics && shot.graphics.length > 0 ? (
                                                   <div className="flex flex-wrap gap-1 mb-1">
                                                     {shot.graphics.map((g: string, i: number) => (
                                                       <span key={i} className="text-[10px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded border border-pink-200">{g}</span>
                                                     ))}
                                                   </div>
                                                 ) : <div className="text-[10px] text-gray-400 mb-1">No graphics requested</div>}
                                                 <input type="text" className="w-full px-2 py-1 border border-gray-300 rounded text-[10px] bg-white mb-1" placeholder="Custom graphic URL (optional)..." value={shot.custom_graphic || ''} onChange={(e) => {
                                                    const newScenes = [...scenes];
                                                    newScenes[idx].custom_graphic = e.target.value;
                                                    setScenes(newScenes);
                                                 }} />
                                                 <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500">Upload:</span>
                                                    <input type="file" accept="image/*,video/webm" className="text-[10px] w-full" onChange={(e) => {
                                                       const file = e.target.files?.[0];
                                                       if (!file) return;
                                                       const reader = new FileReader();
                                                       reader.onloadend = () => {
                                                          const newScenes = [...scenes];
                                                          newScenes[idx].custom_graphic = reader.result as string;
                                                          setScenes(newScenes);
                                                       };
                                                       reader.readAsDataURL(file);
                                                    }} />
                                                 </div>
                                               </div>
                                               
                                               <div>
                                                 <h6 className="font-semibold text-[10px] text-gray-700 uppercase tracking-wider mb-1">Sound Effects (SFX)</h6>
                                                 {shot.sfx && shot.sfx.length > 0 ? (
                                                   <div className="flex flex-wrap gap-1 mb-1">
                                                     {shot.sfx.map((s: string, i: number) => (
                                                       <span key={i} className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200">{s}</span>
                                                     ))}
                                                   </div>
                                                 ) : <div className="text-[10px] text-gray-400 mb-1">No SFX requested</div>}
                                                 <input type="text" className="w-full px-2 py-1 border border-gray-300 rounded text-[10px] bg-white mb-1" placeholder="Custom SFX URL (optional)..." value={shot.custom_sfx || ''} onChange={(e) => {
                                                    const newScenes = [...scenes];
                                                    newScenes[idx].custom_sfx = e.target.value;
                                                    setScenes(newScenes);
                                                 }} />
                                                 <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500">Upload:</span>
                                                    <input type="file" accept="audio/*" className="text-[10px] w-full" onChange={(e) => {
                                                       const file = e.target.files?.[0];
                                                       if (!file) return;
                                                       const reader = new FileReader();
                                                       reader.onloadend = () => {
                                                          const newScenes = [...scenes];
                                                          newScenes[idx].custom_sfx = reader.result as string;
                                                          setScenes(newScenes);
                                                       };
                                                       reader.readAsDataURL(file);
                                                    }} />
                                                 </div>
                                               </div>
                                            </div>
                                          </div>
                                       </div>
                                     );
                                   })}
                                   {sceneIdx === currentSceneIndex && sceneIdx < plannedScenes.length - 1 && (
                                      <button onClick={() => setCurrentSceneIndex(sceneIdx + 1)} className="mt-4 w-full py-2 bg-gray-800 text-white font-bold rounded flex gap-2 items-center justify-center hover:bg-gray-900 shadow">
                                        Confirm & Next Scene <ChevronRight size={18} />
                                      </button>
                                   )}
                                 </div>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {visualMode === 'post' && (
                <div className="p-4 border rounded">
                  {selectedArticle?.image ? (
                     <img src={selectedArticle.image} alt="post" className="max-h-40 rounded" />
                  ) : <p className="text-gray-500 text-sm">No image available in this post.</p>}
                </div>
              )}

              {visualMode === 'upload' && (
                <div className="p-4 border rounded">
                  <label className="block text-sm font-medium mb-1">Upload Media (Image or Video)</label>
                  <input type="file" accept="image/*,video/mp4" onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     const reader = new FileReader();
                     reader.onloadend = () => {
                        setCustomMediaUrl(reader.result as string);
                     };
                     reader.readAsDataURL(file);
                  }} className="mb-2 block w-full text-sm" />
                  <p className="text-xs text-gray-500 mb-2">Or enter an external URL to a media file:</p>
                  <input type="text" placeholder="Enter image/video URL" className="w-full p-2 border rounded" value={customMediaUrl} onChange={e => setCustomMediaUrl(e.target.value)} />
                  {customMediaUrl && (
                     <div className="mt-4 break-all text-xs text-green-700 bg-green-50 p-2 rounded">Media loaded. preview available in next step.</div>
                  )}
                </div>
              )}

              {visualMode === 'ai' && (
                <div className="p-4 border rounded">
                  <button onClick={handleGenerateVisualAI} disabled={isGenerating} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded flex gap-2 items-center">
                    {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <ImageIcon size={16} />} Generate AI Image
                  </button>
                  {customMediaUrl && <img src={customMediaUrl} alt="AI" className="max-h-40 mt-4 rounded border" />}
                </div>
              )}

              {visualMode === 'template' && (
                 <div className="mt-4 p-4 border rounded bg-pink-50/50">
                    <h4 className="font-medium mb-2">Picture-in-Picture Overlay (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-3">Add a news image or video inside the template's video frame.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                       <button onClick={()=>setOverlayMode('none')} className={`px-3 py-1.5 rounded border text-sm ${overlayMode === 'none' ? 'bg-pink-100 border-pink-500 font-medium' : 'bg-white'}`}>None</button>
                       <button onClick={()=>setOverlayMode('post')} className={`px-3 py-1.5 rounded border text-sm ${overlayMode === 'post' ? 'bg-pink-100 border-pink-500 font-medium' : 'bg-white'}`}>From Post</button>
                       <button onClick={()=>setOverlayMode('upload')} className={`px-3 py-1.5 rounded border text-sm ${overlayMode === 'upload' ? 'bg-pink-100 border-pink-500 font-medium' : 'bg-white'}`}>Upload Custom</button>
                       <button onClick={()=>setOverlayMode('ai')} className={`px-3 py-1.5 rounded border text-sm ${overlayMode === 'ai' ? 'bg-pink-100 border-pink-500 font-medium' : 'bg-white'}`}>Generate AI</button>
                    </div>

                    {overlayMode === 'post' && (
                      <div className="p-3 bg-white border rounded">
                        {selectedArticle?.image ? (
                           <img src={selectedArticle.image} alt="post overlay" className="max-h-32 rounded" />
                        ) : <p className="text-gray-500 text-sm">No image available in this post.</p>}
                      </div>
                    )}

                    {overlayMode === 'upload' && (
                      <div className="p-3 bg-white border rounded">
                        <input type="file" accept="image/*,video/mp4" onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           const reader = new FileReader();
                           reader.onloadend = () => {
                              setOverlayMediaUrl(reader.result as string);
                           };
                           reader.readAsDataURL(file);
                        }} className="mb-2 block w-full text-sm" />
                        {overlayMediaUrl && <div className="text-xs text-green-600">Overlay media loaded.</div>}
                      </div>
                    )}
                    
                    {overlayMode === 'ai' && (
                      <div className="p-3 bg-white border rounded">
                        <button onClick={handleGenerateOverlayAI} disabled={isGenerating} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded flex gap-2 items-center text-sm">
                          {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <ImageIcon size={16} />} Generate AI Overlay Image
                        </button>
                        {overlayMediaUrl && <img src={overlayMediaUrl} alt="AI Overlay" className="max-h-32 mt-3 rounded border" />}
                      </div>
                    )}
                 </div>
              )}
           </div>

           <div className="bg-gray-50 p-4 rounded border mt-4">
              <h4 className="font-medium mb-2">Adjust Element Positions (optional)</h4>
              <p className="text-xs text-gray-500 mb-2">Format: x,y or expressions like (w-tw)/2,h-th</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {showHeadline && (
                   <div>
                      <label className="text-xs font-bold">Headline Coords</label>
                      <input type="text" value={customCoords.headline} onChange={e => setCustomCoords({...customCoords, headline: e.target.value})} className="w-full p-1 border rounded text-sm" />
                   </div>
                )}
                {showTicker && (
                   <div>
                      <label className="text-xs font-bold">Ticker Coords</label>
                      <input type="text" value={customCoords.ticker} onChange={e => setCustomCoords({...customCoords, ticker: e.target.value})} className="w-full p-1 border rounded text-sm" />
                   </div>
                )}
                {showSubtitles && (
                   <div>
                      <label className="text-xs font-bold">Subtitle Coords</label>
                      <input type="text" value={customCoords.subtitle} onChange={e => setCustomCoords({...customCoords, subtitle: e.target.value})} className="w-full p-1 border rounded text-sm" />
                   </div>
                )}
              </div>
           </div>

           <div className="flex gap-4 pt-4">
             <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Back</button>
             <button onClick={generateHTMLPreview} disabled={isGenerating} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white rounded py-3 font-bold flex items-center justify-center gap-2">
               {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Video size={18}/>} Continue to Editor
             </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <ReelEditorView 
            isPublishing={isPublishing}
            doPublishReel={doPublishReel}
            onClose={onClose} 
            templateId={selectedTemplateId} 
            activeTemplates={activeTemplates}
            scriptData={scriptData} setScriptData={setScriptData}
            visualMode={visualMode} customMediaUrl={customMediaUrl}
            overlayMode={overlayMode} overlayMediaUrl={overlayMediaUrl}
            selectedArticle={selectedArticle} audioDataUri={audioDataUri}
            showHeadline={showHeadline} showTicker={showTicker} showSubtitles={showSubtitles}
            customCoords={customCoords} setCustomCoords={setCustomCoords}
            setStep={setStep} handleRender={handleRender}
            videoBase64={videoBase64} isGenerating={isGenerating} setStatus={setStatus}
            audioUrl={audioUrl}
            publishPlatforms={publishPlatforms} setPublishPlatforms={setPublishPlatforms}
        />
      )}

      {status && (
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg border">
            <div className="text-center p-6 bg-white shadow-xl rounded-xl border border-gray-100 max-w-sm">
               <RefreshCw className="animate-spin text-pink-500 mx-auto mb-4" size={32} />
               <p className="font-semibold text-lg text-gray-800">{status}</p>
            </div>
         </div>
      )}
    </div>
  )
}

function ReelEditorView({
  isPublishing, doPublishReel, onClose, templateId, activeTemplates, scriptData, setScriptData,
  visualMode, customMediaUrl, overlayMode, overlayMediaUrl, selectedArticle, showHeadline, showTicker, showSubtitles,
  customCoords, setCustomCoords, setStep, handleRender, videoBase64, isGenerating, setStatus, audioUrl,
  publishPlatforms, setPublishPlatforms
}: any) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const [dragAction, setDragAction] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startCoords, setStartCoords] = useState<{x:number,y:number,w:number,h:number} | null>(null);

  const [editPrompt, setEditPrompt] = useState('');
  const [styleOverrides, setStyleOverrides] = useState<any>({});

  const template = activeTemplates.find((t: any) => t.id === templateId) || activeTemplates[0];

  const parseOrCustom = (boxName: string) => {
    let raw = template.coordinates[boxName];
    if (boxName === 'headline_box' && customCoords.headline) raw = customCoords.headline;
    if (boxName === 'ticker_box' && customCoords.ticker) raw = customCoords.ticker;
    if (boxName === 'subtitle_box' && customCoords.subtitle) raw = customCoords.subtitle;
    if (boxName === 'video_box' && customCoords.video) raw = customCoords.video;
    
    if (!raw || raw === 'hidden') return { x:0, y:0, w:0, h:0, hidden: true };
    const [x,y,w,h] = raw.split(',').map(Number);
    return { x: isNaN(x)?0:x, y: isNaN(y)?0:y, w: isNaN(w)?100:w, h: isNaN(h)?100:h, hidden: false };
  };

  const setCoordFromDrag = (boxName: string, c: {x:number,y:number,w:number,h:number}) => {
    const s = `${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.w)},${Math.round(c.h)}`;
    if (boxName === 'headline_box') setCustomCoords((p: any) => ({...p, headline: s}));
    if (boxName === 'ticker_box') setCustomCoords((p: any) => ({...p, ticker: s}));
    if (boxName === 'subtitle_box') setCustomCoords((p: any) => ({...p, subtitle: s}));
    if (boxName === 'video_box') setCustomCoords((p: any) => ({...p, video: s}));
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, boxName: string, action: 'move' | 'resize' = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveBox(boxName);
    setDragAction(action);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setStartCoords(parseOrCustom(boxName));
  };

  React.useEffect(() => {
    if (!activeBox || !dragAction || !startCoords || !containerRef.current) return;
    const handleWindowMouseMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      const scaleX = 1080 / rect.width;
      const scaleY = 1920 / rect.height;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as globalThis.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as globalThis.MouseEvent).clientY;
      const dx = (clientX - dragStart.x) * scaleX;
      const dy = (clientY - dragStart.y) * scaleY;
      
      if (dragAction === 'move') {
        const newX = Math.max(0, Math.min(1080 - startCoords.w, startCoords.x + dx));
        const newY = Math.max(0, Math.min(1920 - startCoords.h, startCoords.y + dy));
        setCoordFromDrag(activeBox, { ...startCoords, x: newX, y: newY });
      } else if (dragAction === 'resize') {
        const newW = Math.max(20, Math.min(1080 - startCoords.x, startCoords.w + dx));
        const newH = Math.max(20, Math.min(1920 - startCoords.y, startCoords.h + dy));
        setCoordFromDrag(activeBox, { ...startCoords, w: newW, h: newH });
      }
    };
    const handleWindowMouseUp = () => { 
      setActiveBox(null); 
      setDragAction(null); 
    };
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowMouseMove, { passive: false });
    window.addEventListener('touchend', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowMouseMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [activeBox, dragStart, startCoords]);

  let finalMediaUrl = template.mediaUrl || template.screenshotUrl;
  if (visualMode === 'post') {
     if (selectedArticle?.videoUrl) finalMediaUrl = selectedArticle.videoUrl;
     else if (selectedArticle?.image) finalMediaUrl = selectedArticle.image; 
  }
  if ((visualMode === 'upload' || visualMode === 'ai') && customMediaUrl) finalMediaUrl = customMediaUrl;

  let finalOverlayUrl: string | null = null;
  if (visualMode === 'template' && overlayMode !== 'none') {
      if (overlayMode === 'post' && selectedArticle?.image) {
        finalOverlayUrl = selectedArticle.image;
      } else if ((overlayMode === 'upload' || overlayMode === 'ai') && overlayMediaUrl) {
        finalOverlayUrl = overlayMediaUrl;
      }
  }

  const handleAIEdit = async () => {
    if (!editPrompt) return;
    setStatus('Applying AI edits...');
    try {
      const { editReelScriptWithAI } = await import('../services/geminiService');
      const updated = await editReelScriptWithAI(scriptData, styleOverrides, editPrompt);
      if (updated.scriptData) setScriptData((prev: any) => ({...prev, ...updated.scriptData}));
      if (updated.styleOverrides) setStyleOverrides((prev: any) => ({...prev, ...updated.styleOverrides}));
      setEditPrompt('');
    } catch (e: any) {
      alert("AI Edit failed: " + e.message);
    } finally {
      setStatus('');
    }
  };

  const headlineBox = parseOrCustom('headline_box');
  const tickerBox = parseOrCustom('ticker_box');
  const subtitleBox = parseOrCustom('subtitle_box');
  const videoBox = parseOrCustom('video_box');
  const scale = 360 / 1080; 

  const isVideo = finalMediaUrl?.match(/\.(mp4|webm|mov)$/i) || finalMediaUrl?.startsWith('data:video');

  const handlePublishReel = async () => {
    if (!videoBase64) return;
    
    let blob;
    if (videoBase64.startsWith('blob:')) {
       blob = await fetch(videoBase64).then(r => r.blob());
    } else {
       const d = videoBase64.startsWith('data:') ? videoBase64 : `data:video/mp4;base64,${videoBase64}`;
       blob = await fetch(d).then(r => r.blob());
    }
    
    let hashtagsStr = '';
    if (selectedArticle && selectedArticle.tags && selectedArticle.tags.length > 0) {
       const selectedTags = selectedArticle.tags.slice(0, 2);
       hashtagsStr = '\n\n' + selectedTags.map((t: string) => '#' + t.replace(/\\s+/g, '')).join(' ') + ' #kktnews';
    } else {
       hashtagsStr = '\n\n#kktnews';
    }
    const fbMessage = scriptData.facebookCaption || ((scriptData.headline || selectedArticle?.title || 'Check out our latest reel!') + hashtagsStr);
    await doPublishReel(blob, fbMessage);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* HTML Preview Visualizer inside */}
      <div className="flex flex-col items-center">
        {!videoBase64 && (
          <div 
             ref={containerRef}
             className="relative border-4 border-gray-900 bg-black shadow-xl overflow-hidden select-none"
             style={{ width: '360px', height: '640px' }}
          >
             {isVideo ? (
               <video src={finalMediaUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />
             ) : (
               <img src={finalMediaUrl} alt="Preview bg" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />
             )}

             {finalOverlayUrl && !videoBox.hidden && (
               <div
                  className="absolute border-2 border-dashed border-red-400 hover:border-red-500 cursor-grab active:cursor-grabbing pointer-events-auto"
                  style={{
                    left: videoBox.x * scale, top: videoBox.y * scale, 
                    width: videoBox.w * scale, height: videoBox.h * scale,
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'video_box', 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'video_box', 'move')}
               >
                 <img src={finalOverlayUrl} alt="Overlay preview" className="w-full h-full object-cover pointer-events-none" />
                 <div 
                   className="absolute bottom-0 right-0 w-8 h-8 -mr-4 -mb-4 bg-transparent cursor-nwse-resize flex items-center justify-center pointer-events-auto"
                   onMouseDown={(e) => handleDragStart(e, 'video_box', 'resize')}
                   onTouchStart={(e) => handleDragStart(e, 'video_box', 'resize')}
                 >
                   <div className="w-4 h-4 bg-white border border-gray-400"></div>
                 </div>
               </div>
             )}
             
             {showHeadline && !headlineBox.hidden && (
                <div 
                  className="absolute flex items-center justify-center p-2 cursor-grab active:cursor-grabbing border-2 border-dashed border-red-400 hover:border-red-500"
                  style={{
                    left: headlineBox.x * scale, top: headlineBox.y * scale, 
                    width: headlineBox.w * scale, height: headlineBox.h * scale,
                    backgroundColor: 'rgba(0,0,0,0.5)'
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'headline_box', 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'headline_box', 'move')}
                >
                   <span className="text-center font-bold pointer-events-none" style={{
                      color: styleOverrides.headlineColor || 'white', 
                      fontSize: `${(parseInt(styleOverrides.headlineSize || '50') * scale)}px`
                   }}>{scriptData.headline}</span>
                   <div 
                     className="absolute bottom-0 right-0 w-8 h-8 -mr-4 -mb-4 bg-transparent cursor-nwse-resize flex items-center justify-center pointer-events-auto"
                     onMouseDown={(e) => handleDragStart(e, 'headline_box', 'resize')}
                     onTouchStart={(e) => handleDragStart(e, 'headline_box', 'resize')}
                   >
                     <div className="w-4 h-4 bg-white border border-gray-400"></div>
                   </div>
                </div>
             )}

             {showTicker && !tickerBox.hidden && (
                <div 
                  className="absolute flex items-center text-white px-2 cursor-grab active:cursor-grabbing border-2 border-dashed border-yellow-400 hover:border-yellow-500 whitespace-nowrap overflow-visible"
                  style={{
                    left: tickerBox.x * scale, top: tickerBox.y * scale, 
                    width: tickerBox.w * scale, height: tickerBox.h * scale,
                    backgroundColor: styleOverrides.tickerBg?.replace('@', ',').replace('.8', '0.8') || 'rgba(255,0,0,0.8)'
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'ticker_box', 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'ticker_box', 'move')}
                >
                   <div className="w-full h-full overflow-hidden flex items-center pointer-events-none">
                     <span className="font-bold" style={{
                        color: styleOverrides.tickerColor || 'white', 
                        fontSize: `${(parseInt(styleOverrides.tickerSize || '40') * scale)}px`
                     }}>{scriptData.ticker}</span>
                   </div>
                   <div 
                     className="absolute bottom-0 right-0 w-8 h-8 -mr-4 -mb-4 bg-transparent cursor-nwse-resize flex items-center justify-center pointer-events-auto"
                     onMouseDown={(e) => handleDragStart(e, 'ticker_box', 'resize')}
                     onTouchStart={(e) => handleDragStart(e, 'ticker_box', 'resize')}
                   >
                     <div className="w-4 h-4 bg-white border border-gray-400"></div>
                   </div>
                </div>
             )}

             {showSubtitles && !subtitleBox.hidden && (
                <div 
                  className="absolute flex items-center justify-center p-2 cursor-grab active:cursor-grabbing border-2 border-dashed border-green-400 hover:border-green-500"
                  style={{
                    left: subtitleBox.x * scale, top: subtitleBox.y * scale, 
                    width: subtitleBox.w * scale, height: subtitleBox.h * scale,
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'subtitle_box', 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'subtitle_box', 'move')}
                >
                   <span className="text-center font-bold pointer-events-none" style={{
                      color: styleOverrides.subtitleColor || 'white', 
                      fontSize: `${(parseInt(styleOverrides.subtitleSize || '45') * scale)}px`,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                      WebkitTextStroke: '2px black'
                   }}>{scriptData.subtitleChunks?.[0] || scriptData.subtitles?.[0] || 'Subtitle prev...'}</span>
                   <div 
                     className="absolute bottom-0 right-0 w-8 h-8 -mr-4 -mb-4 bg-transparent cursor-nwse-resize flex items-center justify-center pointer-events-auto"
                     onMouseDown={(e) => handleDragStart(e, 'subtitle_box', 'resize')}
                     onTouchStart={(e) => handleDragStart(e, 'subtitle_box', 'resize')}
                   >
                     <div className="w-4 h-4 bg-white border border-gray-400"></div>
                   </div>
                </div>
             )}
          </div>
        )}
        
        {videoBase64 && (
          <div className="flex justify-center bg-black rounded-lg p-2 h-[640px] w-[360px]">
             <video src={videoBase64.startsWith('blob:') ? videoBase64 : `data:video/mp4;base64,${videoBase64}`} controls className="h-full rounded shadow-lg border-2 border-slate-700" />
          </div>
        )}
      </div>

      <div className="space-y-6 flex flex-col justify-between">
         <div>
            <h3 className="font-bold text-xl border-b pb-2 flex items-center gap-2"><Zap className="text-pink-600"/> Edit via Prompt</h3>
            <p className="text-sm text-gray-600 my-2">Use AI to edit text, fonts, sizes, or colors. You can also drag the text boxes in the visualizer to reposition them.</p>
            
            <textarea 
               value={editPrompt}
               onChange={e => setEditPrompt(e.target.value)}
               placeholder="e.g., 'Make the headline red and increase font size to 80', 'Rewrite the ticker to be more urging'"
               className="w-full border rounded-lg p-3 min-h-[100px] text-sm mb-2"
            />
            <button onClick={handleAIEdit} disabled={!editPrompt || isGenerating} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm flex items-center gap-2">
               {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>} AI Edit
            </button>
         </div>
         
         <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
            <h4 className="font-bold flex items-center gap-2">Export Final Video</h4>
            <p className="text-sm text-gray-600 mb-4">When the layout looks good, render the final video. Generating might take a minute.</p>
            {!videoBase64 ? (
               <button onClick={() => handleRender(styleOverrides)} disabled={isGenerating} className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded py-3 font-bold flex items-center justify-center gap-2">
                 {isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Video size={18}/>} Render Final FFMPEG Video
               </button>
            ) : (
                 <div className="flex flex-col gap-2">
                 {audioUrl && <a href={audioUrl} download="voiceover.wav" className="px-3 py-2 bg-white rounded border text-sm text-center font-medium shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2">⬇️ Download Voiceover Audio</a>}
                 <a href={videoBase64.startsWith('blob:') ? videoBase64 : `data:video/mp4;base64,${videoBase64}`} download="reel.mp4" className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded border text-sm text-center font-medium shadow-sm flex items-center justify-center gap-2">⬇️ Download Final Reel.mp4</a>
                 
                 <div className="bg-white p-3 rounded border my-2">
                   <h5 className="text-sm font-bold mb-2">Publish To:</h5>
                   <div className="flex gap-4">
                     <label className="flex items-center gap-1 cursor-pointer">
                       <input type="checkbox" checked={publishPlatforms.facebook} onChange={(e) => setPublishPlatforms({...publishPlatforms, facebook: e.target.checked})} /> Facebook
                     </label>
                     <label className="flex items-center gap-1 cursor-pointer">
                       <input type="checkbox" checked={publishPlatforms.instagram} onChange={(e) => setPublishPlatforms({...publishPlatforms, instagram: e.target.checked})} /> Instagram
                     </label>
                     <label className="flex items-center gap-1 cursor-pointer">
                       <input type="checkbox" checked={publishPlatforms.youtube} onChange={(e) => setPublishPlatforms({...publishPlatforms, youtube: e.target.checked})} /> YouTube
                     </label>
                   </div>
                 </div>

                 <button onClick={handlePublishReel} disabled={isPublishing || (!publishPlatforms.facebook && !publishPlatforms.instagram && !publishPlatforms.youtube)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded border text-sm text-center font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {isPublishing ? <RefreshCw className="animate-spin" size={16}/> : '🌐'} {isPublishing ? 'Publishing...' : 'Publish Selected Platforms'}
                 </button>
               </div>
            )}
            
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(3)} className="flex-1 bg-gray-200 text-gray-800 rounded py-2 font-bold hover:bg-gray-300">Back</button>
              <button onClick={onClose} className="flex-1 bg-gray-800 text-white rounded py-2 font-bold hover:bg-gray-900">Done</button>
            </div>
         </div>
      </div>
    </div>
  );
}
