import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Lock, Globe, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Footer: React.FC = () => {
  const { settings } = useApp();

  return (
    <footer className="bg-bhaskar-dark text-gray-400 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & Mission */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-sm font-bold text-2xl shadow-md">
                KKT
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                {settings.appName}
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              {settings.description}
            </p>
            <div className="flex gap-5">
              {settings.socials.facebook && <a href={settings.socials.facebook} className="text-gray-500 hover:text-red-500 transition-all"><Facebook size={22} /></a>}
              {settings.socials.twitter && <a href={settings.socials.twitter} className="text-gray-500 hover:text-red-500 transition-all"><Twitter size={22} /></a>}
              {settings.socials.instagram && <a href={settings.socials.instagram} className="text-gray-500 hover:text-red-500 transition-all"><Instagram size={22} /></a>}
              {settings.socials.youtube && <a href={settings.socials.youtube} className="text-gray-500 hover:text-red-500 transition-all"><Youtube size={22} /></a>}
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 uppercase tracking-wider border-b-2 border-red-600 pb-2 inline-block">उपयोगी लिंक</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><a href="#" className="hover:text-red-500 transition-colors">हमारे बारे में</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">संपादकीय टीम</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">आचार संहिता</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">विज्ञापन दें</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">गोपनीयता नीति</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 uppercase tracking-wider border-b-2 border-red-600 pb-2 inline-block">न्यूज़ सेक्शन</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link to="/category/state" className="hover:text-red-500 transition-colors">राज्य समाचार</Link></li>
              <li><Link to="/category/politics" className="hover:text-red-500 transition-colors">राजनीति</Link></li>
              <li><Link to="/category/crime" className="hover:text-red-500 transition-colors">क्राइम फाइल</Link></li>
              <li><Link to="/rti" className="hover:text-red-500 transition-colors">RTI & लीगल</Link></li>
              <li><Link to="/category/jobs" className="hover:text-red-500 transition-colors">नौकरी और शिक्षा</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 uppercase tracking-wider border-b-2 border-red-600 pb-2 inline-block">संपर्क करें</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-red-600 shrink-0 mt-0.5" />
                <span className="text-gray-400">{settings.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-red-600 shrink-0" />
                <span className="text-gray-400">{settings.contactPhone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-red-600 shrink-0" />
                <span className="text-gray-400">{settings.contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-gray-500">
            <span className="flex items-center gap-1"><Globe size={14} /> HINDI</span>
            <span className="flex items-center gap-1"><ShieldCheck size={14} /> VERIFIED</span>
          </div>
          
          <p className="text-xs text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} {settings.appName}. सर्वाधिकार सुरक्षित।
          </p>

          <Link to="/admin" className="flex items-center gap-1.5 text-gray-600 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest">
            <Lock size={14} /> एडमिन लॉगिन
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
