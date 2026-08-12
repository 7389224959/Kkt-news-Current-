const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// 1. Update newTx state
content = content.replace(
  "const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });",
  "const [newTx, setNewTx] = useState({ id: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'credit', desc: '' });"
);

// 2. Update handleAddTransaction
const handleAddReplace = `
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
            amount: (newTx.type === 'credit' && !newTx.amount.startsWith('+') ? '+ ' + newTx.amount.replace(/^[+-]\s*/, '') : 
                     newTx.type === 'debit' && !newTx.amount.startsWith('-') ? '- ' + newTx.amount.replace(/^[+-]\s*/, '') : 
                     newTx.amount.replace(/^[+-]\s*/, newTx.type === 'credit' ? '+ ' : '- ')),
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
        amount: newTx.type === 'credit' ? '+ ' + newTx.amount.replace(/^[+-]\s*/, '') : '- ' + newTx.amount.replace(/^[+-]\s*/, ''),
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
      amount: tx.amount ? tx.amount.replace(/^[+-]\s*/, '') : '',
      type: tx.type || 'credit',
      desc: tx.desc || ''
    });
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
`;

content = content.replace(
  /const handleAddTransaction = async \(\) => {[\s\S]*?const handleDeleteTransaction = async \(txId: string\) => {/,
  handleAddReplace + '\n\n  const handleDeleteTransaction = async (txId: string) => {'
);

// 3. Update UI
const titleBar = `<div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">Transaction History</h4>
                    {workerTransactions.length > 0 && (
                      <button type="button" onClick={handleClearTransactions} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                        Clear History
                      </button>
                    )}
                  </div>`;
content = content.replace('<h4 className="font-bold text-slate-800 mb-4">Transaction History</h4>', titleBar);

content = content.replace(
  '<h5 className="text-sm font-bold text-slate-700 mb-3">Add New Transaction</h5>',
  '<h5 className="text-sm font-bold text-slate-700 mb-3">{newTx.id ? "Edit Transaction" : "Add New Transaction"}</h5>'
);

const actionButtons = `
                          <div className="flex items-center gap-4">
                            <span className={"font-bold text-sm " + (tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900')}>{tx.amount}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleEditTransaction(tx)} className="text-blue-500 hover:text-blue-700"><Edit size={14} /></button>
                              <button type="button" onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                            </div>
                          </div>`;
content = content.replace(
  /<div className="flex items-center gap-4">\s*<span className=\{"font-bold text-sm " \+ \(tx\.type === 'credit' \? 'text-emerald-600' : 'text-slate-900'\)\}>\{tx\.amount\}<\/span>\s*<button type="button" onClick=\{[\s\S]*?<\/div>/,
  actionButtons
);

content = content.replace(
  '<button type="button" onClick={handleAddTransaction} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">Add</button>',
  '<button type="button" onClick={handleAddTransaction} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">{newTx.id ? "Update" : "Add"}</button>\n                          {newTx.id && <button type="button" onClick={() => setNewTx({ id: "", date: new Date().toISOString().split("T")[0], amount: "", type: "credit", desc: "" })} className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300">Cancel</button>}'
);


fs.writeFileSync('components/ManageWorkers.tsx', content);
