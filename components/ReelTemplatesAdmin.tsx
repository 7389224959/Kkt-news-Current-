import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { ReelTemplate, SiteSettings } from '../types';
import { Plus, Edit, Trash2, CheckCircle, X, Image as ImageIcon, Zap, AlertTriangle } from 'lucide-react';
import { uploadImage } from '../services/supabase';

// We'll import analyzing function from geminiService
// import { analyzeReelTemplate } from '../services/geminiService';

interface ReelTemplatesAdminProps {
  settings: SiteSettings | null;
  onSaveSettings: (settings: SiteSettings) => Promise<void>;
}

const ReelTemplatesAdmin: React.FC<ReelTemplatesAdminProps> = ({ settings, onSaveSettings }) => {
  const [templates, setTemplates] = useState<ReelTemplate[]>(settings?.reelTemplates || []);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ReelTemplate> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setTemplates(settings?.reelTemplates || []);
  }, [settings?.reelTemplates]);

  const handleAddNew = () => {
    setEditingTemplate({
      id: Date.now().toString(),
      name: '',
      category: 'general',
      mediaUrl: '',
      screenshotUrl: '',
      coordinates: {
        video_box: '100,100,200,200',
        headline_box: '100,300,200,100',
        subtitle_box: '100,400,200,100',
        ticker_box: '0,500,400,50',
        logo_box: '20,20,50,50',
      },
      safe_limits: {
        headline_words: 10,
        subtitle_lines: 3,
        words_per_line: 8,
        ticker_characters: 100,
      },
      fonts: {
        headline: 'Inter',
        subtitle: 'Inter',
      },
      style_rules: {
        theme: 'modern',
        ticker_speed: 30,
        text_shadow: true,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    setIsEditing(true);
  };

  const handleSave = async (updatedTemplate: ReelTemplate) => {
    try {
      const updatedTemplates = editingTemplate?.id && templates.find(t => t.id === editingTemplate.id)
        ? templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
        : [...templates, updatedTemplate];

      setTemplates(updatedTemplates);
      if (settings) {
        await onSaveSettings({
          ...settings,
          reelTemplates: updatedTemplates
        });
      }
      setIsEditing(false);
      setEditingTemplate(null);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Database Error: Please ensure you've added the 'reelTemplates' column (type: jsonb) to your 'site_settings' table in Supabase. Detailed error: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const updatedTemplates = templates.filter(t => t.id !== id);
        setTemplates(updatedTemplates);
        if (settings) {
          await onSaveSettings({
            ...settings,
            reelTemplates: updatedTemplates
          });
        }
      } catch (error: any) {
        console.error(error);
        setErrorMsg(`Failed to delete template: ${error.message}`);
      }
    }
  };

  const toggleActive = async (id: string) => {
    const updatedTemplates = templates.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    setTemplates(updatedTemplates);
    if (settings) {
      await onSaveSettings({
        ...settings,
        reelTemplates: updatedTemplates
      });
    }
  };

  const renderError = () => {
    if (!errorMsg) return null;
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 whitespace-pre-wrap">{errorMsg}</div>
        <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
      </div>
    );
  };

  if (isEditing && editingTemplate) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {renderError()}
        <TemplateEditor 
          template={editingTemplate as ReelTemplate}
          onSave={handleSave}
          onCancel={() => {
            setIsEditing(false);
            setEditingTemplate(null);
            setErrorMsg(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      {renderError()}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="text-blue-600" />
          Reel Templates
        </h2>
        <button 
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <Plus size={18} /> Add Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex flex-col">
            <div className="h-48 bg-gray-200 relative">
              {template.screenshotUrl ? (
                <img src={template.screenshotUrl} alt={template.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon size={32} className="mb-2" />
                  <span>No preview</span>
                </div>
              )}
              {!template.isActive && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-3 py-1 text-xs font-bold rounded uppercase tracking-wider">Inactive</span>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <button 
                  onClick={() => { setEditingTemplate(template); setIsEditing(true); }}
                  className="bg-white/90 p-1.5 rounded text-gray-700 hover:text-blue-600 shadow-sm"
                  title="Edit Template"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="bg-white/90 p-1.5 rounded text-gray-700 hover:text-red-600 shadow-sm"
                  title="Delete Template"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{template.name || 'Unnamed Template'}</h3>
              <p className="text-sm text-gray-500 mb-3 uppercase tracking-wider font-semibold">{template.category}</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => toggleActive(template.id)}
                  className={`w-full py-2 rounded-md font-bold transition-all flex justify-center items-center gap-2 ${
                    template.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <CheckCircle size={16} />
                  {template.isActive ? 'Active Template' : 'Activate Template'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No templates found.</p>
            <p className="text-sm mb-4">Add your first template to enable completely automated hybrid reels.</p>
            <button 
              onClick={handleAddNew}
              className="text-blue-600 font-bold hover:underline"
            >
              + Create Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelTemplatesAdmin;

// --- Template Editor Component (includes visual editor) ---

interface TemplateEditorProps {
  template: ReelTemplate;
  onSave: (template: ReelTemplate) => Promise<void>;
  onCancel: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template: initialTemplate, onSave, onCancel }) => {
  const [template, setTemplate] = useState<ReelTemplate>(initialTemplate);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [activeBox, setActiveBox] = useState<keyof ReelTemplate['coordinates'] | null>(null);
  const [dragAction, setDragAction] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [startCoords, setStartCoords] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const parseCoords = (coordStr: string) => {
    const [x, y, w, h] = coordStr.split(',').map(Number);
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y, w: isNaN(w) ? 100 : w, h: isNaN(h) ? 100 : h };
  };

  const stringifyCoords = (c: { x: number, y: number, w: number, h: number }) => {
    return `${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.w)},${Math.round(c.h)}`;
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const uploadedUrl = await uploadImage(base64);
        setTemplate(prev => ({ ...prev, screenshotUrl: uploadedUrl }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Depending on file type, we might want to upload to object storage instead of base64
      // For images, we can use the same base64 proxy
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // if file.type.startsWith('video/'), you might want to upload natively. 
        // For now let's assume images.
        const uploadedUrl = await uploadImage(base64);
        setTemplate(prev => ({ ...prev, mediaUrl: uploadedUrl }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const updateSafeLimits = () => {
    const parse = (cStr: string) => {
      const [x,y,w,h] = cStr.split(',').map(Number);
      return {w,h};
    };
    
    // Check if coordinates exist before parsing
    if (!template.coordinates) return;

    try {
      const headlineBox = parse(template.coordinates.headline_box || '0,0,100,100');
      const subtitleBox = parse(template.coordinates.subtitle_box || '0,0,100,100');
      const tickerBox = parse(template.coordinates.ticker_box || '0,0,100,100');

      // Rough approximations for 1080x1920 logical space
      const headlineWords = Math.floor((headlineBox.w * headlineBox.h) / (50 * 50 * 5)); 
      const subtitleLines = Math.floor(subtitleBox.h / 50);
      const wordsPerLine = Math.floor(subtitleBox.w / (45 * 5));
      const tickerChars = Math.floor(tickerBox.w / 25) * 3;

      setTemplate(prev => ({
        ...prev,
        safe_limits: {
          ...prev.safe_limits,
          headline_words: Math.max(3, Math.min(25, headlineWords || 10)),
          subtitle_lines: Math.max(1, Math.min(6, subtitleLines || 3)),
          words_per_line: Math.max(3, Math.min(15, wordsPerLine || 8)),
          ticker_characters: Math.max(50, Math.min(200, tickerChars || 100))
        }
      }));
    } catch (e) {
      console.error("Error auto calculating limits", e);
    }
  };

  useEffect(() => {
    // Only auto calculate if not manually typing (i.e. only on drag end or when it loads)
  }, [template.coordinates.headline_box, template.coordinates.subtitle_box, template.coordinates.ticker_box]);

  // --- Visual Editor Handlers ---

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, boxName: keyof ReelTemplate['coordinates'], action: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveBox(boxName);
    setDragAction(action);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setStartCoords(parseCoords(template.coordinates[boxName]));
  };

  useEffect(() => {
    if (!activeBox || !dragAction || !startCoords || !containerRef.current) return;

    const handleWindowMouseMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      // Don't prevent default on touch move passively
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
        
        setTemplate(prev => ({
          ...prev,
          coordinates: {
            ...prev.coordinates,
            [activeBox]: stringifyCoords({ ...startCoords, x: newX, y: newY })
          }
        }));
      } else if (dragAction === 'resize') {
        const newW = Math.max(20, Math.min(1080 - startCoords.x, startCoords.w + dx));
        const newH = Math.max(20, Math.min(1920 - startCoords.y, startCoords.h + dy));
        
        setTemplate(prev => ({
          ...prev,
          coordinates: {
            ...prev.coordinates,
            [activeBox]: stringifyCoords({ ...startCoords, w: newW, h: newH })
          }
        }));
      }
    };

    const handleWindowMouseUp = () => {
      setActiveBox(null);
      setDragAction(null);
      updateSafeLimits();
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
  }, [activeBox, dragAction, dragStart, startCoords]);
  
  const boxColors = {
    video_box: 'rgba(59, 130, 246, 0.4)', // blue
    headline_box: 'rgba(239, 68, 68, 0.4)', // red
    subtitle_box: 'rgba(16, 185, 129, 0.4)', // green
    ticker_box: 'rgba(245, 158, 11, 0.4)', // yellow
    logo_box: 'rgba(139, 92, 246, 0.4)', // purple
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {initialTemplate.name ? 'Edit Template' : 'New Template'}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="text-gray-500 hover:text-gray-700 px-4 py-2 font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(template);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : <><CheckCircle size={18} /> Save Template</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
            <input 
              type="text" 
              value={template.name}
              onChange={e => setTemplate({...template, name: e.target.value})}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. Breaking News Blue"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select 
              value={template.category}
              onChange={e => setTemplate({...template, category: e.target.value})}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="general">General</option>
              <option value="breaking">Breaking News</option>
              <option value="crime">Crime</option>
              <option value="politics">Politics</option>
              <option value="sports">Sports</option>
              <option value="entertainment">Entertainment</option>
              <option value="viral">Viral/Shocking</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded border">
             <label className="block text-sm font-bold text-gray-700 mb-2">Background Media (Image/Video)</label>
             {template.mediaUrl && (
               <div className="mb-2 text-sm text-green-600 font-bold break-all">
                 Using custom media.
               </div>
             )}
             <input type="file" accept="image/*,video/mp4" onChange={handleMediaUpload} disabled={isUploading} className="text-sm" />
          </div>

          <div className="bg-blue-50 p-4 rounded border border-blue-100">
             <label className="block text-sm font-bold text-blue-900 mb-2">Screenshot Preview for Manual Layout</label>
             <input type="file" accept="image/*" onChange={handleScreenshotUpload} disabled={isUploading} className="text-sm" />
          </div>
          
          <div>
             <h3 className="font-bold border-b pb-2 mb-3">Safe Limits</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Max Headline Words</label>
                  <input type="number" 
                    value={template.safe_limits.headline_words} 
                    onChange={e => setTemplate({...template, safe_limits: {...template.safe_limits, headline_words: parseInt(e.target.value) || 10}})}
                    className="w-full p-2 border rounded outline-none"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Max Subtitle Lines</label>
                  <input type="number" 
                    value={template.safe_limits.subtitle_lines} 
                    onChange={e => setTemplate({...template, safe_limits: {...template.safe_limits, subtitle_lines: parseInt(e.target.value) || 3}})}
                    className="w-full p-2 border rounded outline-none"
                  />
               </div>
             </div>
          </div>
        </div>

        {/* Visual Editor */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-2 font-bold">
            Visual Editor (Drag boxes to move, drag bottom-right corner to resize)
          </p>
          <div 
             ref={containerRef}
             className="relative border-4 border-gray-200 bg-gray-100 shadow-xl overflow-hidden touch-none select-none"
             style={{ width: '360px', height: '640px' }} // Scale factor: 360/1080 = 0.333
          >
             {template.screenshotUrl ? (
                <img src={template.screenshotUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
             ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-lg pointer-events-none">
                  1080 x 1920
                </div>
             )}

             {/* Rendering the boxes */}
             {(Object.keys(template.coordinates) as Array<keyof ReelTemplate['coordinates']>).map(boxName => {
                if (template.coordinates[boxName] === 'hidden') return null;

                const c = parseCoords(template.coordinates[boxName]);
                const scale = 360 / 1080; // visual scale relative to logical 1080px width
                
                return (
                    <div 
                    key={boxName}
                    className="absolute border-2 border-dashed flex items-center justify-center"
                    style={{
                      left: `${c.x * scale}px`,
                      top: `${c.y * scale}px`,
                      width: `${c.w * scale}px`,
                      height: `${c.h * scale}px`,
                      backgroundColor: boxColors[boxName],
                      borderColor: boxColors[boxName].replace('0.4', '1'),
                      cursor: dragAction === 'move' && activeBox === boxName ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => handleDragStart(e, boxName, 'move')}
                    onTouchStart={(e) => handleDragStart(e, boxName, 'move')}
                  >
                    <span className="bg-black/50 text-white px-2 py-1 text-[10px] font-bold rounded capitalize pointer-events-none">
                      {boxName.replace('_box', '')}
                    </span>
                    
                    {/* Resize handle */}
                    <div 
                      className="absolute bottom-0 right-0 w-8 h-8 -mr-4 -mb-4 bg-transparent cursor-nwse-resize flex items-center justify-center pointer-events-auto"
                      onMouseDown={(e) => handleDragStart(e, boxName, 'resize')}
                      onTouchStart={(e) => handleDragStart(e, boxName, 'resize')}
                    >
                      <div className="w-4 h-4 bg-white border border-gray-400"></div>
                    </div>
                  </div>
                );
             })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 w-full justify-center text-xs">
            {Object.keys(template.coordinates).map((boxKey) => {
              const boxName = boxKey as keyof ReelTemplate['coordinates'];
              const isHidden = template.coordinates[boxName] === 'hidden';
              return (
                <button 
                  key={boxName} 
                  onClick={() => {
                    setTemplate(prev => {
                      const newCoords = { ...prev.coordinates };
                      if (isHidden) {
                        newCoords[boxName] = '100,100,200,100'; // Default unhide
                      } else {
                        newCoords[boxName] = 'hidden';
                      }
                      return { ...prev, coordinates: newCoords };
                    });
                  }}
                  className={`flex items-center gap-1 font-mono hover:bg-gray-200 px-2 py-1 rounded transition-colors ${isHidden ? 'text-gray-400 opacity-50' : 'text-gray-800'}`}
                >
                  <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: isHidden ? 'transparent' : boxColors[boxName] }}></div>
                  {boxName.replace('_box', '')}
                  {isHidden ? ' ⌀' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
