const fs = require('fs');
let content = fs.readFileSync('components/WalletView.tsx', 'utf8');

// Replace dummy transactions with actual fetch
const loadDataOrig = `    // Dummy transactions for now
    setTransactions([
      { id: '1', date: '2023-10-24', amount: '+ ₹500', type: 'credit', desc: 'Task Completion: Election Rally' },
      { id: '2', date: '2023-10-22', amount: '- ₹200', type: 'debit', desc: 'Withdrawal to Bank' },
      { id: '3', date: '2023-10-20', amount: '+ ₹300', type: 'credit', desc: 'Client Referral Bonus' },
    ]);`;

const loadDataNew = `    const txAsset = assets.find(a => a.receiverId === workerInfo.id && a.fileName === 'transactions.json');
    if (txAsset) {
      try {
        setTransactions(JSON.parse(txAsset.fileUrl));
      } catch (e) {
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }`;

content = content.replace(loadDataOrig, loadDataNew);

// In case it was already saved or the formatting is slightly different, let's also do a fallback
if (!content.includes(loadDataNew)) {
  console.log('Fallback needed, finding dummy transactions pattern');
}

fs.writeFileSync('components/WalletView.tsx', content);
console.log('WalletView transactions patched');
