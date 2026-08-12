import React, { useState } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Store, MapPin, Calendar, Phone } from 'lucide-react';
import { uploadImage } from '../services/supabase';
import { saveAsset } from '../services/workerService';

export const AddLeadForm: React.FC<{ workerId: string }> = ({ workerId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    address: '',
    contactNumber: '',
    visitDate: new Date().toISOString().split('T')[0]
  });
  const [shopImage, setShopImage] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = '';
      if (shopImage) {
        imageUrl = await uploadImage(shopImage);
      }

      const leadData = {
        ...formData,
        shopImageUrl: imageUrl,
        submittedAt: new Date().toISOString()
      };

      const assetToSave = {
        id: `lead_${Date.now()}_${workerId}`,
        senderId: workerId,
        receiverId: 'admin',
        fileName: 'lead.json',
        fileUrl: JSON.stringify(leadData),
        timestamp: new Date().toISOString()
      };

      await saveAsset(assetToSave);
      
      alert('Lead added successfully!');
      
      setFormData({
        businessName: '',
        businessType: '',
        address: '',
        contactNumber: '',
        visitDate: new Date().toISOString().split('T')[0]
      });
      setShopImage(null);
    } catch (err: any) {
      alert('Error adding lead: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Add a Lead</h2>
          <p className="text-slate-500">Capture business details to generate a new lead.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Store size={16} className="text-blue-500"/> Business Name
              </label>
              <input required type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter business name" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Store size={16} className="text-blue-500"/> Type of Business
              </label>
              <input required type="text" name="businessType" value={formData.businessType} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Retail, Restaurant, Service" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500"/> Address
              </label>
              <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full address" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-blue-500"/> Contact Number
              </label>
              <input required type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone number" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500"/> Visit Date
              </label>
              <input required type="date" name="visitDate" value={formData.visitDate} onChange={handleInputChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Camera size={16} className="text-blue-500"/> Shop Image
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                {shopImage ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle size={32} className="text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700">{shopImage.name}</p>
                    <button type="button" onClick={() => setShopImage(null)} className="mt-2 text-sm text-red-500 hover:text-red-600 font-medium">Remove</button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mb-2 text-blue-500" />
                    <p className="font-medium mb-1">Upload Shop Photo</p>
                    <p className="text-xs">JPG, PNG up to 5MB</p>
                    <input type="file" accept="image/*" onChange={e => e.target.files && setShopImage(e.target.files[0])} className="hidden" id="shop-img-upload" />
                    <label htmlFor="shop-img-upload" className="mt-4 px-6 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg cursor-pointer hover:bg-blue-200 transition-colors text-sm">Select Image</label>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button disabled={isSubmitting} type="submit" className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
            {isSubmitting ? 'Submitting...' : 'Submit Lead'}
          </button>
        </div>
      </form>
    </div>
  );
};
