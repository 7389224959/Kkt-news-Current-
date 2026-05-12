import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, X, Image as ImageIcon, Video, Upload, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { Article } from '../types';
import { generateFullReelScript, generateReelAudio, generateAiImage } from '../services/geminiService';
import { pcmBase64ToWavUrl, pcmBase64ToWavDataUri } from '../src/utils/audioUtils';

export default function ReelWizard({ articles, settings, onClose }: { articles: Article[], settings: any, onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('latest');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [scriptData, setScriptData] = useState<any>({ fullScript: '', headline: '', ticker: '', voiceoverScript: '', subtitles: [] });
  
  const [showHeadline, setShowHeadline] = useState(true);
  const [showTicker, setShowTicker] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  const [visualMode, setVisualMode] = useState<'template'|'post'|'upload'|'ai'>('template');
  const [customMediaUrl, setCustomMediaUrl] = useState<string>('');
  
  const [overlayMode, setOverlayMode] = useState<'none'|'post'|'upload'|'ai'>('post');
  const [overlayMediaUrl, setOverlayMediaUrl] = useState<string>('');

  const [audioUrl, setAudioUrl] = useState('');
  const [audioDataUri, setAudioDataUri] = useState('');
  const [videoBase64, setVideoBase64] = useState('');
  
  const [customCoords, setCustomCoords] = useState({ headline: '', ticker: '', subtitle: '', video: '' });

  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');

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
      const prompt = `Realistic Indian news photo representing: ${selectedArticle?.title}. Photorealistic, 4:5 aspect ratio, no text.`;
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
      const prompt = `Realistic Indian news photo representing: ${selectedArticle?.title}. Photorealistic, 4:5 aspect ratio, no text.`;
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

  const generateHTMLPreview = () => {
    setStep(4);
  };

  const handleRender = async (styleOverrides: any = {}) => {
    setIsGenerating(true);
    setStatus('Rendering Final Video (FFmpeg processing)...');
    try {
      const template = activeTemplates.find((t: any) => t.id === selectedTemplateId);
      
      let finalMediaUrl = template.mediaUrl || template.screenshotUrl;
      if (visualMode === 'post' && selectedArticle?.image) {
         finalMediaUrl = selectedArticle.image; 
      } else if (visualMode === 'upload' || visualMode === 'ai') {
         if (!customMediaUrl) throw new Error("No custom media provided");
         finalMediaUrl = customMediaUrl;
      }

      let finalOverlayUrl = null;
      if (visualMode === 'template' && overlayMode !== 'none') {
         if (overlayMode === 'post' && selectedArticle?.image) {
            finalOverlayUrl = selectedArticle.image;
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

      const renderRes = await fetch('/api/render-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioDataUri,
          templateMediaUrl: finalMediaUrl,
          overlayMediaUrl: finalOverlayUrl,
          scriptData: scriptData,
          template: renderTemplate,
          styleOverrides: styleOverrides
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
              </div>

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
  onClose, templateId, activeTemplates, scriptData, setScriptData,
  visualMode, customMediaUrl, overlayMode, overlayMediaUrl, selectedArticle, showHeadline, showTicker, showSubtitles,
  customCoords, setCustomCoords, setStep, handleRender, videoBase64, isGenerating, setStatus, audioUrl
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
  if (visualMode === 'post' && selectedArticle?.image) finalMediaUrl = selectedArticle.image; 
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
                    backgroundColor: 'rgba(0,0,0,0.6)'
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'subtitle_box', 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'subtitle_box', 'move')}
                >
                   <span className="text-center font-bold pointer-events-none" style={{
                      color: styleOverrides.subtitleColor || 'yellow', 
                      fontSize: `${(parseInt(styleOverrides.subtitleSize || '45') * scale)}px`
                   }}>{scriptData.subtitles?.[0] || 'Subtitle prev...'}</span>
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
