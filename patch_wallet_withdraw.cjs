const fs = require('fs');
let content = fs.readFileSync('components/WalletView.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { getAssets, saveAsset } from '../services/workerService';",
  "import { getAssets, saveAsset, saveWorker } from '../services/workerService';"
);

// 2. Add State
const stateAdd = `
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txAssetId, setTxAssetId] = useState('');`;

content = content.replace(
  "const [existingAssetId, setExistingAssetId] = useState('');",
  "const [existingAssetId, setExistingAssetId] = useState('');\n" + stateAdd
);

// 3. Keep track of txAssetId when loading transactions
content = content.replace(
  "if (txAsset) {\n      try {",
  "if (txAsset) {\n      setTxAssetId(txAsset.id);\n      try {"
);

// 4. Add Withdraw Handlers
const handlers = `
  const handleWithdrawClick = () => {
    if (!paymentDetails || !paymentDetails.qrCodeUrl) {
      alert('Please upload your payment QR code in Settings before withdrawing money.');
      setActiveTab('settings');
      return;
    }
    setShowWithdrawModal(true);
  };

  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const currentBalance = parseFloat(workerInfo.walletBalance.replace(/[^\\d.-]/g, '')) || 0;
    if (amountNum > currentBalance) {
      alert('Insufficient balance. Your available balance is ₹ ' + currentBalance);
      return;
    }

    setIsWithdrawing(true);

    const newTx = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      amount: '- ₹ ' + amountNum,
      type: 'debit',
      desc: 'Withdrawal Application'
    };

    const updatedTxs = [newTx, ...transactions];
    const assetToSave = {
      id: txAssetId || 'tx_' + Date.now() + '_' + workerInfo.id,
      senderId: 'admin',
      receiverId: workerInfo.id,
      fileName: 'transactions.json',
      fileUrl: JSON.stringify(updatedTxs),
      timestamp: new Date().toISOString()
    };

    await saveAsset(assetToSave);
    setTransactions(updatedTxs);
    if (!txAssetId) setTxAssetId(assetToSave.id);

    // Update worker balance
    const newBalance = currentBalance - amountNum;
    const updatedWorker = { ...workerInfo, walletBalance: '₹ ' + newBalance };
    await saveWorker(updatedWorker);

    setIsWithdrawing(false);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
    alert('Your withdrawal application has been applied successfully!');
    
    // Dispatch custom event to notify parent if needed, or simply reload to reflect new balance globally
    window.location.reload();
  };
`;

content = content.replace(
  "const handleSaveSettings = async (e: React.FormEvent) => {",
  handlers + "\n  const handleSaveSettings = async (e: React.FormEvent) => {"
);

// 5. Add Withdraw button to UI
const withdrawButton = `
        <div className="flex gap-3">
          <button onClick={handleWithdrawClick} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-md">Withdraw Money</button>
          <button onClick={() => setActiveTab('transactions')} className={\`px-6 py-2 rounded-xl font-medium transition-colors \${activeTab === 'transactions' ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-700/50 text-white hover:bg-blue-700'}\`}>Transactions</button>
          <button onClick={() => setActiveTab('settings')} className={\`px-6 py-2 rounded-xl font-medium transition-colors \${activeTab === 'settings' ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-700/50 text-white hover:bg-blue-700'}\`}>Settings</button>
        </div>`;

content = content.replace(
  /<div className="flex gap-3">\s*<button onClick=\{\(\) => setActiveTab\('transactions'\)\}[\s\S]*?<\/div>/,
  withdrawButton
);

// 6. Add Modal for withdrawal
const modalUI = `
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl max-w-md w-full relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Withdraw Money</h3>
            <p className="text-sm text-slate-500 mb-6">Enter the amount you wish to withdraw to your linked QR code / UPI.</p>
            
            <form onSubmit={submitWithdrawal}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={withdrawAmount} 
                  onChange={e => setWithdrawAmount(e.target.value)} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold" 
                  placeholder="e.g. 500" 
                />
                <p className="text-xs text-slate-500 mt-2">Available: {workerInfo.walletBalance}</p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button type="button" disabled={isWithdrawing} onClick={() => setShowWithdrawModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isWithdrawing} className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  {isWithdrawing ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}`;

content = content.replace(
  "{activeTab === 'settings' && (",
  modalUI + "\n\n      {activeTab === 'settings' && ("
);

fs.writeFileSync('components/WalletView.tsx', content);
console.log('WalletView updated for withdrawal functionality');
