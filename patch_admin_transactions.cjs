const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// 1. Add states for transactions
content = content.replace(
  'const [isSavingWorker, setIsSavingWorker] = useState(false);',
  `const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [workerTransactions, setWorkerTransactions] = useState<any[]>([]);
  const [existingTxAssetId, setExistingTxAssetId] = useState('');
  const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });`
);

// 2. Add transaction fetching in handleEditWorker
const editWorkerOriginal = `const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');`;
const editWorkerReplacement = `const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');
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
    }`;

content = content.replace(editWorkerOriginal, editWorkerReplacement + '\n    ' + editWorkerOriginal);

// 3. Add handleAddTransaction and handleDeleteTransaction
const transactionFunctions = `
  const handleAddTransaction = async () => {
    if (!newTx.amount || !newTx.desc || !editingWorker) return;
    const tx = {
      id: Date.now().toString(),
      date: newTx.date,
      amount: newTx.type === 'credit' ? '+ ' + newTx.amount : '- ' + newTx.amount,
      type: newTx.type,
      desc: newTx.desc
    };
    const updatedTxs = [tx, ...workerTransactions];
    
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
    setNewTx({ date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });
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
`;

content = content.replace(
  'const handleUpdateEditingWorker = async (e: React.FormEvent) => {',
  transactionFunctions + '\n  const handleUpdateEditingWorker = async (e: React.FormEvent) => {'
);

// 4. Inject transaction UI into the modal
const transactionUI = `
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-4">Transaction History</h4>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                    <h5 className="text-sm font-bold text-slate-700 mb-3">Add New Transaction</h5>
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
                          <button type="button" onClick={handleAddTransaction} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">Add</button>
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
                            <button type="button" onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No transactions found for this worker.</p>
                  )}
                </div>
`;

content = content.replace(
  '<div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">',
  transactionUI + '\n                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">'
);

fs.writeFileSync('components/ManageWorkers.tsx', content);
console.log('Admin transactions patched');
