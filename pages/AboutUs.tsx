import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Target, Users, Zap, Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';

const AboutUs = () => {
  const { settings } = useApp();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <Helmet>
        <title>About Us | {settings?.appName || 'Khabar Kal Tak'}</title>
        <meta name="description" content={`Learn more about ${settings?.appName || 'Khabar Kal Tak'}, our mission, and our team.`} />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-slate-900 text-white pt-24 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600 rounded-full blur-[150px] mix-blend-screen"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[150px] mix-blend-screen"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="inline-block py-1 px-3 rounded-full bg-red-600/20 text-red-400 font-bold tracking-wider uppercase text-sm mb-6 border border-red-500/20">
              Who We Are
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Uncovering the Truth, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">One Story at a Time.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {settings?.description || 'Khabar Kal Tak is a leading digital news platform dedicated to bringing you the most accurate, fast, and reliable news from Chhattisgarh and beyond.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="container mx-auto px-4 -mt-16 relative z-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Integrity First</h3>
            <p className="text-slate-600 leading-relaxed">
              We believe in fearless journalism. Our reporting is unbiased, fact-checked, and independent of political or corporate influence.
            </p>
          </motion.div>
          
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Fast & Accurate</h3>
            <p className="text-slate-600 leading-relaxed">
              In a world of misinformation, we strive to bring you the breaking news first, but more importantly, we make sure it is accurate.
            </p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Voice of the People</h3>
            <p className="text-slate-600 leading-relaxed">
              We highlight local issues, citizen grievances, and stories that matter to the common man, acting as a bridge to the authorities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="container mx-auto px-4 mb-24">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Target className="text-red-600" /> Our Mission
            </h2>
            <div className="space-y-4 text-lg text-slate-700 leading-relaxed">
              <p>
                Founded with the vision to revolutionize digital journalism, {settings?.appName || 'Khabar Kal Tak'} aims to empower citizens through information.
              </p>
              <p>
                We specialize in investigative reporting, uncovering political insights, tracking crime files, and simplifying complex RTI (Right to Information) matters for the public. Our dedicated war room monitors real-time events to keep you updated.
              </p>
              <p>
                We envision a society where every citizen is informed, aware, and capable of holding the system accountable.
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
              {/* Optional: Add an image here instead of placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-slate-400 font-bold text-2xl uppercase tracking-widest">{settings?.appName || 'News Network'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-black text-center text-slate-900 mb-12">Get in Touch</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={24} />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Head Office</h4>
            <p className="text-sm text-slate-600">
              {settings?.address || 'Raipur, Chhattisgarh, India'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-200 hover:border-red-300 transition-colors">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Email Us</h4>
            <a href={`mailto:${settings?.contactEmail || 'contact@example.com'}`} className="text-sm text-slate-600 hover:text-red-600 transition-colors">
              {settings?.contactEmail || 'info@khabarkaltak.com'}
            </a>
          </div>

          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-200 hover:border-green-300 transition-colors">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={24} />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Call Us</h4>
            <a href={`tel:${settings?.contactPhone || ''}`} className="text-sm text-slate-600 hover:text-green-600 transition-colors">
              {settings?.contactPhone || '+91 9876543210'}
            </a>
          </div>

        </div>
      </section>

    </div>
  );
};

export default AboutUs;
