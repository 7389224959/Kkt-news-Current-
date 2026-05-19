import React, { useState } from 'react';
import { Sparkles, CheckCircle, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { ViralTemplate } from '../types';
import { analyzeTemplateImprovement } from '../services/geminiService';

interface AIImproveTemplateProps {
  previewImageUrl: string;
  template: ViralTemplate;
  newsCategory: string;
  onApproveFixes: (updatedTemplate: ViralTemplate) => void;
}

const AIImproveTemplate: React.FC<AIImproveTemplateProps> = ({
  previewImageUrl,
  template,
  newsCategory,
  onApproveFixes
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const templateStr = JSON.stringify({
        coordinates: template.coordinates,
        style_rules: template.style_rules,
        limits: template.limits
      });
      const appliedFixes = template.appliedFixes || [];
      const result = await analyzeTemplateImprovement(previewImageUrl, templateStr, newsCategory, appliedFixes);
      setReport(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze template.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = () => {
    if (!report || !report.recommendedChanges) return;
    
    // Deep copy
    const updatedTemplate = JSON.parse(JSON.stringify(template)) as ViralTemplate;
    
    // Apply changes
    const changes = report.recommendedChanges;
    
    for (const [key, value] of Object.entries(changes)) {
      const newValue = (value as any).new;
      
      if (key in updatedTemplate.coordinates) {
        (updatedTemplate.coordinates as any)[key] = newValue;
      } else if (key in updatedTemplate.style_rules) {
        (updatedTemplate.style_rules as any)[key] = newValue;
      } else {
        // Just arbitrarily add if not perfectly mapped, though prompt 
        // said we gave it the schema, it should map to style_rules or coordinates.
        if (key.includes('box')) {
             (updatedTemplate.coordinates as any)[key] = newValue;
        } else {
             (updatedTemplate.style_rules as any)[key] = newValue;
        }
      }
    }
    
    // Store applied fixes
    const fixesList = report.newFixesKeys || [];
    updatedTemplate.appliedFixes = [...(updatedTemplate.appliedFixes || []), ...fixesList];
    
    onApproveFixes(updatedTemplate);
    setReport(null); // Close report after approving
  };

  if (report) {
    return (
      <div className="bg-white border rounded-xl shadow-lg p-5 mb-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-3 border-b">
           <h3 className="text-xl font-bold flex items-center gap-2">
             <Sparkles className="text-blue-500" />
             KKT AI Template Report
           </h3>
           <button onClick={() => setReport(null)} className="text-gray-400 hover:text-gray-600">
             <X size={20} />
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <div className="flex items-end gap-2 mb-4">
                 <span className="text-4xl font-black text-gray-800">{report.overallScore}</span>
                 <span className="text-gray-500 mb-1 font-bold">/100</span>
              </div>
              
              <div className="space-y-2 mb-6 text-sm flex gap-4 flex-wrap">
                 <div className="bg-gray-50 px-3 py-1.5 rounded text-gray-700">Readability: <span className="font-bold">{report.scores?.readability}</span></div>
                 <div className="bg-gray-50 px-3 py-1.5 rounded text-gray-700">Professional Look: <span className="font-bold">{report.scores?.professionalLook}</span></div>
                 <div className="bg-gray-50 px-3 py-1.5 rounded text-gray-700">Virality: <span className="font-bold">{report.scores?.virality}</span></div>
                 <div className="bg-gray-50 px-3 py-1.5 rounded text-gray-700">Trust Factor: <span className="font-bold">{report.scores?.trustFactor}</span></div>
              </div>
              
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" /> Detected Problems:
              </h4>
              <ul className="space-y-2 mb-6">
                 {(report.issues || []).map((issue: any, idx: number) => (
                    <li key={idx} className="flex flex-col text-sm bg-orange-50/50 p-2 rounded border border-orange-100">
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'}`}></span>
                          <span className="font-semibold text-gray-800">{issue.problem}</span>
                       </div>
                    </li>
                 ))}
              </ul>
           </div>
           
           <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex flex-col justify-between">
              <div>
                 <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                   Expected Improvement
                 </h4>
                 <div className="flex items-center gap-4 py-4 px-6 bg-white rounded-lg shadow-sm w-max mb-6">
                    <span className="text-2xl font-bold text-gray-500">{report.predictedImprovement?.before || report.overallScore}</span>
                    <ChevronRight size={24} className="text-blue-500" />
                    <span className="text-3xl font-black text-green-600">
                       {report.predictedImprovement?.after || (report.overallScore + 10)}
                    </span>
                 </div>
                 
                 <div className="text-xs text-blue-700 mb-4 bg-white p-2 rounded opacity-80">
                   {Object.keys(report.recommendedChanges || {}).length} settings will be adjusted to fix the detected problems without breaking the layout.
                 </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                 <button 
                   onClick={() => setReport(null)}
                   className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                 >
                   Dismiss
                 </button>
                 <button 
                   onClick={handleApprove}
                   className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                 >
                   <CheckCircle size={18} /> Approve Fixes
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:active:scale-100"
      >
        <Sparkles size={18} className={isAnalyzing ? 'animate-pulse' : ''} />
        {isAnalyzing ? "AI is analyzing your template..." : "✨ AI Improve Template"}
      </button>
      {error && <p className="text-red-500 text-sm mt-2 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
    </div>
  );
};

export default AIImproveTemplate;
