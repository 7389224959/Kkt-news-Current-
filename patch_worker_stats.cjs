const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

const walletBalanceInput = `                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Wallet Balance</label>
                    <input type="text" value={editingWorker.walletBalance || ''} onChange={e => setEditingWorker({...editingWorker, walletBalance: e.target.value})} className="w-full border rounded-lg px-3 py-2 font-bold text-emerald-600" />
                  </div>`;

const extraInputs = `                  <div>
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
                  </div>`;

content = content.replace(walletBalanceInput, walletBalanceInput + '\n' + extraInputs);

fs.writeFileSync('components/ManageWorkers.tsx', content);
console.log('Worker stats fields added to ManageWorkers.tsx');
