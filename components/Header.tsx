import React, { useState } from 'react';
import { Menu, X, Search, Bell, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_LINKS } from '../constants';
import { useApp } from '../context/AppContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { settings } = useApp();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b-4 border-red-600">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center gap-2">
            <button 
              className="lg:hidden p-1 hover:bg-slate-800 rounded transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-red-600 w-10 h-10 flex items-center justify-center font-bold text-xl rounded shadow-md group-hover:bg-red-500 transition-colors">
                KKT
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight">{settings.appName}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">News Network</span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.path}
                to={link.path}
                className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-red-500 ${
                  isActive(link.path) ? 'text-red-500 underline underline-offset-8 decoration-2' : 'text-gray-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors text-gray-300 hover:text-white" title="Search">
              <Search size={20} />
            </button>
            <Link to="/membership" className="hidden sm:flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-colors shadow-sm">
              Join Us
            </Link>
            <button className="p-2 hover:bg-slate-800 rounded-full transition-colors relative text-gray-300 hover:text-white">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <Link to="/admin" className="p-2 hover:bg-slate-800 rounded-full transition-colors text-gray-300 hover:text-white" title="Admin">
              <User size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-slate-800 border-t border-slate-700 shadow-2xl animate-in slide-in-from-top duration-300 max-h-[calc(100vh-64px)] overflow-y-auto">
          <nav className="flex flex-col p-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.path}
                to={link.path}
                className={`block py-3 px-4 rounded-lg font-bold uppercase tracking-wide transition-all ${
                  isActive(link.path) ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-700 space-y-3">
              <Link 
                to="/membership" 
                className="block py-3 text-center bg-red-600 rounded-lg text-white font-bold uppercase tracking-widest shadow-lg" 
                onClick={() => setIsMenuOpen(false)}
              >
                Join Us
              </Link>
              <Link 
                to="/rti" 
                className="block py-3 text-center bg-slate-700 rounded-lg text-white font-bold uppercase tracking-widest border border-slate-600" 
                onClick={() => setIsMenuOpen(false)}
              >
                Submit Tip or Complaint
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
