const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ManageClients.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Imports
if (!content.includes('saveClient')) {
  content = content.replace(
    "import { getClients, deleteClient, getWorkers } from '../services/workerService';",
    "import { getClients, deleteClient, getWorkers, saveClient } from '../services/workerService';"
  );
}

if (!content.includes('Plus')) {
  content = content.replace(
    "import { Loader2, Trash2, Building, Phone, MapPin, Globe, CheckCircle, Store, Tag } from 'lucide-react';",
    "import { Loader2, Trash2, Building, Phone, MapPin, Globe, CheckCircle, Store, Tag, Plus, X } from 'lucide-react';"
  );
}

// State
if (!content.includes('showAddModal')) {
  content = content.replace(
    "const [isLoading, setIsLoading] = useState(true);",
    "const [isLoading, setIsLoading] = useState(true);\n  const [showAddModal, setShowAddModal] = useState(false);\n  const [newClient, setNewClient] = useState({ business_name: '', owner_name: '', phone: '', whatsapp: '', address: '', category: '', services: '', offer: '' });\n  const [isSaving, setIsSaving] = useState(false);"
  );
}

// Save function
if (!content.includes('handleSaveClient')) {
  content = content.replace(
    "const handleDelete = async",
    `const handleSaveClient = async (e: React.FormEvent) => {
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

  const handleDelete = async`
  );
}

// Add button
if (!content.includes('Add Client')) {
  content = content.replace(
    `<Building className="text-blue-600" /> Client Directory
        </h2>`,
    `<Building className="text-blue-600" /> Client Directory
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={20} />
          Add Client
        </button>`
  );
}

// Modal JSX
if (!content.includes('Add New Client')) {
  content = content.replace(
    "return (",
    `return (
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
      <div className="space-y-6">`
  );
  
  content = content.replace(/<\/div>\n  \);\n}/, '</div>\n    </>\n  );\n}');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('ManageClients.tsx patched');
