import React, { useState, useEffect } from 'react';
import { Wallet, Upload, CheckCircle, Loader2, List, Settings, IndianRupee, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getAssets, saveAsset } from '../services/workerService';
import { uploadImage } from '../services/supabase';

export const WalletView: React.FC<{ workerInfo: any }> = ({ workerInfo }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'settings'>('transactions');
  const [paymentDetails, setPaymentDetails] = useState({ name: '', mobile: '', qrCodeUrl: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [existingAssetId, setExistingAssetId] = useState('');

  useEffect(() => {
    loadData();
  }, [workerInfo.id]);

  const loadData = async () => {
    setIsLoading(true);
    const assets = await getAssets();
    const paymentAsset = assets.find(a => a.senderId === workerInfo.id && a.fileName === 'payment_details.json');
    if (paymentAsset) {
      setExistingAssetId(paymentAsset.id);
      try {
        const details = JSON.parse(paymentAsset.fileUrl);
        setPaymentDetails(details);
      } catch (e) {}
    }
    
    // Dummy transactions for now
    setTransactions([
      { id: '1', date: '2023-10-24', amount: '+ ₹500', type: 'credit', desc: 'Task Completion: Election Rally' },
      { id: '2', date: '2023-10-22', amount: '- ₹200', type: 'debit', desc: 'Withdrawal to Bank' },
      { id: '3', date: '2023-10-20', amount: '+ ₹300', type: 'credit', desc: 'Client Referral Bonus' },
    ]);
    
    setIsLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const assetToSave = {
      id: existingAssetId || `pd_${Date.now()}_${workerInfo.id}`,
      senderId: workerInfo.id,
      receiverId: 'admin',
      fileName: 'payment_details.json',
      fileUrl: JSON.stringify(paymentDetails),
      timestamp: new Date().toISOString()
    };
    
    await saveAsset(assetToSave);
    setExistingAssetId(assetToSave.id);
    setIsSaving(false);
    alert('Payment details saved successfully!');
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsSaving(true);
      try {
        const url = await uploadImage(e.target.files[0]);
        setPaymentDetails(prev => ({ ...prev, qrCodeUrl: url }));
      } catch (err) {
        alert('Failed to upload QR Code');
      }
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Wallet & Earnings</h2>
          <p className="text-slate-500">Manage your balance, transactions, and payment methods.</p>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-blue-100 font-medium mb-1">Available Balance</p>
          <h1 className="text-4xl md:text-5xl font-bold">{workerInfo.walletBalance}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('transactions')} className={`px-6 py-2 rounded-xl font-medium transition-colors ${activeTab === 'transactions' ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-700/50 text-white hover:bg-blue-700'}`}>Transactions</button>
          <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-blue-700 shadow-md' : 'bg-blue-700/50 text-white hover:bg-blue-700'}`}>Settings</button>
        </div>
      </div>
      
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><List size={20} className="text-slate-500" /> Recent Transactions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{tx.desc}</p>
                    <p className="text-sm text-slate-500">{tx.date}</p>
                  </div>
                </div>
                <div className={`font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Settings size={20} className="text-slate-500" /> Payment Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Account Holder Name</label>
              <input required type="text" value={paymentDetails.name} onChange={e => setPaymentDetails(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter name as per bank" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mobile / UPI Number</label>
              <input required type="tel" value={paymentDetails.mobile} onChange={e => setPaymentDetails(p => ({ ...p, mobile: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter mobile number for payment" />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Payment QR Code</label>
              {paymentDetails.qrCodeUrl && (
                <div className="mb-4 inline-block relative border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <img src={paymentDetails.qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain" />
                  <button type="button" onClick={() => setPaymentDetails(p => ({ ...p, qrCodeUrl: '' }))} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full shadow-sm hover:text-rose-600">
                    <CheckCircle size={20} className="rotate-45" />
                  </button>
                </div>
              )}
              
              {!paymentDetails.qrCodeUrl && (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Upload size={32} className="mb-2 text-blue-500" />
                  <p className="font-medium mb-1">Upload QR Code</p>
                  <p className="text-xs">Accepts JPG, PNG up to 5MB</p>
                  <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" id="qr-upload" />
                  <label htmlFor="qr-upload" className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg cursor-pointer hover:bg-blue-200 transition-colors text-sm">Select Image</label>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button disabled={isSaving} type="submit" className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
