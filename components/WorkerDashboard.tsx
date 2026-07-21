import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Wallet, Trophy, Award, BookOpen, Users, Clock, 
  Contact, Bell, User, Search, MessageSquare, LogOut, ChevronRight, Download, Share2, 
  CheckCircle, XCircle, Edit, MapPin, Calendar, Camera, ArrowLeft, Folder, Upload, Trash2 
} from 'lucide-react';
import { getWorkers, saveWorker, getTasks, saveTask, getAssets, saveAsset, deleteAsset } from '../services/workerService';



const navItems = [
  { id: 'profile', label: 'My Profile', icon: Contact },
  { id: 'assets', label: 'Assets', icon: Folder },
  { id: 'tasks', label: 'Task Management', icon: CheckSquare },
];

export const WorkerDashboard: React.FC<{ onLogout: () => void; workerId?: string }> = ({ onLogout, workerId }) => {
  const finalWorkerId = workerId || 'KKT-W-2048';
  
  const [workerInfo, setWorkerInfo] = useState({
    name: 'Sankalp Sharma',
    id: finalWorkerId,
    designation: 'Field Reporter',
    rank: 'Silver Agent',
    points: 780,
    totalPoints: 1000,
    walletBalance: '₹ 4,500',
    photo: '',
    email: '',
    mobile: '',
    password: ''
  });

  const [workerTasks, setWorkerTasks] = useState<any[]>([]);
  const [workerAssets, setWorkerAssets] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      const workers = await getWorkers();
      const me = workers.find((w: any) => w.id === finalWorkerId);
      if (me) {
        setWorkerInfo(prev => ({
          ...prev,
          name: me.name,
          designation: me.designation,
          id: me.id,
          rank: me.rank || 'Bronze Agent',
          points: me.points || 0,
          totalPoints: me.totalPoints || 1000,
          walletBalance: me.walletBalance || '₹ 0',
          photo: me.photo || '',
          email: me.email || '',
          mobile: me.mobile || '',
          password: me.password || '',
        }));
      }

      const tasks = await getTasks();
      setAllTasks(tasks);
      const myTasks = tasks.filter((t: any) => t.assignedTo === finalWorkerId);
      setWorkerTasks(myTasks);

      const assets = await getAssets();
      setWorkerAssets(assets.filter((a: any) => a.receiverId === 'all' || a.receiverId === finalWorkerId || a.senderId === finalWorkerId));
    };
    loadData();
  }, [finalWorkerId]);




  const handleJoinTask = async (taskId: string) => {
    const updatedTasks = allTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, assignedTo: finalWorkerId, status: 'Pending' };
      }
      return t;
    });
    setAllTasks(updatedTasks);
    setWorkerTasks(updatedTasks.filter(t => t.assignedTo === finalWorkerId));
    const targetTask = updatedTasks.find(t => t.id === taskId);
    if (targetTask) await saveTask(targetTask);
  };

  
  const handleUpdateProfile = async (updatedData: any) => {
    setWorkerInfo(prev => ({ ...prev, ...updatedData }));
    const workers = await getWorkers();
    const targetWorker = workers.find((w: any) => w.id === finalWorkerId);
    if (targetWorker) {
      await saveWorker({ ...targetWorker, ...updatedData });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const updatedTasks = allTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    setAllTasks(updatedTasks);
    setWorkerTasks(updatedTasks.filter(t => t.assignedTo === finalWorkerId));
    const targetTask = updatedTasks.find(t => t.id === taskId);
    if (targetTask) await saveTask(targetTask);
  };

  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <DashboardHome workerInfo={workerInfo} workerTasks={workerTasks} onUpdateProfile={handleUpdateProfile} />;
      case 'assets': return <WorkerAssets workerInfo={workerInfo} workerAssets={workerAssets} setWorkerAssets={setWorkerAssets} />;
      case 'tasks': return <TaskManagement workerId={finalWorkerId} workerTasks={workerTasks} allTasks={allTasks} onJoinTask={handleJoinTask} onUpdateTaskStatus={handleUpdateTaskStatus} />;
      default: return <DashboardHome workerInfo={workerInfo} workerTasks={workerTasks} onUpdateProfile={handleUpdateProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 h-screen sticky top-0 hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">KKT</div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Worker Portal</h2>
            <p className="text-xs text-slate-500">Premium Network</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${activeTab === item.id ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              {activeTab === item.id && <motion.div layoutId="sidebar-indicator" className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full" />}
              <item.icon size={18} className={activeTab === item.id ? 'text-blue-500' : 'text-slate-500'} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={18} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-10 shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`md:hidden flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-full border border-amber-200 shadow-sm">
              <Wallet size={16} className="text-amber-600" />
              <span className="font-bold text-amber-700 text-sm">{workerInfo.walletBalance}</span>
            </div>
            <button className="relative text-slate-500 hover:text-slate-800"><MessageSquare size={20} /></button>
            <button className="relative text-slate-500 hover:text-slate-800">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block cursor-pointer">
                <p className="text-sm font-bold text-slate-800 leading-tight">{workerInfo.name}</p>
                <p className="text-xs text-blue-600 font-medium">{workerInfo.rank}</p>
              </div>
              <img src={workerInfo.photo || "https://i.pravatar.cc/150?img=32"} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover cursor-pointer bg-slate-200" />
              <button 
                onClick={onLogout} 
                className="ml-2 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

function DashboardHome({ workerInfo, workerTasks, onUpdateProfile }: { workerInfo: any; workerTasks: any[]; onUpdateProfile: (data: any) => void }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: workerInfo.name || '',
    email: workerInfo.email || '',
    mobile: workerInfo.mobile || '',
    password: workerInfo.password || '',
    photo: workerInfo.photo || ''
  });

  React.useEffect(() => {
    setEditForm({
      name: workerInfo.name || '',
      email: workerInfo.email || '',
      mobile: workerInfo.mobile || '',
      password: workerInfo.password || '',
      photo: workerInfo.photo || ''
    });
  }, [workerInfo]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(editForm);
    setIsEditing(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-amber-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <img src={workerInfo.photo || "https://i.pravatar.cc/150?img=32"} alt="User" className="w-32 h-32 rounded-full border-4 border-white/20 relative z-10 object-cover bg-slate-800" />
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full border-2 border-slate-900 z-20">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-300 font-medium mb-1">Welcome Back,</p>
                <h1 className="text-4xl font-bold mb-2">{workerInfo.name}</h1>
              </div>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing((prev) => !prev); }} className="relative z-[999] cursor-pointer bg-white/20 hover:bg-white/30 transition-colors border border-white/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 pointer-events-auto">
                <Edit size={16} /> Edit Profile
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-4">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"><Contact size={14} className="text-amber-400" /> ID: {workerInfo.id}</div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"><MapPin size={14} className="text-red-400" /> {workerInfo.designation}</div>
              {workerInfo.email && <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">{workerInfo.email}</div>}
              {workerInfo.mobile && <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">{workerInfo.mobile}</div>}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl w-full md:w-64">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-300 text-sm">Current Rank</span>
              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded-md border border-amber-500/30">{workerInfo.rank}</span>
            </div>
            <div className="mb-2 flex justify-between items-end">
              <span className="text-2xl font-bold">{workerInfo.points} <span className="text-sm font-normal text-slate-400">/ {workerInfo.totalPoints} pts</span></span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-2 mb-2 border border-slate-700/50">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{ width: `${(workerInfo.points/workerInfo.totalPoints)*100}%` }}></div>
            </div>
            <p className="text-xs text-slate-400">220 points to <span className="text-amber-400">Gold Agent</span></p>
          </div>
        </div>
      </div>


      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Full Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Worker Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Email Address</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="worker@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Mobile Number</label>
                  <input type="text" value={editForm.mobile} onChange={e => setEditForm(prev => ({ ...prev, mobile: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Change Password</label>
                  <input type="password" value={editForm.password} onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Leave blank to keep current" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    {editForm.photo ? (
                      <img src={editForm.photo} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                        <Camera size={20} />
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Tasks Completed", value: workerTasks.filter((t: any) => t.status === 'Completed').length.toString(), trend: "", icon: CheckSquare, color: "bg-emerald-500" },
          { title: "Pending Tasks", value: workerTasks.filter((t: any) => t.status !== 'Completed').length.toString(), trend: "", icon: Clock, color: "bg-amber-500" },
          { title: "Monthly Earnings", value: workerInfo.walletBalance || "₹ 0", trend: "", icon: Wallet, color: "bg-blue-500" },
          { title: "Performance Score", value: workerInfo.totalPoints > 0 ? Math.round((workerInfo.points / workerInfo.totalPoints) * 100) + "%" : "0%", trend: "", icon: Trophy, color: "bg-purple-500" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <stat.icon size={24} className={`text-${stat.color.replace('bg-', '')}`} />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1 mb-2">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.trend}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskManagement({ workerId, workerTasks, allTasks, onJoinTask, onUpdateTaskStatus }: { workerId?: string, workerTasks: any[], allTasks: any[], onJoinTask: (id: string) => void, onUpdateTaskStatus: (id: string, status: string) => void }) {
  const [taskFilter, setTaskFilter] = React.useState('Available');

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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${taskFilter === 'Available' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Available Tasks
          </button>
          <button 
            onClick={() => setTaskFilter('Pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${taskFilter === 'Pending' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setTaskFilter('Completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${taskFilter === 'Completed' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
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
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${(task.color || getStatusColor(task.status))}`}>{task.status}</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-sm">{task.reward}</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Calendar size={14} /> {task.date}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors">Details</button>
                {taskFilter === 'Available' ? (
                  <button onClick={() => onJoinTask(task.id)} className="w-full py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700">
                    Join Task
                  </button>
                ) : (
                  <button 
                    onClick={() => onUpdateTaskStatus(task.id, 'Completed')}
                    disabled={task.status === 'Completed'}
                    className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${task.status === 'Completed' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
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

function DigitalIDCard({ workerInfo }: { workerInfo: any }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Digital Press Identity</h2>
          <p className="text-slate-500">Your official KKT News credential.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"><Download size={20} /></button>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"><Share2 size={20} /></button>
        </div>
      </div>

      <div className="relative group perspective">
        {/* Card Front */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 aspect-[1.586/1] flex flex-col relative w-full">
          {/* Header */}
          <div className="h-20 bg-red-600 px-8 flex items-center justify-between border-b-4 border-amber-500 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center font-bold text-red-600 text-xl shadow-inner">KKT</div>
              <div>
                <h2 className="text-white font-black text-2xl tracking-wide uppercase leading-tight">Khabar Kal Tak</h2>
                <p className="text-red-100 text-[10px] uppercase tracking-widest font-bold">National Digital News Network</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-black text-xl tracking-widest border-2 border-white/30 px-3 py-1 rounded backdrop-blur-sm">PRESS</div>
            </div>
          </div>
          
          {/* Body */}
          <div className="flex-1 flex p-8 relative">
            <div className="absolute top-0 right-0 bottom-0 w-64 bg-slate-800/50 -skew-x-12 translate-x-10 z-0"></div>
            
            <div className="flex gap-8 z-10 w-full">
              <div className="w-32 h-40 bg-white p-1 rounded-xl shadow-xl flex-shrink-0 relative">
                <img src="https://i.pravatar.cc/150?img=32" className="w-full h-full object-cover rounded-lg" alt="Reporter" />
                <div className="absolute -bottom-3 -right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg border border-amber-400">VERIFIED</div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-3xl font-bold text-white mb-1 uppercase tracking-tight">{workerInfo.name}</h3>
                <p className="text-amber-400 font-medium text-lg uppercase tracking-wider mb-6">{workerInfo.designation}</p>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">ID Number</p>
                    <p className="text-white font-mono bg-slate-800/50 px-2 py-1 rounded inline-block">{workerInfo.id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Valid Till</p>
                    <p className="text-white font-mono bg-slate-800/50 px-2 py-1 rounded inline-block">Dec 2027</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Blood Group</p>
                    <p className="text-white font-mono bg-slate-800/50 px-2 py-1 rounded inline-block text-red-400 font-bold">O+</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-end w-24">
                <div className="bg-white p-1 rounded-lg mb-2 shadow-lg">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://kktnews.in/verify/${workerInfo.id}`} alt="QR" className="w-full h-auto rounded" />
                </div>
                <p className="text-[8px] text-slate-400 uppercase text-center font-bold">Scan to Verify</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarningsDashboard({ workerInfo }: { workerInfo: any }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Earnings & Wallet</h2>
        <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">Withdraw Funds</button>
      </div>
      
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 translate-x-10"></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-amber-100 font-medium mb-1 uppercase tracking-wider text-sm">Available Balance</p>
            <h1 className="text-5xl font-black">{workerInfo.walletBalance}</h1>
          </div>
          <div className="text-right">
            <p className="text-amber-100 text-sm mb-1">Total Earned (YTD)</p>
            <p className="text-2xl font-bold">₹ 42,800</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">Recent Transactions</div>
        <div className="divide-y divide-slate-100">
          {[
            { title: "Task: Cover Election Rally", date: "Oct 24, 2026", amount: "+ ₹800", status: "Credited" },
            { title: "Task: Distributed Flyers", date: "Oct 22, 2026", amount: "+ ₹500", status: "Credited" },
            { title: "Withdrawal to Bank (HDFC)", date: "Oct 15, 2026", amount: "- ₹4,000", status: "Success" },
          ].map((tx, i) => (
            <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount.startsWith('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {tx.amount.startsWith('+') ? <CheckCircle size={18} /> : <Wallet size={18} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{tx.title}</p>
                  <p className="text-xs text-slate-500">{tx.date} • {tx.status}</p>
                </div>
              </div>
              <span className={`font-bold ${tx.amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderboardView({ workerInfo }: { workerInfo: any }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Regional Leaderboard</h2>
          <p className="text-slate-500">Compete with top reporters and agents in your area.</p>
        </div>
        <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
          <option>This Month</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Rank</th>
              <th className="px-6 py-4 font-bold">Worker</th>
              <th className="px-6 py-4 font-bold">Tier</th>
              <th className="px-6 py-4 font-bold text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {[
              { rank: 1, name: "Arjun Verma", tier: "Diamond", points: 2450, color: "text-blue-600 bg-blue-50" },
              { rank: 2, name: "Priya Singh", tier: "Gold", points: 1820, color: "text-amber-600 bg-amber-50" },
              { rank: 3, name: workerInfo.name, tier: "Silver", points: workerInfo.points, color: "text-slate-600 bg-slate-100 font-bold", isMe: true },
              { rank: 4, name: "Rahul Kumar", tier: "Silver", points: 710, color: "text-slate-600 bg-slate-50" },
              { rank: 5, name: "Neha Gupta", tier: "Bronze", points: 430, color: "text-orange-600 bg-orange-50" },
            ].map((row, i) => (
              <tr key={i} className={`hover:bg-slate-50 transition-colors ${row.isMe ? 'bg-blue-50/50 relative' : ''}`}>
                {row.isMe && <td className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></td>}
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${row.rank <= 3 ? row.color : 'bg-slate-100 text-slate-500'}`}>
                    {row.rank}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{row.name} {row.isMe && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>}</td>
                <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${row.color.replace('bg-', 'border-').replace('text-', 'border-')}`}>{row.tier}</span></td>
                <td className="px-6 py-4 text-right font-bold text-slate-700">{row.points} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AchievementCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Achievements</h2>
        <p className="text-slate-500">Badges earned through exceptional performance.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Fast Starter", desc: "Completed 10 tasks in first week", icon: Trophy, active: true },
          { title: "Star Reporter", desc: "5 exclusive news covers", icon: Award, active: true },
          { title: "Networker", desc: "Referred 5 active agents", icon: Users, active: false },
          { title: "Diamond Status", desc: "Reach Diamond Tier", icon: Trophy, active: false },
        ].map((badge, i) => (
          <div key={i} className={`p-6 rounded-2xl border text-center ${badge.active ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${badge.active ? 'bg-amber-100 text-amber-500' : 'bg-slate-200 text-slate-400'}`}>
              <badge.icon size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{badge.title}</h3>
            <p className="text-xs text-slate-500">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainingCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Training Center</h2>
        <p className="text-slate-500">Enhance your skills to unlock higher-paying tasks.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Field Reporting Basics", progress: 100, lessons: 12, completed: true },
          { title: "Advanced Interview Skills", progress: 40, lessons: 8, completed: false },
          { title: "Digital Marketing Strategies", progress: 0, lessons: 15, completed: false },
        ].map((course, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer">
            <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
              <BookOpen size={48} className="text-slate-300 group-hover:scale-110 transition-transform" />
              {course.completed && <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full"><CheckCircle size={16} /></div>}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{course.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{course.lessons} Lessons</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full ${course.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${course.progress}%` }}></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendancePanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance Tracker</h2>
        <p className="text-slate-500">Log your active field hours.</p>
      </div>
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
        <div className="w-48 h-48 rounded-full border-8 border-slate-50 mx-auto flex flex-col items-center justify-center relative shadow-inner mb-6">
          <Clock size={48} className="text-blue-500 mb-2" />
          <p className="text-3xl font-black text-slate-900">04:22</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Active Hours</p>
          <div className="absolute top-0 left-0 w-full h-full border-8 border-blue-500 rounded-full border-t-transparent border-r-transparent animate-spin-slow"></div>
        </div>
        <div className="flex justify-center gap-4">
          <button className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-colors">Check In</button>
          <button className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition-colors">Check Out</button>
        </div>
      </div>
    </div>
  );
}

function ReferralCenter({ workerInfo }: { workerInfo: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Refer & Earn</h2>
        <p className="text-slate-500">Invite new agents and earn a bonus on their first 5 tasks.</p>
      </div>
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Users size={40} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Share Your Invite Link</h3>
        <p className="text-slate-500 mb-8 max-w-sm">Earn ₹500 for every friend who joins KKT News and completes their onboarding tasks.</p>
        
        <div className="flex w-full gap-2">
          <input type="text" readOnly value={`https://kktnews.in/join?ref=${workerInfo.id}`} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-600 font-mono text-sm outline-none" />
          <button className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">Copy Link</button>
        </div>
      </div>
    </div>
  );
}



function WorkerAssets({ workerInfo, workerAssets, setWorkerAssets }: { workerInfo: any, workerAssets: any[], setWorkerAssets: (assets: any[]) => void }) {
  const [assetFile, setAssetFile] = React.useState<File | null>(null);

  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFile) return alert('Select a file');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newAsset = {
        id: Date.now().toString(),
        senderId: workerInfo.id,
        receiverId: 'admin',
        fileName: assetFile.name,
        fileUrl: reader.result as string,
        timestamp: new Date().toISOString()
      };
      
      const newMyAssets = [...workerAssets, newAsset];
      setWorkerAssets(newMyAssets);
      setAssetFile(null);
      await saveAsset(newAsset);
    };
    reader.readAsDataURL(assetFile);
  };

  const handleDeleteAsset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      setWorkerAssets(workerAssets.filter(a => a.id !== id));
      await deleteAsset(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assets</h2>
          <p className="text-slate-500">View and upload files shared with the admin.</p>
        </div>
      </div>

      <form onSubmit={handleUploadAsset} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Upload New File to Admin</label>
          <input type="file" onChange={e => e.target.files && setAssetFile(e.target.files[0])} className="w-full border rounded-lg px-3 py-2" required />
        </div>
        <button type="submit" className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <Upload size={16} /> Send File
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">File Name</th>
              <th className="px-6 py-4 font-bold">Direction</th>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {workerAssets.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No assets found</td></tr>
            ) : (
              workerAssets.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <Folder size={18} className="text-blue-500"/>
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">{a.fileName}</a>
                  </td>
                  <td className="px-6 py-4">
                    {a.senderId === workerInfo.id ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">Sent to Admin</span>
                    ) : (
                      <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-200">Received from Admin</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(a.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    {a.senderId === workerInfo.id && (
                      <button onClick={() => handleDeleteAsset(a.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
