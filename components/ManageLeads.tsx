import React, { useState, useEffect } from 'react';
import { getAssets, deleteAsset } from '../services/workerService';
import { getWorkers } from '../services/workerService';
import { MapPin, Phone, Calendar, Store, Trash2, ExternalLink } from 'lucide-react';

export const ManageLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [allAssets, allWorkers] = await Promise.all([
      getAssets(),
      getWorkers()
    ]);
    
    // Filter leads and parse JSON
    const leadAssets = allAssets.filter(a => a.fileName === 'lead.json' || a.id.startsWith('lead_'));
    const parsedLeads = leadAssets.map(a => {
      let data = {};
      try {
        data = JSON.parse(a.fileUrl);
      } catch(e) {}
      
      const worker = allWorkers.find(w => w.id === a.senderId);
      
      return {
        ...a,
        leadData: data as any,
        workerName: worker ? worker.name : a.senderId,
        workerId: a.senderId
      };
    });
    
    setLeads(parsedLeads);
    setWorkers(allWorkers);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await deleteAsset(id);
      fetchData();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="text-blue-600" /> Business Leads
        </h2>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
          No leads submitted by workers yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {leads.map(lead => (
            <div key={lead.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{lead.leadData.businessName || 'Unnamed Business'}</h3>
                    <p className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-1">
                      <Store size={14} /> {lead.leadData.businessType || 'N/A'}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(lead.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-slate-400 mt-1 shrink-0" />
                    <p className="text-sm text-slate-700">{lead.leadData.address || 'No address provided'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-700 font-medium">{lead.leadData.contactNumber || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-700">Visited: {lead.leadData.visitDate || 'N/A'}</p>
                  </div>
                </div>

                {lead.leadData.shopImageUrl && (
                  <div className="mb-6 rounded-lg overflow-hidden border border-slate-100 h-48 bg-slate-50">
                    <img src={lead.leadData.shopImageUrl} alt="Shop" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                    <p>Submitted by: <span className="font-bold text-slate-700">{lead.workerName}</span></p>
                    <p>ID: {lead.workerId}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(lead.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
