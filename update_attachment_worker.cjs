const fs = require('fs');
let content = fs.readFileSync('components/WorkerDashboard.tsx', 'utf8');

const oldVideo = `            {activeTask.videoInstructions && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Video Instructions</h3>
                <a href={activeTask.videoInstructions} target="_blank" rel="noopener noreferrer" className="bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-200 hover:bg-slate-200 transition-colors group">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-105 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Watch Instructions Video</span>
                </a>
              </div>
            )}`;

const newVideo = `            {activeTask.videoInstructions && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Video Instructions</h3>
                <a href={activeTask.videoInstructions} target="_blank" rel="noopener noreferrer" className="bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-200 hover:bg-slate-200 transition-colors group">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-105 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Watch Instructions Video</span>
                </a>
              </div>
            )}
            
            {activeTask.attachmentUrl && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Attached Files</h3>
                <a href={activeTask.attachmentUrl} download={activeTask.attachmentName || "attachment"} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Download size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 group-hover:text-blue-700">{activeTask.attachmentName || 'Download Attachment'}</div>
                    <div className="text-xs text-slate-500">Click to download</div>
                  </div>
                </a>
              </div>
            )}`;

content = content.replace(oldVideo, newVideo);
fs.writeFileSync('components/WorkerDashboard.tsx', content);
