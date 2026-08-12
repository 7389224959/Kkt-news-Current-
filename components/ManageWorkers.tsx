import { downloadSafe } from '../src/utils/fileUtils';
import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, Plus, Trash2, Edit, XCircle, Bell, CheckCircle } from 'lucide-react';
import { Worker, WorkerTask, WorkerAsset } from '../types';
import { Folder, Upload } from 'lucide-react';
import { getWorkers, saveWorker, deleteWorker, getTasks, saveTask, deleteTask, getAssets, saveAsset, deleteAsset } from '../services/workerService';

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
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [workerPaymentDetails, setWorkerPaymentDetails] = useState<any>({});
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [workerTransactions, setWorkerTransactions] = useState<any[]>([]);
  const [existingTxAssetId, setExistingTxAssetId] = useState('');
  const [newTx, setNewTx] = useState({ id: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });

  const [newNotification, setNewNotification] = useState({ title: '', message: '', type: 'info' });
  const [workerNotifications, setWorkerNotifications] = useState<any[]>([]);
  const [existingNotifAssetId, setExistingNotifAssetId] = useState('');
  
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

  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [newTask, setNewTask] = useState<Partial<WorkerTask>>({
    title: '',
    description: '',
    videoInstructions: '',
    reward: '₹ ',
    date: new Date().toLocaleDateString(),
    status: 'Available',
    assignedTo: ''
  });

  const loadData = async () => {
    const w = await getWorkers();
    const t = await getTasks();
    const a = await getAssets();
    setWorkers(w);
    setTasks(t);
    setAssets(a);
  };
  useEffect(() => {
    loadData();
  }, []);





  
  const handleUploadAsset = async (e: React.FormEvent) => {

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
      setAssetFile(null);
      saveAsset(newAsset);
    };
    reader.readAsDataURL(assetFile);
  };

  const handleDeleteAsset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const updatedAssets = assets.filter(a => a.id !== id);
      setAssets(updatedAssets);
      await deleteAsset(id);
    }
  };

  
  const handleEditWorker = async (w: any) => {
    setEditingWorker(w);
    const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');
    const txAssets = assets.filter((a: any) => a.receiverId === w.id && a.fileName === 'transactions.json');
    if (txAssets.length > 0) {
      setExistingTxAssetId(txAssets[0].id);
      try {
        setWorkerTransactions(JSON.parse(txAssets[0].fileUrl));
      } catch(e) {
        setWorkerTransactions([]);
      }
    } else {
      setExistingTxAssetId('');
      setWorkerTransactions([]);
    }
    if (workerAssets.length > 0) {
      try {
        setWorkerPaymentDetails(JSON.parse(workerAssets[0].fileUrl));
      } catch(e) {
        setWorkerPaymentDetails({});
      }
    } else {
      setWorkerPaymentDetails({});
    }

    const notifAssets = assets.filter((a: any) => a.receiverId === w.id && a.fileName === 'notifications.json');
    if (notifAssets.length > 0) {
      setExistingNotifAssetId(notifAssets[0].id);
      try {
        setWorkerNotifications(JSON.parse(notifAssets[0].fileUrl));
      } catch(e) {
        setWorkerNotifications([]);
      }
    } else {
      setExistingNotifAssetId('');
      setWorkerNotifications([]);
    }
  };

  
  
  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.desc || !editingWorker) return;
    
    let updatedTxs = [...workerTransactions];
    
    if (newTx.id) {
      // Edit mode
      updatedTxs = updatedTxs.map(tx => {
        if (tx.id === newTx.id) {
          return {
            ...tx,
            date: newTx.date,
            amount: (newTx.type === 'credit' && !newTx.amount.startsWith('+') ? '+ ' + newTx.amount.replace(/^[+-]s*/, '') : 
                     newTx.type === 'debit' && !newTx.amount.startsWith('-') ? '- ' + newTx.amount.replace(/^[+-]s*/, '') : 
                     newTx.amount.replace(/^[+-]s*/, newTx.type === 'credit' ? '+ ' : '- ')),
            type: newTx.type,
            desc: newTx.desc
          };
        }
        return tx;
      });
    } else {
      // Add mode
      const tx = {
        id: Date.now().toString(),
        date: newTx.date,
        amount: newTx.type === 'credit' ? '+ ' + newTx.amount.replace(/^[+-]s*/, '') : '- ' + newTx.amount.replace(/^[+-]s*/, ''),
        type: newTx.type,
        desc: newTx.desc
      };
      updatedTxs = [tx, ...workerTransactions];
    }
    
    const assetToSave = {
      id: existingTxAssetId || 'tx_' + Date.now() + '_' + editingWorker.id,
      senderId: 'admin',
      receiverId: editingWorker.id,
      fileName: 'transactions.json',
      fileUrl: JSON.stringify(updatedTxs),
      timestamp: new Date().toISOString()
    };
    
    await saveAsset(assetToSave);
    setWorkerTransactions(updatedTxs);
    setExistingTxAssetId(assetToSave.id);
    setNewTx({ id: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });
    await loadData();
  };

  const handleEditTransaction = (tx: any) => {
    setNewTx({
      id: tx.id,
      date: tx.date || new Date().toISOString().split('T')[0],
      amount: tx.amount ? tx.amount.replace(/^[+-]s*/, '') : '',
      type: tx.type || 'credit',
      desc: tx.desc || ''
    });
  };

  
  const handlePushNotification = async () => {
    if (!newNotification.title || !newNotification.message || !editingWorker) return;
    
    const notif = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: newNotification.title,
      message: newNotification.message,
      type: newNotification.type,
      read: false
    };
    
    const updatedNotifs = [notif, ...workerNotifications];
    
    const assetToSave = {
      id: existingNotifAssetId || 'notif_' + Date.now() + '_' + editingWorker.id,
      senderId: 'admin',
      receiverId: editingWorker.id,
      fileName: 'notifications.json',
      fileUrl: JSON.stringify(updatedNotifs),
      timestamp: new Date().toISOString()
    };
    
    await saveAsset(assetToSave);
    setWorkerNotifications(updatedNotifs);
    setExistingNotifAssetId(assetToSave.id);
    setNewNotification({ title: '', message: '', type: 'info' });
    await loadData();
    alert('Notification pushed to worker successfully!');
  };

  const handleClearTransactions = async () => {
    if (!confirm('Are you sure you want to clear all transactions for this worker?')) return;
    
    if (existingTxAssetId) {
      await deleteAsset(existingTxAssetId);
    }
    
    setWorkerTransactions([]);
    setExistingTxAssetId('');
    await loadData();
  };


  const handleDeleteTransaction = async (txId: string) => {
    const updatedTxs = workerTransactions.filter((t: any) => t.id !== txId);
    const assetToSave = {
      id: existingTxAssetId,
      senderId: 'admin',
      receiverId: editingWorker.id,
      fileName: 'transactions.json',
      fileUrl: JSON.stringify(updatedTxs),
      timestamp: new Date().toISOString()
    };
    await saveAsset(assetToSave);
    setWorkerTransactions(updatedTxs);
    await loadData();
  };

  const handleUpdateEditingWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;
    setIsSavingWorker(true);
    await saveWorker(editingWorker as any);
    await loadData();
    setEditingWorker(null);
    setIsSavingWorker(false);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.id || !newWorker.password || !newWorker.name) return alert('Fill required fields');
    
    // Check if worker ID already exists
    if (workers.some(w => w.id === newWorker.id)) {
      return alert('Worker ID already exists');
    }

    const workerToAdd = { ...newWorker, id: newWorker.id } as Worker;
    setWorkers([...workers, workerToAdd]); await saveWorker(workerToAdd);
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

  const handleDeleteWorker = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      setWorkers(workers.filter(w => w.id !== id)); await deleteWorker(id);
      // Also delete assigned tasks
      const tasksToDelete = tasks.filter(t => t.assignedTo === id);
      setTasks(tasks.filter(t => t.assignedTo !== id));
      for (const t of tasksToDelete) {
        await deleteTask(t.id);
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return alert('Fill required fields');
    
    const finalStatus = 'Available';
    
    const finalizeTask = async (attachmentUrl?: string, attachmentName?: string) => {
      const taskToAdd = { 
        ...newTask, 
        id: Date.now().toString(), 
        status: finalStatus,
        attachmentUrl: attachmentUrl || '',
        attachmentName: attachmentName || ''
      } as WorkerTask;
      
      setTasks([...tasks, taskToAdd]); await saveTask(taskToAdd);
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        videoInstructions: '',
        reward: '₹ ',
        date: new Date().toLocaleDateString(),
        status: 'Available',
        assignedTo: ''
      });
      setTaskFile(null);
    };

    if (taskFile) {
      const reader = new FileReader();
      reader.onloadend = () => finalizeTask(reader.result as string, taskFile.name);
      reader.readAsDataURL(taskFile);
    } else {
      finalizeTask();
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t.id !== id)); await deleteTask(id);
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
                          <button onClick={() => handleEditWorker(w)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16} /></button>
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
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Task Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Describe the task details, requirements, etc." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Video Instructions URL</label>
                  <input type="url" value={newTask.videoInstructions} onChange={e => setNewTask({...newTask, videoInstructions: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Upload Attachment</label>
                  <input type="file" onChange={e => setTaskFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-1.5 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
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
                          <button type="button" onClick={() => downloadSafe(a.fileUrl, a.fileName)} className="hover:underline text-left">{a.fileName}</button>
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

      {editingWorker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Edit Worker: {editingWorker.name}</h3>
              <button onClick={() => setEditingWorker(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateEditingWorker} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Name</label>
                    <input type="text" value={editingWorker.name || ''} onChange={e => setEditingWorker({...editingWorker, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Worker ID</label>
                    <input type="text" value={editingWorker.id || ''} className="w-full border rounded-lg px-3 py-2 bg-slate-50" disabled />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
                    <input type="email" value={editingWorker.email || ''} onChange={e => setEditingWorker({...editingWorker, email: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Mobile</label>
                    <input type="text" value={editingWorker.mobile || ''} onChange={e => setEditingWorker({...editingWorker, mobile: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
                    <input type="text" value={editingWorker.password || ''} onChange={e => setEditingWorker({...editingWorker, password: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Designation</label>
                    <input type="text" value={editingWorker.designation || ''} onChange={e => setEditingWorker({...editingWorker, designation: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Wallet Balance</label>
                    <input type="text" value={editingWorker.walletBalance || ''} onChange={e => setEditingWorker({...editingWorker, walletBalance: e.target.value})} className="w-full border rounded-lg px-3 py-2 font-bold text-emerald-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Rank</label>
                    <input type="text" value={editingWorker.rank || 'Bronze Agent'} onChange={e => setEditingWorker({...editingWorker, rank: e.target.value})} className="w-full border rounded-lg px-3 py-2 font-bold text-amber-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Points</label>
                    <input type="number" value={editingWorker.points || 0} onChange={e => setEditingWorker({...editingWorker, points: parseInt(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Total Points (Next Tier)</label>
                    <input type="number" value={editingWorker.totalPoints || 1000} onChange={e => setEditingWorker({...editingWorker, totalPoints: parseInt(e.target.value) || 1000})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4">Payment Details (Submitted by Worker)</h4>
                  {workerPaymentDetails && Object.keys(workerPaymentDetails).length > 0 ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Account Holder</p>
                          <p className="font-medium">{workerPaymentDetails.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Mobile / UPI</p>
                          <p className="font-medium">{workerPaymentDetails.mobile || 'N/A'}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">QR Code</p>
                          {workerPaymentDetails.qrCodeUrl ? (
                            <img src={workerPaymentDetails.qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain border border-slate-200 rounded-lg p-2 bg-white" />
                          ) : <p className="text-sm text-slate-500">No QR code uploaded.</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-sm">
                      Worker has not submitted payment details yet.
                    </div>
                  )}
                </div>

                
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Bell size={18} /> Push Notification</h4>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Title</label>
                        <input type="text" value={newNotification.title} onChange={e => setNewNotification({...newNotification, title: e.target.value})} className="w-full border-blue-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g., Task Update" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Type</label>
                        <select value={newNotification.type} onChange={e => setNewNotification({...newNotification, type: e.target.value})} className="w-full border-blue-200 rounded-lg px-3 py-2 text-sm">
                          <option value="info">Info (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="alert">Alert (Red)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Message</label>
                        <div className="flex gap-2">
                          <input type="text" value={newNotification.message} onChange={e => setNewNotification({...newNotification, message: e.target.value})} className="w-full border-blue-200 rounded-lg px-3 py-2 text-sm" placeholder="Message content..." />
                          <button type="button" onClick={handlePushNotification} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold whitespace-nowrap flex items-center gap-2">
                            Send <CheckCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">Transaction History</h4>
                    {workerTransactions.length > 0 && (
                      <button type="button" onClick={handleClearTransactions} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                        Clear History
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                    <h5 className="text-sm font-bold text-slate-700 mb-3">{newTx.id ? "Edit Transaction" : "Add New Transaction"}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date</label>
                        <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
                        <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                          <option value="credit">Credit (+)</option>
                          <option value="debit">Debit (-)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount</label>
                        <input type="text" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="₹500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Description</label>
                        <div className="flex gap-2">
                          <input type="text" value={newTx.desc} onChange={e => setNewTx({...newTx, desc: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Task payout..." />
                          <button type="button" onClick={handleAddTransaction} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">{newTx.id ? "Update" : "Add"}</button>
                          {newTx.id && <button type="button" onClick={() => setNewTx({ id: "", date: new Date().toISOString().split("T")[0], amount: "", type: "credit", desc: "" })} className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300">Cancel</button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {workerTransactions.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {workerTransactions.map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={"w-8 h-8 rounded-full flex items-center justify-center " + (tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}>
                              {tx.type === 'credit' ? '+' : '-'}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{tx.desc}</p>
                              <p className="text-xs text-slate-500">{tx.date}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={"font-bold text-sm " + (tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900')}>{tx.amount}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleEditTransaction(tx)} className="text-blue-500 hover:text-blue-700"><Edit size={14} /></button>
                              <button type="button" onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No transactions found for this worker.</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setEditingWorker(null)} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Close</button>
                  <button disabled={isSavingWorker} type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                    {isSavingWorker ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageWorkers;
