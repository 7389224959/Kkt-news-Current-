const fs = require('fs');
let content = fs.readFileSync('components/WorkerDashboard.tsx', 'utf8');

const oldFunc = content.split('function TaskManagement({ workerId')[1].split('function DigitalIDCard')[0];

const newFunc = ` workerId, workerTasks, allTasks, onJoinTask, onUpdateTaskStatus }: { workerId?: string, workerTasks: any[], allTasks: any[], onJoinTask: (id: string) => void, onUpdateTaskStatus: (id: string, status: string) => void }) {
  const [taskFilter, setTaskFilter] = React.useState('Available');
  const [activeTask, setActiveTask] = React.useState<any | null>(null);
  const [proofText, setProofText] = React.useState('');
  const [proofFile, setProofFile] = React.useState<File | null>(null);

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (status === 'In Progress') return "text-amber-600 bg-amber-50 border-amber-200";
    if (status === 'Pending') return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const getFilteredTasks = () => {
    if (taskFilter === 'Available') {
      return allTasks.filter((t: any) => t.status === 'Available' && (t.assignedTo === 'all' || t.assignedTo === workerId));
    }
    if (taskFilter === 'Pending') {
      return workerTasks.filter((t: any) => t.status === 'Pending' || t.status === 'In Progress');
    }
    if (taskFilter === 'Completed') {
      return workerTasks.filter((t: any) => t.status === 'Completed');
    }
    return [];
  };

  const displayTasks = getFilteredTasks();

  if (activeTask) {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveTask(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Tasks
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{activeTask.title}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Calendar size={14} /> {activeTask.date}</span>
                <span className={\`px-2.5 py-1 rounded-md text-xs font-bold border \${getStatusColor(activeTask.status)}\`}>{activeTask.status}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Reward</div>
              <div className="text-xl font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{activeTask.reward}</div>
            </div>
          </div>
          
          <div className="prose max-w-none mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Task Description</h3>
            <p className="text-slate-600 mb-4">{activeTask.description || 'No detailed description provided for this task. Please follow standard protocol.'}</p>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2">Instructions</h3>
            <ul className="list-disc pl-5 text-slate-600 mb-4 space-y-1">
              <li>Read the task description carefully.</li>
              <li>Ensure all requirements are met before submission.</li>
              <li>Provide clear proof of completion (text, image, or video).</li>
            </ul>
            
            <div className="bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-200 mb-4">
               <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mb-3 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
               </div>
               <span className="text-sm font-medium text-slate-500">Video Instructions</span>
            </div>
          </div>

          {activeTask.status === 'Available' ? (
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
               <button onClick={() => setActiveTask(null)} className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
               <button onClick={() => { 
                 onJoinTask(activeTask.id); 
                 setActiveTask({ ...activeTask, status: 'Pending' }); 
               }} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Join Task</button>
            </div>
          ) : activeTask.status === 'Completed' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <h3 className="text-emerald-800 font-bold mb-2">Task Completed</h3>
              <p className="text-emerald-600 text-sm">Your proof has been submitted and is pending final verification.</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Submit Proof of Completion</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Explanation / Link</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    rows={3} 
                    placeholder="Describe what you did or paste a link..."
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attach Proof File (Optional)</label>
                  <input 
                    type="file" 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                    accept="image/*,video/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                   <button onClick={() => setActiveTask(null)} className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                   <button 
                     onClick={() => {
                       onUpdateTaskStatus(activeTask.id, 'Completed');
                       setActiveTask({ ...activeTask, status: 'Completed' });
                     }} 
                     className="px-6 py-2.5 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                   >
                     Submit for Approval
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>
          <p className="text-slate-500">View and complete your assigned reporting and promotional tasks.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setTaskFilter('Available')}
            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-colors \${taskFilter === 'Available' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}\`}
          >
            Available Tasks
          </button>
          <button 
            onClick={() => setTaskFilter('Pending')}
            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-colors \${taskFilter === 'Pending' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}\`}
          >
            Pending
          </button>
          <button 
            onClick={() => setTaskFilter('Completed')}
            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-colors \${taskFilter === 'Completed' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}\`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayTasks.map((task: any, i: number) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors shadow-sm group">
            <div className="p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className={\`px-2.5 py-1 rounded-md text-xs font-bold border \${(task.color || getStatusColor(task.status))}\`}>{task.status}</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-sm">{task.reward}</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Calendar size={14} /> {task.date}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button onClick={() => setActiveTask(task)} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors">Details</button>
                {taskFilter === 'Available' ? (
                  <button onClick={() => { setActiveTask(task); }} className="w-full py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700">
                    Join Task
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTask(task)}
                    disabled={task.status === 'Completed'}
                    className={\`w-full py-2 text-sm font-medium rounded-lg transition-colors \${task.status === 'Completed' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}\`}>
                    {task.status === 'Completed' ? 'Done' : 'Submit Proof'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {displayTasks.length === 0 && (
          <div className="col-span-1 md:col-span-3 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No tasks found in this section.
          </div>
        )}
      </div>
    </div>
  );
}
`;

content = content.replace(oldFunc, newFunc + '\n');
fs.writeFileSync('components/WorkerDashboard.tsx', content);
