import React, { useState } from 'react';
import { ConfigState } from '../types';
import { Settings, Plus, Trash2, Mail, DownloadCloud } from 'lucide-react';

interface ConfigurationProps {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
}

const Configuration: React.FC<ConfigurationProps> = ({ config, setConfig }) => {
  const [newEmail, setNewEmail] = useState('');

  const addEmail = () => {
    if (newEmail && !config.targetEmails.includes(newEmail)) {
      setConfig(prev => ({
        ...prev,
        targetEmails: [...prev.targetEmails, newEmail]
      }));
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      targetEmails: prev.targetEmails.filter(e => e !== email)
    }));
  };

  const toggle = (key: keyof ConfigState) => {
    // We need to cast key to string for dynamic access or handle specifically
    // Typescript doesn't like keyof ConfigState directly for boolean properties mixed with arrays
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    } as ConfigState));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-800">Configuration</h2>
      </div>

      {/* Global Settings */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">General Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${config.gmailSyncEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-medium text-slate-900">Gmail Synchronization</span>
                <span className="text-xs text-slate-500">Automatically scan incoming emails</span>
              </div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.gmailSyncEnabled} 
                onChange={() => toggle('gmailSyncEnabled')}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
             <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${config.autoDownload ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-medium text-slate-900">Auto-Download PDFs</span>
                <span className="text-xs text-slate-500">Automatically save valid invoices/POs to disk</span>
              </div>
            </div>
             <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.autoDownload} 
                onChange={() => toggle('autoDownload')}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Document Types */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">Document Types to Extract</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input 
              type="checkbox" 
              checked={config.processInvoices} 
              onChange={() => toggle('processInvoices')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-slate-700">Invoices</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input 
              type="checkbox" 
              checked={config.processPOs} 
              onChange={() => toggle('processPOs')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-slate-700">Purchase Orders</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input 
              type="checkbox" 
              checked={config.processQuotes} 
              onChange={() => toggle('processQuotes')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-slate-700">Quotes / Estimates</span>
          </label>
        </div>
      </div>

      {/* Email Filters */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Target Sender Emails (Optional)
          <span className="block text-xs font-normal text-slate-500 mt-1">
            Only process documents from these addresses. Leave empty to allow all.
          </span>
        </h3>
        
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="vendor@example.com"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={addEmail}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {config.targetEmails.map(email => (
            <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-100 text-sm">
              <span className="text-slate-700">{email}</span>
              <button 
                onClick={() => removeEmail(email)}
                className="text-slate-400 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {config.targetEmails.length === 0 && (
            <div className="text-sm text-slate-400 italic p-2">No filters active (Processing all)</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuration;