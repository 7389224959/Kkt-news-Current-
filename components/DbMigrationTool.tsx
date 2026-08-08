import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database, Download, Upload, Copy, Check, RefreshCw, AlertTriangle, ShieldCheck, FileJson, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';
import { SiteSettings } from '../types';

interface DbMigrationToolProps {
  currentSettings?: SiteSettings | null;
  onRefreshSettings?: () => void;
}

export const DbMigrationTool: React.FC<DbMigrationToolProps> = ({ currentSettings, onRefreshSettings }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [oldUrl, setOldUrl] = useState('');
  const [oldKey, setOldKey] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');

  const fullSqlSchema = `-- ========================================================
-- KHABAR KAL TAK (KKT NEWS) - COMPLETE SUPABASE SCHEMA
-- Execute this script in your NEW Supabase SQL Editor
-- ========================================================

-- 1. Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT,
  image TEXT,
  "featuredCollageImage" TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  excerpt TEXT,
  date TEXT,
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "sourceUrl" TEXT,
  "isBreaking" BOOLEAN DEFAULT false,
  "isTrending" BOOLEAN DEFAULT false,
  "isFeatured" BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  "initialLikes" INTEGER DEFAULT 0,
  tags TEXT[],
  "imageCaption" TEXT,
  "seoTitle" TEXT,
  "metaDescription" TEXT,
  "facebookCaption" TEXT
);

-- 2. Breaking News Table
CREATE TABLE IF NOT EXISTS breaking_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trending Keywords Table
CREATE TABLE IF NOT EXISTS trending_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  article_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Site Settings Table (Contains Reel & Viral Templates)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "appName" TEXT,
  tagline TEXT,
  description TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  address TEXT,
  socials JSONB,
  "tickerSpeed" INTEGER,
  "reelTemplates" JSONB,
  "viralTemplates" JSONB,
  "adminPhoto" TEXT,
  "adminDesignation" TEXT,
  "autoTemplateIndex" INTEGER,
  "autoReelTemplateIndex" INTEGER,
  "anchorSettings" JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  password TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo TEXT,
  designation TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  mobile TEXT
);

-- 6. Worker Tasks Table
CREATE TABLE IF NOT EXISTS worker_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reward TEXT,
  deadline TEXT,
  "assignedTo" TEXT
);

-- 7. Worker Assets Table
CREATE TABLE IF NOT EXISTS worker_assets (
  id TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  deal_value NUMERIC,
  payment_status TEXT,
  payment_method TEXT,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  whatsapp_number TEXT,
  district TEXT,
  city TEXT,
  age INTEGER,
  education TEXT,
  experience TEXT,
  vehicle_available TEXT,
  reason_to_join TEXT,
  id_card_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security (RLS) for direct REST access
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE breaking_news DISABLE ROW LEVEL SECURITY;
ALTER TABLE trending_keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
`;

  const copySql = () => {
    navigator.clipboard.writeText(fullSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const exportCurrentData = async () => {
    try {
      setMigrationStatus("Fetching current database records...");
      setErrorStatus(null);
      const dataBackup: Record<string, any> = {};

      const tables = [
        'site_settings',
        'articles',
        'breaking_news',
        'trending_keywords',
        'workers',
        'worker_tasks',
        'worker_assets',
        'clients',
        'job_applications'
      ];

      for (const t of tables) {
        if (!supabase) continue;
        const { data, error } = await supabase.from(t).select('*');
        if (!error && data) {
          dataBackup[t] = data;
        } else {
          dataBackup[t] = [];
        }
      }

      // If site_settings was empty or null, include current in-memory settings
      if ((!dataBackup.site_settings || dataBackup.site_settings.length === 0) && currentSettings) {
        dataBackup.site_settings = [currentSettings];
      }

      const jsonString = JSON.stringify(dataBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kkt_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMigrationStatus("Data exported successfully! Keep this backup file safe.");
    } catch (e: any) {
      setErrorStatus("Failed to export data: " + e.message);
    }
  };

  const importDataFromJson = async (dataToImport: any) => {
    if (!supabase) {
      throw new Error("Supabase client is not connected. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    setMigrationStatus("Starting data import to current database...");
    setErrorStatus(null);
    setIsMigrating(true);

    try {
      const tables = [
        'site_settings',
        'articles',
        'breaking_news',
        'trending_keywords',
        'workers',
        'worker_tasks',
        'worker_assets',
        'clients',
        'job_applications'
      ];

      for (const table of tables) {
        const rows = dataToImport[table];
        if (Array.isArray(rows) && rows.length > 0) {
          setMigrationStatus(`Importing ${rows.length} records into '${table}'...`);
          const chunkSize = 25;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const { error } = await supabase.from(table).upsert(chunk);
            if (error) {
              console.warn(`Error importing into ${table}:`, error.message);
            }
          }
        }
      }

      setMigrationStatus("All tables, Reel Templates & Viral Templates imported successfully!");
      if (onRefreshSettings) onRefreshSettings();
    } catch (e: any) {
      setErrorStatus("Import error: " + e.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        await importDataFromJson(parsed);
      } catch (err: any) {
        setErrorStatus("Invalid JSON file format: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = async () => {
    if (!jsonInput.trim()) {
      setErrorStatus("Please paste JSON backup text before importing.");
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      await importDataFromJson(parsed);
    } catch (err: any) {
      setErrorStatus("Invalid JSON string: " + err.message);
    }
  };

  const fetchDirectFromOldSupabase = async () => {
    if (!oldUrl || !oldKey) {
      setErrorStatus("Please enter both Old Supabase URL and Old Anon Key.");
      return;
    }

    setIsMigrating(true);
    setMigrationStatus("Connecting to Old Supabase project...");
    setErrorStatus(null);

    try {
      const oldClient = createClient(oldUrl, oldKey);
      const tables = [
        'site_settings',
        'articles',
        'breaking_news',
        'trending_keywords',
        'workers',
        'worker_tasks',
        'worker_assets',
        'clients',
        'job_applications'
      ];

      const backup: Record<string, any> = {};

      for (const table of tables) {
        setMigrationStatus(`Fetching '${table}' from Old Supabase...`);
        const { data, error } = await oldClient.from(table).select('*');
        if (error) {
          console.warn(`Could not fetch '${table}' from old Supabase:`, error.message);
          backup[table] = [];
        } else {
          backup[table] = data || [];
        }
      }

      setMigrationStatus("Transferring templates & records to New Supabase...");
      await importDataFromJson(backup);
    } catch (e: any) {
      setErrorStatus("Direct transfer error: " + e.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-3 bg-red-100 rounded-lg text-red-600">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Supabase Project Migration Tool</h2>
          <p className="text-sm text-slate-500">
            Transfer all tables, Auto Reel Templates, Auto Viral Templates & data from restricted project to your new Supabase project.
          </p>
        </div>
      </div>

      {migrationStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{migrationStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm font-medium">{errorStatus}</span>
        </div>
      )}

      {/* Step 1: SQL Schema Execution */}
      <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="bg-red-600 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            <h3 className="font-bold text-slate-800">Step 1: Create Tables in New Supabase Project</h3>
          </div>
          <button
            onClick={copySql}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition shadow-sm text-sm"
          >
            {copiedSql ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'SQL Script Copied!' : 'Copy SQL Schema Script'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Go to your <strong>New Supabase Dashboard</strong> &rarr; <strong>SQL Editor</strong> &rarr; Click <strong>New Query</strong>, paste the copied script and click <strong>Run</strong>. This will create all 9 required tables (including <code>site_settings</code> for Reel & Viral Templates).
        </p>
      </div>

      {/* Step 2: Update Environment Variables */}
      <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-3">
        <div className="flex items-center space-x-2">
          <span className="bg-red-600 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
          <h3 className="font-bold text-slate-800">Step 2: Update Supabase Credentials in .env</h3>
        </div>
        <p className="text-xs text-slate-600">
          Update your project’s <code>.env</code> file with the new project credentials from Supabase Dashboard &rarr; Settings &rarr; API:
        </p>
        <div className="bg-slate-900 text-emerald-400 p-3 rounded-md font-mono text-xs overflow-x-auto">
          VITE_SUPABASE_URL=https://your-new-project-id.supabase.co<br />
          VITE_SUPABASE_ANON_KEY=your-new-anon-key
        </div>
      </div>

      {/* Step 3: Migration Methods */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="bg-red-600 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
          <h3 className="font-bold text-slate-800">Step 3: Transfer Data & Templates (Reel & Viral Templates)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method A: Export/Backup Current Data */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-red-300 transition space-y-4 bg-white shadow-sm">
            <div className="flex items-center space-x-2 text-red-600 font-semibold">
              <Download className="w-5 h-5" />
              <h4>Export Current Data / Templates to JSON</h4>
            </div>
            <p className="text-xs text-slate-500">
              Download a full backup JSON file containing all Auto Reel Templates, Auto Viral Templates, Articles, and Site Settings.
            </p>
            <button
              onClick={exportCurrentData}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 transition text-sm flex items-center justify-center space-x-2"
            >
              <FileJson className="w-4 h-4" />
              <span>Download Backup JSON</span>
            </button>
          </div>

          {/* Method B: Import/Restore Data JSON */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-red-300 transition space-y-4 bg-white shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-600 font-semibold">
              <Upload className="w-5 h-5" />
              <h4>Restore Data / Templates from JSON File</h4>
            </div>
            <p className="text-xs text-slate-500">
              Upload a previously exported <code>.json</code> backup file to populate the new database.
            </p>
            <label className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition text-sm flex items-center justify-center space-x-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Backup JSON File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Method C: Fetch directly from old Supabase API */}
        <div className="border border-slate-200 rounded-xl p-5 bg-amber-50/50 space-y-4 mt-4">
          <div className="flex items-center space-x-2 text-amber-700 font-semibold">
            <RefreshCw className="w-5 h-5" />
            <h4>Fetch Data Directly from Old Supabase (if API is still accessible)</h4>
          </div>
          <p className="text-xs text-amber-800">
            If your old Supabase project API is still reachable with its old keys, enter them below to automatically copy all tables and templates to the new project.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Old Supabase URL (https://xxxx.supabase.co)"
              value={oldUrl}
              onChange={(e) => setOldUrl(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Old Supabase Anon Key"
              value={oldKey}
              onChange={(e) => setOldKey(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={fetchDirectFromOldSupabase}
            disabled={isMigrating}
            className="bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Transfer from Old Supabase to New Supabase</span>
          </button>
        </div>

        {/* Method D: Paste JSON directly */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Optionally Paste Backup JSON Content</h4>
          <textarea
            rows={4}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste your {"site_settings": [...], "articles": [...]} JSON content here...'
            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={handlePasteImport}
            disabled={isMigrating}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-slate-900 transition flex items-center space-x-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Pasted JSON Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DbMigrationTool;
