import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Award, 
  TrendingUp, 
  ChevronRight, 
  IndianRupee, 
  Users, 
  Megaphone, 
  Building2, 
  CheckCircle2,
  GraduationCap,
  Smartphone,
  MessageSquare,
  FileText,
  Camera,
  PlayCircle,
  Trophy,
  Star,
  Loader2
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase, uploadImage } from '../services/supabase';
import { Category } from '../types';

const JoinUs = () => {
  const [formStep, setFormStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    emailId: '',
    mobileNumber: '',
    whatsappNumber: '',
    district: '',
    city: '',
    age: '',
    education: '',
    experience: '',
    vehicleAvailable: 'Yes',
    reasonToJoin: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => {
    if (formStep < 3) setFormStep(formStep + 1);
  };

  const handlePrevStep = () => {
    if (formStep > 1) setFormStep(formStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFile || !photoFile) {
      alert('Please upload both ID Card and Passport Photo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idCardUrl = await uploadImage(idCardFile);
      const photoUrl = await uploadImage(photoFile);

      const payload = {
        ...formData,
        idCardUrl,
        photoUrl
      };

      const { error } = await supabase.from('articles').insert({
        title: `Job Application - ${formData.fullName}`,
        slug: `job-app-${Date.now()}`,
        summary: `Job application from ${formData.fullName} in ${formData.district}`,
        content: JSON.stringify(payload),
        category: Category.JOB_APPLICATION,
        author: formData.fullName,
        published_at: new Date().toISOString()
      });

      if (error) throw error;

      alert('Applied successfully..you will notified within 48 hours through email or sms');
      setFormStep(1);
      setFormData({
        fullName: '', emailId: '', mobileNumber: '', whatsappNumber: '', district: '', city: '',
        age: '', education: '', experience: '', vehicleAvailable: 'Yes', reasonToJoin: ''
      });
      setIdCardFile(null);
      setPhotoFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit application: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      <Helmet>
        <title>Careers at KKT News | Join as Field Executive</title>
        <meta name="description" content="Build your career with Chhattisgarh's growing media network. Join KKT News as a Business Growth Partner." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80" 
            alt="Media Professionals" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/70"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={fadeIn}>
              <span className="inline-block py-1 px-3 rounded-full bg-red-600/20 text-red-400 border border-red-600/30 text-sm font-bold tracking-wider mb-6">
                WE ARE HIRING IN CHHATTISGARH
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                Build Your Career With <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Chhattisgarh's Growing Media Network</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl">
                Help local businesses grow, earn attractive commissions, build valuable connections, and become a trusted representative of KKT News in your area.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#apply" className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg text-center transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2">
                  Apply Now <ChevronRight size={20} />
                </a>
              </div>
            </motion.div>

            {/* Animated Stats */}
            <motion.div 
              initial="hidden" animate="visible" variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-white/10"
            >
              {[
                { label: 'Businesses Promoted', value: '500+' },
                { label: 'Cities Reached', value: '25+' },
                { label: 'Social Media Reach', value: '1M+' },
                { label: 'Active Campaigns', value: '150+' }
              ].map((stat, i) => (
                <motion.div key={i} variants={fadeIn} className="text-left">
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Join KKT News */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Why Join KKT News?</h2>
            <p className="text-lg text-slate-600">Join a dynamic team that values performance and rewards ambition. Build a sustainable career in the fast-paced digital media industry.</p>
          </div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { icon: IndianRupee, title: 'Unlimited Earning', desc: 'Earn generous commission on every successful sale. No upper limit.', color: 'from-green-500 to-emerald-600' },
              { icon: MapPin, title: 'Work Near Home', desc: 'Build your career in your own district and city. No forced relocations.', color: 'from-blue-500 to-indigo-600' },
              { icon: Award, title: 'Recognition & Respect', desc: 'Represent a professional, widely-recognized media organization.', color: 'from-purple-500 to-fuchsia-600' },
              { icon: TrendingUp, title: 'Career Growth', desc: 'Clear leadership opportunities as the company expands statewide.', color: 'from-red-500 to-orange-600' }
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeIn} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Earnings Potential */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Unlimited Earning Potential</h2>
            <p className="text-lg text-slate-300 italic">"Your income depends on your performance. There is no fixed upper limit."</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Level */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Starter Level</h3>
              <p className="text-slate-400 mb-6">5 Sales Per Month</p>
              <div className="mt-auto">
                <span className="text-sm text-slate-400 block mb-1">Expected Earnings</span>
                <span className="text-3xl font-black text-green-400">₹10,000 - ₹15,000</span>
              </div>
            </div>

            {/* Growth Level */}
            <div className="bg-gradient-to-b from-red-600/20 to-slate-800 backdrop-blur-md rounded-2xl p-8 border border-red-500/30 flex flex-col items-center text-center transform md:-translate-y-4 shadow-[0_0_30px_rgba(220,38,38,0.15)]">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-6 text-white shadow-lg">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Growth Level</h3>
              <p className="text-slate-300 mb-6">15 Sales Per Month</p>
              <div className="mt-auto">
                <span className="text-sm text-slate-300 block mb-1">Expected Earnings</span>
                <span className="text-4xl font-black text-white">₹30,000 - ₹45,000</span>
              </div>
              <div className="mt-4 text-xs font-bold bg-red-600/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">MOST POPULAR</div>
            </div>

            {/* Professional Level */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 text-amber-500">
                <Trophy size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Professional Level</h3>
              <p className="text-slate-400 mb-6">30+ Sales Per Month</p>
              <div className="mt-auto">
                <span className="text-sm text-slate-400 block mb-1">Expected Earnings</span>
                <span className="text-3xl font-black text-amber-400">₹75,000+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
                  Helping Local Businesses <span className="text-red-600">Grow Digitally</span>
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  As a Business Growth Partner, your mission is to empower local businesses in Chhattisgarh by connecting them with our vast digital audience. You are the bridge between traditional businesses and modern digital success.
                </p>
                
                <div className="space-y-4 mb-8">
                  {['Shops & Showrooms', 'Restaurants & Cafes', 'Coaching Institutes', 'Clinics & Hospitals', 'Local Service Providers'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" size={24} />
                      <span className="text-slate-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              {/* Visual Flow Diagram */}
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 relative">
                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Building2 /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Local Business</h4>
                      <p className="text-sm text-slate-500">Struggling to reach new customers</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center -my-3 z-0"><div className="w-1 h-8 bg-slate-200"></div></div>
                  
                  <div className="flex items-center gap-4 bg-red-600 p-4 rounded-xl shadow-lg border border-red-700 transform scale-[1.02]">
                    <div className="w-12 h-12 bg-white/20 text-white rounded-lg flex items-center justify-center"><Megaphone /></div>
                    <div className="text-white">
                      <h4 className="font-bold">KKT Promotion</h4>
                      <p className="text-sm text-red-100">News promos, reels, social ads</p>
                    </div>
                  </div>

                  <div className="flex justify-center -my-3 z-0"><div className="w-1 h-8 bg-slate-200"></div></div>

                  <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><Users /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">More Customers</h4>
                      <p className="text-sm text-slate-500">Increased footfall & brand awareness</p>
                    </div>
                  </div>

                  <div className="flex justify-center -my-3 z-0"><div className="w-1 h-8 bg-slate-200"></div></div>

                  <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center"><TrendingUp /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Massive Growth</h4>
                      <p className="text-sm text-slate-500">Higher revenue & business expansion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Can Apply & Requirements */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            
            {/* Eligible */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-white rounded-3xl p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-6">Who Can Apply?</h3>
              <ul className="space-y-4">
                {[
                  { icon: GraduationCap, text: 'Freshers & Graduates' },
                  { icon: FileText, text: 'Students looking for part-time income' },
                  { icon: Briefcase, text: 'Job Seekers' },
                  { icon: TrendingUp, text: 'Sales & Marketing Professionals' },
                  { icon: Building2, text: 'Entrepreneurs & Freelancers' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                      <item.icon size={18} />
                    </div>
                    <span className="font-medium text-slate-700">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Requirements */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-slate-900 rounded-3xl p-10 shadow-xl shadow-slate-900/20 border border-slate-800 text-white">
              <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-black mb-6">Requirements</h3>
              <ul className="space-y-4">
                {[
                  { icon: Smartphone, text: 'A Smartphone with internet access' },
                  { icon: MessageSquare, text: 'Good communication skills (Hindi/Local)' },
                  { icon: MapPin, text: 'Good knowledge of local area & markets' },
                  { icon: TrendingUp, text: 'Self-motivation and hunger to earn' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                      <item.icon size={18} />
                    </div>
                    <span className="font-medium text-slate-200">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Career Growth Roadmap */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Career Growth Roadmap</h2>
            <p className="text-lg text-slate-600">We don't just offer jobs, we build careers. Prove your performance and climb the corporate ladder quickly.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-1 bg-slate-100 transform md:-translate-x-1/2 rounded-full"></div>
              
              <div className="space-y-8">
                {[
                  { level: 1, title: 'Field Executive', desc: 'Start your journey, learn the market, and make initial sales.', color: 'bg-slate-200 text-slate-600' },
                  { level: 2, title: 'Senior Executive', desc: 'Consistent performer with higher commission slabs.', color: 'bg-blue-100 text-blue-600' },
                  { level: 3, title: 'Area Manager', desc: 'Manage a team of executives in a specific city area.', color: 'bg-indigo-100 text-indigo-600' },
                  { level: 4, title: 'District Manager', desc: 'Oversee entire district operations and multiple teams.', color: 'bg-purple-100 text-purple-600' },
                  { level: 5, title: 'State Business Head', desc: 'Lead KKT News expansion across Chhattisgarh.', color: 'bg-red-600 text-white shadow-lg shadow-red-600/30' },
                ].map((step, i) => (
                  <div key={i} className={`relative flex items-center md:justify-between ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                    <div className="hidden md:block w-5/12"></div>
                    
                    {/* Circle marker */}
                    <div className={`absolute left-0 md:left-1/2 w-20 h-20 transform md:-translate-x-1/2 rounded-full border-4 border-white ${step.color} flex items-center justify-center font-black text-xl z-10`}>
                      0{step.level}
                    </div>
                    
                    <div className="w-full md:w-5/12 pl-28 md:pl-0">
                      <div className={`p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow ${i % 2 !== 0 ? 'md:text-right' : ''}`}>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h4>
                        <p className="text-slate-600 text-sm">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map & Locations */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-3xl md:text-5xl font-black mb-6">We Are Expanding Across <span className="text-red-500">Chhattisgarh</span></h2>
          <p className="text-xl text-slate-300 mb-12">Hiring in all major districts and tehsils.</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {['Raipur', 'Durg', 'Bhilai', 'Bilaspur', 'Rajnandgaon', 'Korba', 'Raigarh', 'Jagdalpur'].map(city => (
              <span key={city} className="px-6 py-3 bg-white/10 hover:bg-red-600 transition-colors border border-white/20 rounded-full font-bold">
                {city}
              </span>
            ))}
            <span className="px-6 py-3 bg-white/5 border border-white/10 rounded-full font-medium text-slate-400">
              + All other districts
            </span>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-red-600 p-8 text-white text-center">
              <h2 className="text-3xl font-black mb-2">Apply Now</h2>
              <p className="text-red-100">Take the first step towards a rewarding career</p>
            </div>
            
            <div className="p-8 md:p-12">
              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
                <div 
                  className="absolute left-0 top-1/2 h-1 bg-red-600 -z-10 transform -translate-y-1/2 transition-all duration-300"
                  style={{ width: `${((formStep - 1) / 2) * 100}%` }}
                ></div>
                
                {[1, 2, 3].map(step => (
                  <div 
                    key={step} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${formStep >= step ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                  >
                    {step}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {formStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Personal Details</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Full Name *</label>
                          <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="Enter your full name" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Email ID *</label>
                          <input required type="email" name="emailId" value={formData.emailId} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="Enter your email" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Mobile Number *</label>
                          <input required type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="10-digit number" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp Number *</label>
                          <input required type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="10-digit number" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">District *</label>
                          <input required type="text" name="district" value={formData.district} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="e.g. Raipur" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">City/Village *</label>
                          <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="Your location" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {formStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Professional Background</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Age *</label>
                          <input required type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all" placeholder="Your age" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Education *</label>
                          <select required name="education" value={formData.education} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all">
                            <option value="">Select highest qualification</option>
                            <option value="10th">10th Pass</option>
                            <option value="12th">12th Pass</option>
                            <option value="graduate">Graduate</option>
                            <option value="postgraduate">Post Graduate</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Previous Experience *</label>
                        <select required name="experience" value={formData.experience} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all">
                          <option value="">Select experience level</option>
                          <option value="fresher">Fresher</option>
                          <option value="1-2_years">1-2 Years (Sales/Marketing)</option>
                          <option value="3-5_years">3-5 Years (Sales/Marketing)</option>
                          <option value="5+_years">5+ Years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Do you have a personal vehicle? *</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 p-4 border border-slate-200 rounded-xl cursor-pointer flex-1 hover:bg-slate-50 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 transition-colors">
                            <input type="radio" name="vehicleAvailable" value="Yes" checked={formData.vehicleAvailable === 'Yes'} onChange={handleInputChange} className="accent-red-600 w-4 h-4" />
                            <span className="font-medium text-slate-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 p-4 border border-slate-200 rounded-xl cursor-pointer flex-1 hover:bg-slate-50 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 transition-colors">
                            <input type="radio" name="vehicleAvailable" value="No" checked={formData.vehicleAvailable === 'No'} onChange={handleInputChange} className="accent-red-600 w-4 h-4" />
                            <span className="font-medium text-slate-700">No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {formStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Final Step</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Why do you want to join KKT News? *</label>
                        <textarea required name="reasonToJoin" value={formData.reasonToJoin} onChange={handleInputChange} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all resize-none" placeholder="Tell us briefly about your motivation..." />
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                        <FileText className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-blue-900 text-sm">Upload ID Card *</h4>
                          <p className="text-blue-700 text-xs mt-1 mb-2">Upload a valid ID card (Aadhaar Card is accepted) for verification.</p>
                          <input required type="file" accept="image/*,.pdf" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                        <Camera className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm">Passport Size Photo *</h4>
                          <p className="text-amber-700 text-xs mt-1 mb-2">Upload a professional passport size photo. This is mandatory for your application.</p>
                          <input required type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                  {formStep > 1 && (
                    <button type="button" onClick={handlePrevStep} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                      Back
                    </button>
                  )}
                  
                  {formStep < 3 ? (
                    <button type="button" onClick={handleNextStep} className="flex-1 bg-slate-900 text-white rounded-xl font-bold py-3 hover:bg-slate-800 transition-colors">
                      Next Step
                    </button>
                  ) : (
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-red-600 text-white rounded-xl font-bold py-3 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><ChevronRight size={18} /> Submit Application</>}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Become Part Of The Future Of Local Media</h2>
          <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto">
            Join KKT News and help businesses grow while building your own successful career in Chhattisgarh.
          </p>
          <a href="#apply" className="inline-block px-10 py-5 bg-white text-red-600 hover:bg-slate-100 rounded-xl font-black text-xl transition-all shadow-xl hover:scale-105 active:scale-95">
            Start Your Journey Today
          </a>
        </div>
      </section>

    </div>
  );
};

export default JoinUs;
