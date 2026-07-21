const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

const oldState = `  const [newTask, setNewTask] = useState<Partial<WorkerTask>>({
    title: '',
    reward: '₹ ',
    date: new Date().toLocaleDateString(),
    status: 'Available',
    assignedTo: ''
  });`;
const newState = `  const [newTask, setNewTask] = useState<Partial<WorkerTask>>({
    title: '',
    description: '',
    videoInstructions: '',
    reward: '₹ ',
    date: new Date().toLocaleDateString(),
    status: 'Available',
    assignedTo: ''
  });`;

content = content.replace(oldState, newState);

const oldForm = `              <form onSubmit={handleAddTask} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Title *</label>
                  <input type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full border rounded-lg px-3 py-2" required placeholder="e.g. Cover Local Election Rally" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Reward</label>
                  <input type="text" value={newTask.reward} onChange={e => setNewTask({...newTask, reward: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="₹ 500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assign To *</label>
                  <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="">Select Worker</option>
                    <option value="all">All Workers / Available Pool</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors">Assign Task</button>
                </div>
              </form>`;

const newForm = `              <form onSubmit={handleAddTask} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Title *</label>
                  <input type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full border rounded-lg px-3 py-2" required placeholder="e.g. Cover Local Election Rally" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Describe the task details, requirements, etc." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Video Instructions URL (Optional)</label>
                  <input type="url" value={newTask.videoInstructions} onChange={e => setNewTask({...newTask, videoInstructions: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Reward</label>
                  <input type="text" value={newTask.reward} onChange={e => setNewTask({...newTask, reward: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="₹ 500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assign To *</label>
                  <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
                    <option value="">Select Worker</option>
                    <option value="all">All Workers / Available Pool</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors">Assign Task</button>
                </div>
              </form>`;

content = content.replace(oldForm, newForm);
fs.writeFileSync('components/ManageWorkers.tsx', content);
