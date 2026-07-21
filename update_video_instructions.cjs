const fs = require('fs');
let content = fs.readFileSync('components/WorkerDashboard.tsx', 'utf8');

const oldVideo = `            <div className="bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-200 mb-4">
               <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
               </div>
               <span className="text-sm font-medium text-slate-500">Video Instructions</span>
            </div>`;

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
            )}`;

content = content.replace(oldVideo, newVideo);
fs.writeFileSync('components/WorkerDashboard.tsx', content);
