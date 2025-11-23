export enum DocType {
  INVOICE = 'INVOICE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  QUOTE = 'QUOTE',
  OTHER = 'OTHER'
}

export interface ExtractedData {
  id: string;
  fileName: string;
  senderName: string;
  senderEmail: string;
  type: DocType;
  amount: number;
  currency: string;
  processedAt: string;
  summary: string;
}

export interface ProcessingStats {
  total: number;
  invoices: number;
  pos: number;
  quotes: number;
  totalValue: number;
}

export interface ConfigState {
  targetEmails: string[]; // List of sender emails to watch
  processInvoices: boolean;
  processPOs: boolean;
  processQuotes: boolean;
  gmailSyncEnabled: boolean; // Status of Gmail synchronization
  autoDownload: boolean; // Whether to automatically download the PDF upon successful matching
}