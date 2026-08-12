const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// 1. Add State
const stateAdd = `
  const [newNotification, setNewNotification] = useState({ title: '', message: '', type: 'info' });
  const [workerNotifications, setWorkerNotifications] = useState<any[]>([]);
  const [existingNotifAssetId, setExistingNotifAssetId] = useState('');`;
content = content.replace("const [newTx, setNewTx] = useState({ id: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });", "const [newTx, setNewTx] = useState({ id: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });\n" + stateAdd);

// 2. Load Notifications
const loadReplace = `
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
    }`;

content = content.replace(
  "setWorkerPaymentDetails({});\n    }",
  "setWorkerPaymentDetails({});\n    }\n" + loadReplace
);

// 3. Add handlePushNotification
const handlePushNotificationStr = `
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
`;

content = content.replace(
  "const handleClearTransactions = async () => {",
  handlePushNotificationStr + "\n  const handleClearTransactions = async () => {"
);

// 4. Add UI section before the Transaction History
const notifUI = `
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
`;

content = content.replace(
  '<div className="mt-8 pt-6 border-t border-slate-100">\n                  <div className="flex justify-between items-center mb-4">\n                    <h4 className="font-bold text-slate-800">Transaction History</h4>',
  notifUI + '\n                <div className="mt-8 pt-6 border-t border-slate-100">\n                  <div className="flex justify-between items-center mb-4">\n                    <h4 className="font-bold text-slate-800">Transaction History</h4>'
);

fs.writeFileSync('components/ManageWorkers.tsx', content);
console.log('ManageWorkers updated with push notifications');
