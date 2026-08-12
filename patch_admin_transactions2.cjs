const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// Find the duplicated workerAssets line
const toReplace = `const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');
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
    const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');`;

const correct = `const workerAssets = assets.filter((a: any) => a.senderId === w.id && a.fileName === 'payment_details.json');
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

if (content.includes(toReplace)) {
  content = content.replace(toReplace, correct);
  fs.writeFileSync('components/ManageWorkers.tsx', content);
  console.log('Fixed duplicated workerAssets');
} else {
  console.log('Could not find duplicated string');
}
