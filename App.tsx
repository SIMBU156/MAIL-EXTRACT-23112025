import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Settings, PieChart, Key } from 'lucide-react';
import Processor from './components/Processor';
import Configuration from './components/Configuration';
import { ConfigState, ExtractedData, ProcessingStats, DocType } from './types';
import { GoogleGenAI } from '@google/genai';

// Mock Storage Keys
const CONFIG_KEY = 'app_config';
const HISTORY_KEY = 'app_history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  
  // State
  const [config, setConfig] = useState<ConfigState>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : {
      targetEmails: [],
      processInvoices: true,
      processPOs: true,
      processQuotes: true,
      gmailSyncEnabled: true,
      autoDownload: true,
    };
  });

  const [history, setHistory] = useState<ExtractedData[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const processedIds = useMemo(() => new Set(history.map(h => h.id)), [history]);

  // Persist
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const handleProcessComplete = (data: ExtractedData) => {
    setHistory(prev => [data, ...prev]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  // Stats calculation
  const stats: ProcessingStats = useMemo(() => {
    return history.reduce((acc, item) => ({
      total: acc.total + 1,
      invoices: item.type === DocType.INVOICE ? acc.invoices + 1 : acc.invoices,
      pos: item.type === DocType.PURCHASE_ORDER ? acc.pos + 1 : acc.pos,
      quotes: item.type === DocType.QUOTE ? acc.quotes + 1 : acc.quotes,
      totalValue: acc.totalValue + (item.amount || 0),
    }), { total: 0, invoices: 0, pos: 0, quotes: 0, totalValue: 0 });
  }, [history]);

  const apiKey = process.env.API_KEY;
  const hasApiKey = !!apiKey;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full flex flex-col z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">IE</span>
             InvoiceEx
          </h1>
          <p className="text-xs text-slate-400 mt-1">Chrome Extension Hub</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'settings' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configuration
          </button>
        </nav>

        {!hasApiKey && (
          <div className="p-4 m-4 bg-red-50 border border-red-100 rounded-lg">
             <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="text-xs text-red-700">
                  <p className="font-semibold">API Key Missing</p>
                  <p className="mt-1">Please ensure <code>process.env.API_KEY</code> is set to use Gemini.</p>
                </div>
             </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-2">
             <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">U</div>
             <div className="text-sm">
                <div className="font-medium text-slate-700">User</div>
                <div className={`text-xs flex items-center gap-1 ${config.gmailSyncEnabled ? 'text-green-600' : 'text-red-600'}`}>
                   <div className={`w-2 h-2 rounded-full ${config.gmailSyncEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                   {config.gmailSyncEnabled ? 'Gmail Synced' : 'Sync Paused'}
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Processing Dashboard' : 'System Configuration'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'dashboard' 
                ? 'Monitor extractions and manage downloads' 
                : 'Manage target emails and document types'
              }
            </p>
          </div>
          <div className="flex gap-4">
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Value</p>
                    <p className="text-lg font-mono font-semibold text-slate-800">₹{stats.totalValue.toLocaleString()}</p>
                 </div>
                 <PieChart className="w-8 h-8 text-blue-500" />
              </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <Processor 
                  config={config} 
                  processedIds={processedIds} 
                  onProcessComplete={handleProcessComplete}
                  history={history}
                  onDelete={handleDeleteHistoryItem}
               />
            </div>
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Stats Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Invoices</span>
                    <span className="font-semibold text-slate-900">{stats.invoices}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Purchase Orders</span>
                    <span className="font-semibold text-slate-900">{stats.pos}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Quotes</span>
                    <span className="font-semibold text-slate-900">{stats.quotes}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                     <span className="text-sm font-medium text-slate-700">Total Docs</span>
                     <span className="text-xl font-bold text-blue-600">{stats.total}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                   <li>Connects to Gmail (Simulated)</li>
                   <li>Gemini AI scans attachments</li>
                   <li>Extracts Amount, Sender, Type</li>
                   <li>Filters duplicates automatically</li>
                   <li>Exports organized Excel sheet</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
             <Configuration config={config} setConfig={setConfig} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;