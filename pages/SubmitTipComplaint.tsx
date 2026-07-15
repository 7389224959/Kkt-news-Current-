import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, AlertTriangle, Send, Image as ImageIcon, CheckCircle2, ChevronRight, Lock, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase, uploadImage } from '../services/supabase';
import { Category } from '../types';

const SubmitTipComplaint = () => {
  const [submissionType, setSubmissionType] = useState<'tip' | 'complaint'>('tip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: '',
    subject: '',
    details: ''
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.details) {
      alert('Please provide a subject and details.');
      return;
    }

    setIsSubmitting(true);
    try {
      let evidenceUrl = '';
      if (evidenceFile) {
        evidenceUrl = await uploadImage(evidenceFile);
      }

      const payload = {
        type: submissionType,
        ...formData,
        evidenceUrl
      };

      const titlePrefix = submissionType === 'tip' ? 'News Tip' : 'Complaint';
      
      const { error } = await supabase.from('articles').insert({
        title: `${titlePrefix}: ${formData.subject}`,
        slug: `tip-complaint-${Date.now()}`,
        summary: `${titlePrefix} from ${formData.name || 'Anonymous'} in ${formData.location || 'Unknown location'}`,
        content: JSON.stringify(payload),
        category: Category.TIP_COMPLAINT,
        author: formData.name || 'Anonymous',
        published_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsSuccess(true);
      setFormData({
        name: '', phone: '', email: '', location: '', subject: '', details: ''
      });
      setEvidenceFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Helmet>
          <title>Submission Successful | Khabar Kal Tak</title>
        </Helmet>
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl max-w-lg text-center border border-slate-100">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Thank You!</h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Your {submissionType} has been securely submitted to our editorial team. We appreciate you taking the time to share this with us.
          </p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors inline-block"
          >
            Submit Another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-24 text-slate-800 font-sans">
      <Helmet>
        <title>Submit a Tip or Complaint | Khabar Kal Tak</title>
        <meta name="description" content="Securely submit news tips or file a complaint with KKT News. Your identity will remain confidential." />
      </Helmet>

      {/* Header Section */}
      <section className="bg-slate-900 text-white pt-20 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6 border border-white/20 backdrop-blur-sm">
            <Shield size={16} className="text-green-400" />
            <span className="text-sm font-bold tracking-wide text-slate-200 uppercase">100% Secure & Confidential</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Submit a News Tip or File a Complaint</h1>
          <p className="text-lg text-slate-300">
            Have a story we should cover? Witnessed something important? Let us know. You can choose to remain completely anonymous.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="container mx-auto px-4 -mt-12 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setSubmissionType('tip')}
              className={`flex-1 py-5 text-lg font-bold flex items-center justify-center gap-2 transition-colors ${submissionType === 'tip' ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <FileText size={20} /> Submit News Tip
            </button>
            <button 
              onClick={() => setSubmissionType('complaint')}
              className={`flex-1 py-5 text-lg font-bold flex items-center justify-center gap-2 transition-colors ${submissionType === 'complaint' ? 'text-red-600 border-b-4 border-red-600 bg-red-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <AlertTriangle size={20} /> File Complaint
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 flex items-start gap-4">
              <Lock className="text-slate-400 flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Your identity is protected</h4>
                <p className="text-sm text-slate-600">Personal details are entirely optional. If you provide them, we will only use them to contact you for further details and will never publish them without your consent.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Name (Optional)</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" placeholder="Enter your name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number (Optional)</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" placeholder="10-digit number" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address (Optional)</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">City / Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" placeholder="Where did this happen?" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject *</label>
                <input required type="text" name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" placeholder="Briefly describe the matter" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Detailed Information *</label>
                <textarea required name="details" value={formData.details} onChange={handleInputChange} rows={6} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all resize-none" placeholder="Provide as much detail as possible..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Supporting Evidence (Optional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                  <input type="file" id="evidence" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="hidden" />
                  <label htmlFor="evidence" className="cursor-pointer flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                      <ImageIcon size={24} />
                    </div>
                    <span className="font-bold text-slate-700">Click to upload files</span>
                    <span className="text-sm text-slate-500 mt-1">Photos, PDFs, or Documents (Max 10MB)</span>
                    {evidenceFile && (
                      <span className="mt-4 px-4 py-2 bg-green-100 text-green-700 font-medium rounded-lg text-sm border border-green-200">
                        Selected: {evidenceFile.name}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500 hidden sm:block">All submissions are reviewed by our editorial team.</p>
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`px-8 py-4 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${submissionType === 'tip' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'} disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto justify-center`}
              >
                {isSubmitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Submitting...</>
                ) : (
                  <>Submit {submissionType === 'tip' ? 'News Tip' : 'Complaint'} <Send size={18} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default SubmitTipComplaint;
