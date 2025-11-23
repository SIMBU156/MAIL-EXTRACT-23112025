import * as XLSX from 'xlsx';
import { ExtractedData } from '../types';

export const exportToExcel = (data: ExtractedData[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
    "Document ID": item.id,
    "Type": item.type,
    "Sender Name": item.senderName,
    "Sender Email": item.senderEmail,
    "File Name": item.fileName,
    "Amount": item.amount,
    "Currency": item.currency,
    "Summary": item.summary,
    "Processed Date": new Date(item.processedAt).toLocaleString(),
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");
  
  // Auto-width columns (heuristic)
  const wscols = [
    { wch: 20 }, // ID
    { wch: 15 }, // Type
    { wch: 25 }, // Sender
    { wch: 25 }, // Email
    { wch: 30 }, // File
    { wch: 15 }, // Amount
    { wch: 10 }, // Currency
    { wch: 40 }, // Summary
    { wch: 25 }, // Date
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, "Smart_Invoice_Extractor_Data.xlsx");
};
