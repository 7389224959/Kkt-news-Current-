const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ManageClients.tsx');

// Reset to a clean slate using the patch logic but safely
let content = fs.readFileSync(filePath, 'utf8');

// I will just rewrite the entire ManageClients.tsx because it's only 150 lines and it's easier to ensure correctness.
content = `import React, { useState, useEffect } from 'react';
import { getClients, deleteClient, getWorkers, saveClient } from '../services/workerService';
import { Loader2, Trash2, Building, Phone, MapPin, Globe, CheckCircle, Store, Tag, Plus, X } from 'lucide-react';
import { Worker } from '../types';

export default function ManageClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ business_name: '', owner_name: '', phone: '', whatsapp: '', address: '', category: '', services: '', offer: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedClients, fetchedWorkers] = await Promise.all([
      getClients(),
      getWorkers()
    ]);
    setClients(fetchedClients);
    setWorkers(fetchedWorkers);
    setIsLoading(false);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await saveClient(newClient);
    if (success) {
      setShowAddModal(false);
      setNewClient({ business_name: '', owner_name: '', phone: '', whatsapp: '', address: '', category: '', services: '', offer: '' });
      loadData();
    } else {
      alert("Failed to save client");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const getWorkerName = (workerId: string) => {
    const w = workers.find(w => w.id === workerId);
    return w ? w.name : 'Unknown Worker';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500 mr-2" /> Loading clients...
      </div>
    );
  }

  return (
    <>
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Add New Client</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="add-client-form" onSubmit={handleSaveClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                    <input required type="text" value={newClient.business_name} onChange={e => setNewClient({...newClient, business_name: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                    <input required type="text" value={newClient.owner_name} onChange={e => setNewClient({...newClient, owner_name: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input required type="text" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                    <input type="text" value={newClient.whatsapp} onChange={e => setNewClient({...newClient, whatsapp: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <input required type="text" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category (e.g. Recruitment Agency) *</label>
                    <input required type="text" value={newClient.category} onChange={e => setNewClient({...newClient, category: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Services *</label>
                    <input required type="text" placeholder="e.g. Hiring, Contract Staffing" value={newClient.services} onChange={e => setNewClient({...newClient, services: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Offer (Optional)</label>
                    <input type="text" value={newClient.offer} onChange={e => setNewClient({...newClient, offer: e.target.value})} className="w-full border p-2 rounded-lg" />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowAddModal(false)} type="button" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" form="add-client-form" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="text-blue-600" /> Client Directory
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={20} />
            Add Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            No clients have been onboarded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {clients.map(client => (
              <div key={client.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 bg-slate-50 flex items-center justify-center border-r border-slate-100 flex-shrink-0">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <Building size={48} className="text-slate-300" />
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{client.business_name}</h3>
                        <p className="text-slate-500 text-sm mb-3">Owner: <span className="font-medium text-slate-700">{client.owner_name}</span></p>
                      </div>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <Phone size={16} className="text-slate-400 mt-0.5" />
                        <div>
                          <div>{client.phone}</div>
                          {client.whatsapp && <div className="text-emerald-600 text-xs">WA: {client.whatsapp}</div>}
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin size={16} className="text-slate-400 mt-0.5" />
                        <span>{client.address}</span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <Store size={16} className="text-slate-400 mt-0.5" />
                        <span>{client.category}</span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <Tag size={16} className="text-slate-400 mt-0.5" />
                        <span>{client.services}</span>
                      </div>
                    </div>
                    
                    {client.offer && (
                      <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-orange-800 mb-4 inline-block">
                        <span className="font-bold">Offer:</span> {client.offer}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {client.facebook_link && <a href={client.facebook_link} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1"><Globe size={12}/> Facebook</a>}
                      {client.instagram_link && <a href={client.instagram_link} target="_blank" rel="noreferrer" className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded hover:bg-pink-100 flex items-center gap-1"><Globe size={12}/> Instagram</a>}
                      {client.google_link && <a href={client.google_link} target="_blank" rel="noreferrer" className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1"><Globe size={12}/> Google</a>}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex flex-wrap justify-between items-center gap-4 text-xs">
                    <div className="text-slate-500">
                      Onboarded by: <span className="font-bold text-slate-700">{getWorkerName(client.worker_id)}</span>
                    </div>
                    
                    <div className="flex gap-3">
                      {client.payment_screenshot_url && (
                        <a href={client.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                          <CheckCircle size={14} /> View Payment
                        </a>
                      )}
                      {client.photos_urls && client.photos_urls.length > 0 && (
                        <span className="text-blue-600 flex items-center gap-1 font-medium cursor-pointer" onClick={() => alert('View photos feature coming soon!')}>
                          {client.photos_urls.length} Photos
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('ManageClients.tsx fully restored and patched');
