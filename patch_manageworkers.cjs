const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// 1. Add state variables
content = content.replace(
  'const [showAddTask, setShowAddTask] = useState(false);',
  'const [showAddTask, setShowAddTask] = useState(false);\n  const [editingWorker, setEditingWorker] = useState<any | null>(null);\n  const [workerPaymentDetails, setWorkerPaymentDetails] = useState<any>({});\n  const [isSavingWorker, setIsSavingWorker] = useState(false);'
);

// 2. Add handleEditWorker function inside component
const editWorkerFunc = `
  const handleEditWorker = async (w: any) => {
    setEditingWorker(w);
    const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');
    if (workerAssets.length > 0) {
      try {
        setWorkerPaymentDetails(JSON.parse(workerAssets[0].fileUrl));
      } catch(e) {
        setWorkerPaymentDetails({});
      }
    } else {
      setWorkerPaymentDetails({});
    }
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
`;

content = content.replace(
  'const handleAddWorker = async (e: React.FormEvent) => {',
  editWorkerFunc + '\n  const handleAddWorker = async (e: React.FormEvent) => {'
);

// 3. Add Edit button to the table
content = content.replace(
  '<button onClick={() => handleDeleteWorker(w.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>',
  '<button onClick={() => handleEditWorker(w)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16} /></button>\n                          <button onClick={() => handleDeleteWorker(w.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>'
);

// 4. Add the modal rendering inside the return
const modalRender = `
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
`;

content = content.replace('    </div>\n  );\n};\n\nexport default ManageWorkers;', modalRender + '\n    </div>\n  );\n};\n\nexport default ManageWorkers;');

fs.writeFileSync('components/ManageWorkers.tsx', content);
console.log('Patched ManageWorkers.tsx successfully');
