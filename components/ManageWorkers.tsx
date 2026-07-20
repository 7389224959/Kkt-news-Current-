import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, Plus, Trash2, Edit } from 'lucide-react';
import { Worker, WorkerTask, WorkerAsset } from '../types';
import { Folder, Upload } from 'lucide-react';

const ManageWorkers: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [activeTab, setActiveTab] = useState<'workers' | 'tasks' | 'assets'>('workers');
  const [assets, setAssets] = useState<WorkerAsset[]>([]);
  const [selectedWorkerForAsset, setSelectedWorkerForAsset] = useState<string>('');
  const [assetFile, setAssetFile] = useState<File | null>(null);

  // Form states
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  const [newWorker, setNewWorker] = useState<Partial<Worker>>({
    id: '',
    password: '',
    name: '',
    designation: '',
    rank: 'Bronze Agent',
    points: 0,
    totalPoints: 1000,
    walletBalance: '₹ 0',
    isActive: true
  });

  const [newTask, setNewTask] = useState<Partial<WorkerTask>>({
    title: '',
    reward: '₹ ',
    date: new Date().toLocaleDateString(),
    status: 'Available',
    assignedTo: ''
  });

  useEffect(() => {
    const loadData = () => {
      const savedWorkers = localStorage.getItem('kkt_workers');
      const savedTasks = localStorage.getItem('kkt_worker_tasks');
      if (savedWorkers) setWorkers(JSON.parse(savedWorkers));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      const savedAssets = localStorage.getItem('kkt_worker_assets');
      if (savedAssets) setAssets(JSON.parse(savedAssets));
    };
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kkt_workers' || e.key === 'kkt_worker_tasks' || e.key === 'kkt_worker_assets') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveWorkers = (newWorkers: Worker[]) => {
    setWorkers(newWorkers);
    localStorage.setItem('kkt_workers', JSON.stringify(newWorkers));
  };

  const saveTasks = (newTasks: WorkerTask[]) => {
    setTasks(newTasks);
    localStorage.setItem('kkt_worker_tasks', JSON.stringify(newTasks));
  };

  
  const handleUploadAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForAsset || !assetFile) return alert('Select a worker and a file');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const newAsset: WorkerAsset = {
        id: Date.now().toString(),
        senderId: 'admin',
        receiverId: selectedWorkerForAsset,
        fileName: assetFile.name,
        fileUrl: reader.result as string,
        timestamp: new Date().toISOString()
      };
      const updatedAssets = [...assets, newAsset];
      setAssets(updatedAssets);
      localStorage.setItem('kkt_worker_assets', JSON.stringify(updatedAssets));
      setAssetFile(null);
    };
    reader.readAsDataURL(assetFile);
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const updatedAssets = assets.filter(a => a.id !== id);
      setAssets(updatedAssets);
      localStorage.setItem('kkt_worker_assets', JSON.stringify(updatedAssets));
    }
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.id || !newWorker.password || !newWorker.name) return alert('Fill required fields');
    
    // Check if worker ID already exists
    if (workers.some(w => w.id === newWorker.id)) {
      return alert('Worker ID already exists');
    }

    const workerToAdd = { ...newWorker, id: newWorker.id } as Worker;
    saveWorkers([...workers, workerToAdd]);
    setShowAddWorker(false);
    setNewWorker({
      id: '',
      password: '',
      name: '',
      designation: '',
      rank: 'Bronze Agent',
      points: 0,
      totalPoints: 1000,
      walletBalance: '₹ 0',
      isActive: true
    });
  };

  const handleDeleteWorker = (id: string) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      saveWorkers(workers.filter(w => w.id !== id));
      // Also delete assigned tasks
      saveTasks(tasks.filter(t => t.assignedTo !== id));
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return alert('Fill required fields');
    
    // Set correct status based on assignment
    const finalStatus = newTask.assignedTo === 'all' ? 'Available' : 'Pending';
    
    const taskToAdd = { ...newTask, id: Date.now().toString(), status: finalStatus } as WorkerTask;
    saveTasks([...tasks, taskToAdd]);
    setShowAddTask(false);
    setNewTask({
      title: '',
      reward: '₹ ',
      date: new Date().toLocaleDateString(),
      status: 'Available',
      assignedTo: ''
    });
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      saveTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('workers')}
          className={`flex-1 py-4 font-bold text-sm ${activeTab === 'workers' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Manage Workers
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-4 font-bold text-sm ${activeTab === 'tasks' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Manage Tasks
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-4 font-bold text-sm ${activeTab === 'assets' ? 'bg-slate-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Assets
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'workers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Workers ({workers.length})</h2>
              <button 
                onClick={() => setShowAddWorker(!showAddWorker)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <Plus size={16} /> Add Worker
              </button>
            </div>

            {showAddWorker && (
              <form onSubmit={handleAddWorker} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Worker ID *</label>
                  <input type="text" value={newWorker.id} onChange={e => setNewWorker({...newWorker, id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required placeholder="e.g. KKT-W-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password *</label>
                  <input type="text" value={newWorker.password} onChange={e => setNewWorker({...newWorker, password: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Name *</label>
                  <input type="text" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Designation</label>
                  <input type="text" value={newWorker.designation} onChange={e => setNewWorker({...newWorker, designation: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setShowAddWorker(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Save Worker</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3">Profile</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Name & Contact</th>
                    <th className="p-3">Password</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {workers.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-gray-500">No workers found</td></tr>
                  ) : (
                    workers.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          {w.photo ? <img src={w.photo} alt={w.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" /> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">{w.name ? w.name.charAt(0) : '?'}</div>}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{w.id}</td>
                        <td className="p-3">
                          <div className="font-bold">{w.name}</div>
                          {w.email && <div className="text-xs text-slate-500">{w.email}</div>}
                          {w.mobile && <div className="text-xs text-slate-500">{w.mobile}</div>}
                        </td>
                        <td className="p-3 font-mono text-gray-500">{w.password}</td>
                        <td className="p-3">{w.designation}</td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteWorker(w.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Tasks ({tasks.length})</h2>
              <button 
                onClick={() => setShowAddTask(!showAddTask)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                disabled={workers.length === 0}
              >
                <Plus size={16} /> Assign Task
              </button>
            </div>

            {workers.length === 0 && showAddTask && (
              <div className="mb-4 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">Please add a worker first.</div>
            )}

            {showAddTask && workers.length > 0 && (
              <form onSubmit={handleAddTask} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3">Task</th>
                    <th className="p-3">Assigned To</th>
                    <th className="p-3">Reward</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {tasks.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No tasks assigned</td></tr>
                  ) : (
                    tasks.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-slate-800">{t.title}</td>
                        <td className="p-3">{t.assignedTo === 'all' ? 'All Workers (Available)' : workers.find(w => w.id === t.assignedTo)?.name || t.assignedTo}</td>
                        <td className="p-3 font-medium text-emerald-600">{t.reward}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${t.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteTask(t.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Assets ({assets.length})</h2>
            </div>
            
            <form onSubmit={handleUploadAsset} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Select Worker *</label>
                <select value={selectedWorkerForAsset} onChange={e => setSelectedWorkerForAsset(e.target.value)} className="w-full border rounded-lg px-3 py-2" required>
                  <option value="">Select Worker</option>
                  <option value="all">All Workers</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">File *</label>
                <input type="file" onChange={e => e.target.files && setAssetFile(e.target.files[0])} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Upload size={16} /> Upload & Send
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3">File Name</th>
                    <th className="p-3">Sender</th>
                    <th className="p-3">Receiver</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {assets.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No assets found</td></tr>
                  ) : (
                    assets.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                          <Folder size={16} className="text-blue-500"/>
                          <a href={a.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">{a.fileName}</a>
                        </td>
                        <td className="p-3">{a.senderId === 'admin' ? 'Admin' : workers.find(w => w.id === a.senderId)?.name || a.senderId}</td>
                        <td className="p-3">{a.receiverId === 'all' ? 'All Workers' : (a.receiverId === 'admin' ? 'Admin' : workers.find(w => w.id === a.receiverId)?.name || a.receiverId)}</td>
                        <td className="p-3">{new Date(a.timestamp).toLocaleDateString()}</td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteAsset(a.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageWorkers;
