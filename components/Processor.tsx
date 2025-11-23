import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download, Filter, X, Trash2 } from 'lucide-react';
import { analyzeDocument, fileToBase64 } from '../services/geminiService';
import { DocType, ExtractedData, ConfigState } from '../types';
import { exportToExcel } from '../services/excelService';

interface ProcessorProps {
  config: ConfigState;
  processedIds: Set<string>;
  onProcessComplete: (data: ExtractedData) => void;
  history: ExtractedData[];
  onDelete: (id: string) => void;
}

const Processor: React.FC<ProcessorProps> = ({ config, processedIds, onProcessComplete, history, onDelete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter State
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSender, setFilterSender] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const downloadFile = (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 0. Check Gmail Sync Status (Mock logic: if disabled, warn user but allow manual for demo)
    if (!config.gmailSyncEnabled) {
       // In a real app, this might prevent automated fetching, but manual upload is usually always allowed.
       // We will just add a console log or non-blocking check here.
       console.warn("Gmail sync is disabled, but manual upload is permitted.");
    }

    // 1. Check duplication
    const fileId = `${file.name}-${file.size}`;
    if (processedIds.has(fileId)) {
      setError(`File "${file.name}" has already been processed.`);
      setSuccessMsg(null);
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsProcessing(true);
    setCurrentFile(file.name);

    try {
      const base64 = await fileToBase64(file);
      const analysis = await analyzeDocument(base64, file.type, file.name);

      if (analysis) {
        // Check Config Filtering
        const isAllowedType = 
          (analysis.type === DocType.INVOICE && config.processInvoices) ||
          (analysis.type === DocType.PURCHASE_ORDER && config.processPOs) ||
          (analysis.type === DocType.QUOTE && config.processQuotes);

        const isAllowedSender = config.targetEmails.length === 0 || 
          config.targetEmails.some(email => analysis.senderEmail?.toLowerCase().includes(email.toLowerCase()));

        if (isAllowedType && isAllowedSender) {
          const newData: ExtractedData = {
            id: fileId,
            fileName: file.name,
            processedAt: new Date().toISOString(),
            type: analysis.type || DocType.OTHER,
            senderName: analysis.senderName || 'Unknown',
            senderEmail: analysis.senderEmail || 'Unknown',
            amount: analysis.amount || 0,
            currency: analysis.currency || 'INR',
            summary: analysis.summary || '',
          };
          onProcessComplete(newData);
          
          let msg = "Document processed successfully.";
          
          // 2. Auto Download Logic
          if (config.autoDownload) {
            downloadFile(file);
            msg += " Auto-downloaded to disk.";
          }
          
          setSuccessMsg(msg);
        } else {
          setError("Document skipped based on configuration filters (Type or Sender).");
        }
      } else {
        setError("Could not analyze document.");
      }
    } catch (err) {
      setError("Error processing file with Gemini.");
      console.error(err);
    } finally {
      setIsProcessing(false);
      setCurrentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtering Logic
  const uniqueSenders = useMemo(() => {
    return Array.from(new Set(history.map(h => h.senderName))).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesType = filterType === 'ALL' || item.type === filterType;
      const matchesSender = filterSender === 'ALL' || item.senderName === filterSender;
      
      let matchesDate = true;
      const itemDate = new Date(item.processedAt);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) matchesDate = false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) matchesDate = false;
      }

      return matchesType && matchesSender && matchesDate;
    });
  }, [history, filterType, filterSender, startDate, endDate]);

  const handleExport = () => {
    exportToExcel(filteredHistory);
  };

  const clearFilters = () => {
    setFilterType('ALL');
    setFilterSender('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = filterType !== 'ALL' || filterSender !== 'ALL' || startDate !== '' || endDate !== '';

  return (
    <div className="space-y-6">
      {/* Action Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Document Processor
        </h2>
        
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
           <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="application/pdf,image/jpeg,image/png"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center gap-3"
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            ) : (
              <Upload className="w-12 h-12 text-slate-400" />
            )}
            
            <div className="text-slate-600">
              {isProcessing ? (
                <span>Analyzing {currentFile}...</span>
              ) : (
                <>
                  <span className="font-medium text-blue-600 hover:text-blue-700">Click to upload</span>
                  <span> or drag and drop</span>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Invoices, POs, Quotes)</p>
                </>
              )}
            </div>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {successMsg && (
           <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4" />
            {successMsg}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-medium text-slate-700">Extracted Data</h3>
          <button 
            onClick={handleExport}
            disabled={filteredHistory.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>

        {/* Filters */}
        {history.length > 0 && (
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Type</label>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Types</option>
                    <option value={DocType.INVOICE}>Invoices</option>
                    <option value={DocType.PURCHASE_ORDER}>Purchase Orders</option>
                    <option value={DocType.QUOTE}>Quotes</option>
                    <option value={DocType.OTHER}>Other</option>
                  </select>
                </div>

                {/* Sender Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Sender</label>
                  <select 
                    value={filterSender}
                    onChange={(e) => setFilterSender(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Senders</option>
                    {uniqueSenders.map(sender => (
                      <option key={sender} value={sender}>{sender}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">From</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">To</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="mb-[2px] text-sm text-red-600 hover:text-red-800 flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-100 whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Sender</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center gap-2">
                      {history.length > 0 ? (
                        <>
                          <Filter className="w-8 h-8 text-slate-300" />
                          <p>No documents match the selected filters</p>
                        </>
                      ) : (
                        <>
                          <FileText className="w-8 h-8 text-slate-300" />
                          <p>No documents processed yet</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${item.type === DocType.INVOICE ? 'bg-purple-100 text-purple-800' : 
                          item.type === DocType.PURCHASE_ORDER ? 'bg-blue-100 text-blue-800' : 
                          item.type === DocType.QUOTE ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{item.senderName}</div>
                      <div className="text-xs text-slate-500">{item.senderEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {item.amount.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">
                      {item.fileName}
                    </td>
                     <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" /> Processed
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Processor;