const fs = require('fs');
let content = fs.readFileSync('components/WorkerDashboard.tsx', 'utf8');

// 1. Add state for notifications
const stateAdd = `
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);`;
content = content.replace("const [workerTasks, setWorkerTasks] = useState<any[]>([]);", "const [workerTasks, setWorkerTasks] = useState<any[]>([]);\n" + stateAdd);

// 2. Fetch notifications in loadData
const fetchAdd = `      
      const notifAsset = assets.find((a: any) => a.receiverId === me.id && a.fileName === 'notifications.json');
      if (notifAsset) {
        try {
          const parsed = JSON.parse(notifAsset.fileUrl);
          setNotifications(Array.isArray(parsed) ? parsed.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []);
        } catch(e) {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }`;

content = content.replace("setIsLoading(false);", fetchAdd + "\n      setIsLoading(false);");

// 3. Update Bell Icon and add dropdown
const unreadCount = `notifications.filter((n: any) => !n.read).length`;
const bellIconReplace = `<button className="relative text-slate-500 hover:text-slate-800">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>`;

const bellIconNew = `<div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-slate-500 hover:text-slate-800">
                <Bell size={20} />
                {${unreadCount} > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{${unreadCount}}</span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <XCircle size={16} />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((n: any) => (
                      <div key={n.id} className={\`p-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 \${!n.read ? 'bg-blue-50/30' : ''}\`}>
                        <div className={\`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center \${n.type === 'alert' ? 'bg-red-100 text-red-600' : n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}\`}>
                          <Bell size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.date).toLocaleString()}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>`;

content = content.replace(bellIconReplace, bellIconNew);

fs.writeFileSync('components/WorkerDashboard.tsx', content);
console.log('WorkerDashboard updated for notifications');
