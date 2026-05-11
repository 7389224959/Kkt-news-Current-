import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Footer from './components/Footer';
import Ticker from './components/Ticker';
import TrendingKeywords from './components/TrendingKeywords';
import ErrorBoundary from './components/ErrorBoundary';

import { AppProvider } from './context/AppContext';

const Home = lazy(() => import('./pages/Home'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const Admin = lazy(() => import('./pages/Admin'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
  </div>
);

// Placeholder components for routes not fully implemented yet
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
    <h1 className="text-3xl font-bold text-slate-900 mb-4">{title}</h1>
    <p className="text-gray-600 max-w-md">This section is currently under development. Please check back later for updates.</p>
    <a href="/" className="mt-6 text-red-600 font-bold hover:underline">Back to Home</a>
  </div>
);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <AppProvider>
        <Router>
          <div className="flex flex-col min-h-screen font-sans">
            <Header />
            <Ticker />
            <TrendingKeywords />
            <main className="flex-grow">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/article/:slug" element={<ArticleDetail />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/category/:category" element={<Home />} /> {/* Reusing Home for category view simplified */}
                    
                    {/* Placeholders for specific requests */}
                    <Route path="/rti" element={<PlaceholderPage title="RTI Drafting Help" />} />
                    <Route path="/complaint" element={<PlaceholderPage title="File a Complaint" />} />
                    <Route path="/membership" element={<PlaceholderPage title="Membership Plans" />} />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </Router>
      </AppProvider>
    </HelmetProvider>
  );
};

export default App;
