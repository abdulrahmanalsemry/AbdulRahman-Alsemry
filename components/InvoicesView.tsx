import React, { useState, useMemo, useRef } from 'react';
import { Invoice, InvoiceStatus, PaymentRecord, RecurringFrequency, Client, Salesperson, Quote, PaymentProof } from '../types';
import { 
  Receipt, Calendar, CreditCard, ExternalLink, Clock, Plus, 
  History, DollarSign, RefreshCw, X, CheckCircle, AlertCircle,
  Repeat, CalendarDays, ArrowRight, Filter, FilterX, FileDown,
  Paperclip, ImageIcon, Upload, FileText as FileIcon, Trash2,
  Maximize2, Download as DownloadIcon, Info
} from 'lucide-react';

interface Props {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  clients: Client[];
  team: Salesperson[];
  quotes: Quote[];
  letterhead?: string | null;
  formatMoney: (val: number, currencyCode?: string) => string;
  bankDetails: string;
}

const InvoicesView: React.FC<Props> = ({ invoices, setInvoices, clients, team, quotes, letterhead, formatMoney, bankDetails }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PaymentProof | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [dateStartFilter, setDateStartFilter] = useState<string>('');
  const [dateEndFilter, setDateEndFilter] = useState<string>('');

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');
  const [uploadedProofs, setUploadedProofs] = useState<PaymentProof[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('Monthly');
  const [endDate, setEndDate] = useState<string>('');

  const calculatePaidAmount = (invoice: Invoice) => {
    return (invoice.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateBalance = (invoice: Invoice) => {
    return Math.max(0, invoice.totalAmount - calculatePaidAmount(invoice));
  };

  const filteredInvoicesList = useMemo(() => {
    return invoices.filter(inv => {
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchClient = clientFilter === 'all' || inv.clientId === clientFilter;
      let matchSalesperson = true;
      if (salespersonFilter !== 'all') {
        const associatedQuote = quotes.find(q => q.id === inv.quoteId);
        matchSalesperson = associatedQuote?.salespersonId === salespersonFilter;
      }
      const matchStart = !dateStartFilter || inv.date >= dateStartFilter;
      const matchEnd = !dateEndFilter || inv.date <= dateEndFilter;
      return matchStatus && matchClient && matchSalesperson && matchStart && matchEnd;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [invoices, statusFilter, clientFilter, salespersonFilter, dateStartFilter, dateEndFilter, quotes]);

  const clearFilters = () => {
    setStatusFilter('all');
    setClientFilter('all');
    setSalespersonFilter('all');
    setDateStartFilter('');
    setDateEndFilter('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newProof: PaymentProof = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          url,
          type: file.type.startsWith('image/') ? 'image' : 'document'
        };
        setUploadedProofs(prev => [...prev, newProof]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedProof = (id: string) => {
    setUploadedProofs(prev => prev.filter(p => p.id !== id));
  };

  const handleRecordPayment = () => {
    if (!selectedInvoice || paymentAmount <= 0) return;
    const newPayment: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      amount: paymentAmount,
      paymentDate,
      paymentMethod,
      proofUrl: paymentProofUrl,
      proofFiles: [...uploadedProofs]
    };
    setInvoices(prev => prev.map(inv => {
      if (inv.id === selectedInvoice.id) {
        const updatedHistory = [...(inv.paymentHistory || []), newPayment];
        const totalPaid = updatedHistory.reduce((s, p) => s + p.amount, 0);
        let newStatus = InvoiceStatus.UNPAID;
        if (totalPaid >= inv.totalAmount) newStatus = InvoiceStatus.PAID;
        else if (totalPaid > 0) newStatus = InvoiceStatus.PARTIAL;
        return { ...inv, paymentHistory: updatedHistory, status: newStatus };
      }
      return inv;
    }));
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
    setPaymentProofUrl('');
    setUploadedProofs([]);
  };

  const handleSetupRecurring = () => {
    if (!selectedInvoice) return;
    setInvoices(prev => prev.map(inv => {
      if (inv.id === selectedInvoice.id) {
        return { ...inv, isRecurring, recurringFrequency: frequency, recurringEndDate: endDate };
      }
      return inv;
    }));
    setShowRecurringModal(false);
    setSelectedInvoice(null);
  };

  const syncRecurringInvoices = () => {
    const today = new Date();
    const newInvoices: Invoice[] = [];
    invoices.filter(inv => inv.isRecurring).forEach(parent => {
      const lastDate = new Date(parent.lastGeneratedDate || parent.date);
      const nextDate = new Date(lastDate);
      if (parent.recurringFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (parent.recurringFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (parent.recurringFrequency === 'Annual') nextDate.setFullYear(nextDate.getFullYear() + 1);

      if (nextDate <= today && (!parent.recurringEndDate || new Date(parent.recurringEndDate) >= nextDate)) {
        const newInv: Invoice = {
          ...parent,
          id: Math.random().toString(36).substr(2, 9),
          invoiceNumber: `INV-${parent.invoiceNumber.split('-')[1]}-${Math.floor(Math.random() * 900 + 100)}`,
          date: nextDate.toISOString().split('T')[0],
          dueDate: new Date(nextDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: InvoiceStatus.UNPAID,
          paymentHistory: [],
          isRecurring: false,
          parentInvoiceId: parent.id,
          lastGeneratedDate: undefined,
          totalAmount: parent.recurringAmount ?? parent.totalAmount
        };
        newInvoices.push(newInv);
        parent.lastGeneratedDate = newInv.date;
      }
    });
    if (newInvoices.length > 0) {
      setInvoices(prev => [...prev, ...newInvoices]);
      alert(`${newInvoices.length} recurring invoices generated!`);
    } else {
      alert("No invoices due for generation.");
    }
  };

  const generateInvoicePDF = (invoice: Invoice) => {
    const quote = quotes.find(q => q.id === invoice.quoteId);
    const client = clients.find(c => c.id === invoice.clientId);
    const balance = calculateBalance(invoice);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsHtml = quote?.items.map(item => `
      <tr>
        <td>Service Reference #${item.serviceId.substring(0, 5).toUpperCase()}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatMoney(item.unitPrice, invoice.currency)}</td>
        <td style="text-align: right;">${formatMoney(item.quantity * item.unitPrice, invoice.currency)}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Original quote items unavailable.</td></tr>`;

    const isPDF = letterhead?.startsWith('data:application/pdf');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b; 
              line-height: 1.4; 
              font-size: 10px; 
              background: transparent; 
              width: 210mm;
            }
            .print-container {
              padding: 250px 40px 60px 40px;
              min-height: 297mm;
              position: relative;
              box-sizing: border-box;
            }
            .letterhead { 
              position: fixed; 
              top: 0; 
              left: 0; 
              width: 210mm; 
              height: 297mm; 
              z-index: -1; 
              object-fit: fill; 
              pointer-events: none; 
              border: none;
            }
            .header { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 25px; padding-bottom: 20px; }
            .meta { text-align: right; }
            .meta h2 { margin: 0; color: #1e293b; font-size: 18px; font-weight: 800; }
            .meta p { margin: 2px 0; color: #94a3b8; font-weight: 700; }
            .status-banner { padding: 10px 15px; border-radius: 8px; font-weight: 800; text-transform: uppercase; font-size: 11px; margin-bottom: 25px; text-align: center; ${invoice.status === InvoiceStatus.PAID ? 'background: #ecfdf5; color: #059669; border: 1px solid #10b981;' : 'background: #fffbeb; color: #d97706; border: 1px solid #f59e0b;'} }
            .details { display: flex; gap: 20px; margin-bottom: 25px; }
            .details-box { flex: 1; padding: 12px; background: rgba(248, 250, 252, 0.8); border-radius: 10px; border-left: 4px solid #e2e8f0; }
            .details-box h3 { margin: 0 0 6px 0; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 1px; }
            .details-box p { margin: 2px 0; font-weight: 600; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { text-align: left; background: rgba(241, 245, 249, 0.8); padding: 10px; font-size: 9px; text-transform: uppercase; color: #475569; font-weight: 800; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #334155; }
            .summary-container { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .summary { width: 260px; background: rgba(248, 250, 252, 0.8); padding: 15px; border-radius: 14px; border: 1px solid #e2e8f0; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 600; color: #64748b; font-size: 10px; }
            .row.total { border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 12px; font-weight: 800; font-size: 16px; color: #1e293b; }
            .row.balance { color: #4f46e5; font-size: 15px; margin-top: 5px; }
            .sections { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
            .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #4f46e5; margin-bottom: 5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
            .section-content { color: #64748b; font-size: 9px; white-space: pre-wrap; font-family: inherit; margin: 0; }
            .footer { margin-top: 40px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            @media print { 
              .letterhead { display: block !important; -webkit-print-color-adjust: exact; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${letterhead ? (isPDF ? `<object data="${letterhead}" type="application/pdf" class="letterhead"></object>` : `<img src="${letterhead}" class="letterhead" alt="Letterhead" />`) : ''}
          <div class="print-container">
            <div class="header">
              <div class="meta"><h2>INV # ${invoice.invoiceNumber}</h2><p>Issue Date: ${invoice.date}</p><p>Due Date: ${invoice.dueDate}</p></div>
            </div>
            <div class="status-banner">Current Settlement Status: ${invoice.status}</div>
            <div class="details">
              <div class="details-box" style="border-left-color: #4f46e5;"><h3>Bill To</h3><p><strong>${invoice.clientName}</strong></p><p>${client?.email || 'N/A'}</p><p>${client?.address || ''}</p></div>
              <div class="details-box"><h3>Terms & Ref</h3><p><strong>${invoice.paymentTerms}</strong></p><p>Reference: Q-${quote?.quoteNumber || 'N/A'} (V${quote?.version || 1})</p></div>
            </div>
            <table><thead><tr><th style="width: 50%;">Description</th><th style="text-align: center; width: 10%;">Qty</th><th style="text-align: right; width: 20%;">Rate</th><th style="text-align: right; width: 20%;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="summary-container"><div class="summary">
              <div class="row"><span>Gross Value:</span><span>${formatMoney(invoice.totalAmount, invoice.currency)}</span></div>
              <div class="row" style="color: #059669;"><span>Collected:</span><span>${formatMoney(calculatePaidAmount(invoice), invoice.currency)}</span></div>
              <div class="row total"><span>Grand Total:</span><span>${formatMoney(invoice.totalAmount, invoice.currency)}</span></div>
              <div class="row balance"><span>Receivable:</span><span>${formatMoney(balance, invoice.currency)}</span></div>
            </div></div>
            <div class="sections"><div><h4 class="section-title">Official Banking Credentials</h4><pre class="section-content">${bankDetails}</pre></div></div>
            <div class="footer"><p>Empowering Oman's Digital Vision - SmartQuote ERP</p></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 mr-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
             <div>
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CreditCard size={16} />
                  <span className="font-bold text-xs uppercase">Collected</span>
                </div>
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-400">
                  {formatMoney(invoices.reduce((sum, i) => sum + calculatePaidAmount(i), 0))}
                </div>
             </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex items-center justify-between">
             <div>
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Receipt size={16} />
                  <span className="font-bold text-xs uppercase">Receivable</span>
                </div>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-400">
                  {formatMoney(invoices.reduce((sum, i) => sum + calculateBalance(i), 0))}
                </div>
             </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
             <div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                  <Repeat size={16} />
                  <span className="font-bold text-xs uppercase">Active Subscriptions</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {invoices.filter(i => i.isRecurring).length}
                </div>
             </div>
          </div>
        </div>
        <button onClick={syncRecurringInvoices} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all active:scale-95 shrink-0 h-fit">
          <RefreshCw size={20} /> Sync Recurring
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm mb-2 text-slate-800 dark:text-slate-100">
          <Filter size={16} className="text-indigo-600" /> Advanced Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label><select className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Statuses</option>{Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</label><select className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}><option value="all">All Clients</option>{clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salesperson</label><select className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={salespersonFilter} onChange={(e) => setSalespersonFilter(e.target.value)}><option value="all">All Salespeople</option>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date From</label><input type="date" className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={dateStartFilter} onChange={(e) => setDateStartFilter(e.target.value)} /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date To</label><div className="flex gap-2"><input type="date" className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={dateEndFilter} onChange={(e) => setDateEndFilter(e.target.value)} /><button onClick={clearFilters} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"><FilterX size={18} /></button></div></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
            <tr>
              <th className="px-6 py-5">Invoice #</th>
              <th className="px-6 py-5">Client</th>
              <th className="px-6 py-5">Due Date</th>
              <th className="px-6 py-5 text-right">Current Invoice</th>
              <th className="px-6 py-5 text-right">Balance</th>
              <th className="px-6 py-5 text-center">Status</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInvoicesList.map((inv) => {
              const balance = calculateBalance(inv);
              const isExpanded = expandedInvoice === inv.id;
              const associatedQuote = quotes.find(q => q.id === inv.quoteId);
              
              return (
                <React.Fragment key={inv.id}>
                  <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                        {inv.isRecurring && <Repeat size={14} className="text-indigo-500" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{inv.paymentTerms}</div>
                    </td>
                    <td className="px-6 py-5"><div className="font-bold text-slate-700 dark:text-white">{inv.clientName}</div></td>
                    <td className="px-6 py-5"><div className="flex items-center gap-1.5 text-slate-500 text-sm"><Calendar size={14} />{inv.date}</div></td>
                    <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white">
                      {formatMoney(inv.totalAmount, inv.currency)}
                      {inv.isRecurring && (
                        <div className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5">Installment: {formatMoney(inv.recurringAmount || 0, inv.currency)}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right"><div className={`font-black ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatMoney(balance, inv.currency)}</div></td>
                    <td className="px-6 py-5"><div className="flex justify-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : inv.status === InvoiceStatus.PARTIAL ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{inv.status}</span></div></td>
                    <td className="px-6 py-5 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)} className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'}`}><History size={18} /></button><button onClick={() => generateInvoicePDF(inv)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 rounded-xl transition-all"><FileDown size={18} /></button><button onClick={() => { setSelectedInvoice(inv); setIsRecurring(inv.isRecurring || false); setFrequency(inv.recurringFrequency || 'Monthly'); setEndDate(inv.recurringEndDate || ''); setShowRecurringModal(true); }} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Repeat size={18} /></button><button onClick={() => { setSelectedInvoice(inv); setPaymentAmount(calculateBalance(inv)); setPaymentProofUrl(''); setUploadedProofs([]); setShowPaymentModal(true); }} disabled={inv.status === InvoiceStatus.PAID} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 rounded-xl transition-all disabled:opacity-30"><DollarSign size={18} /></button></div></td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan={7} className="px-12 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <h6 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><History size={14} className="text-indigo-500" /> Transaction Ledger</h6>
                             {(inv.paymentHistory || []).length > 0 ? (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {inv.paymentHistory.map((p) => (
                                   <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                     <div className="flex justify-between items-start">
                                       <div><div className="text-sm font-black text-slate-800 dark:text-slate-100">{formatMoney(p.amount, inv.currency)}</div><div className="text-[9px] text-slate-400 font-bold uppercase">{p.paymentMethod}</div></div>
                                       <div className="text-[9px] font-black text-slate-400 uppercase">{p.paymentDate}</div>
                                     </div>
                                     <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50 dark:border-slate-800 mt-2">
                                       {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter">Link</a>}
                                       {(p.proofFiles || []).map(file => <button key={file.id} onClick={() => setPreviewFile(file)} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter truncate max-w-[60px]">{file.name}</button>)}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             ) : <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-xs text-slate-400">No payments recorded.</div>}
                          </div>

                          <div className="space-y-6">
                            <h6 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><Clock size={14} className="text-indigo-500" /> Subscription Outstanding Analytics</h6>
                            {inv.isRecurring && associatedQuote ? (
                              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl space-y-4">
                                 <div className="flex justify-between items-center">
                                    <div className="text-[9px] font-black uppercase text-indigo-200">Total Contract Commitment</div>
                                    <div className="text-xl font-black">{formatMoney(associatedQuote.totalAmount, inv.currency)}</div>
                                 </div>
                                 <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-400 h-full transition-all duration-1000" style={{ width: `${(inv.totalAmount / associatedQuote.totalAmount) * 100}%` }}></div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div><div className="text-[8px] font-black uppercase text-indigo-200">Billed to Date</div><div className="text-sm font-black">{formatMoney(inv.totalAmount, inv.currency)}</div></div>
                                    <div className="text-right">
                                       <div className="text-[8px] font-black uppercase text-indigo-200">Pending Lifecycle</div>
                                       <div className="text-sm font-black text-emerald-300">{formatMoney(associatedQuote.totalAmount - inv.totalAmount, inv.currency)}</div>
                                    </div>
                                 </div>
                                 <div className="bg-black/10 p-3 rounded-xl flex items-center gap-3">
                                    <Info size={14} className="text-indigo-200 shrink-0" />
                                    <p className="text-[9px] text-indigo-100 font-medium leading-tight">The outstanding balance of {formatMoney(associatedQuote.totalAmount - inv.totalAmount, inv.currency)} will be issued in {inv.recurringFrequency} increments of {formatMoney(inv.recurringAmount || 0, inv.currency)}.</p>
                                 </div>
                              </div>
                            ) : (
                              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 text-center">
                                 <p className="text-xs text-slate-500 font-medium italic">This is a one-time settlement invoice. No future installments are pending.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-8" onClick={() => setPreviewFile(null)}>
           <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-12 right-0 flex gap-4"><a href={previewFile.url} download={previewFile.name} className="p-2 text-white hover:text-emerald-400 bg-white/10 rounded-full backdrop-blur-md"><DownloadIcon size={24} /></a><button onClick={() => setPreviewFile(null)} className="p-2 text-white hover:text-red-400 bg-white/10 rounded-full backdrop-blur-md"><X size={24} /></button></div>
              {previewFile.type === 'image' ? <div className="bg-white p-2 rounded-[2rem] shadow-2xl overflow-hidden flex items-center justify-center"><img src={previewFile.url} alt={previewFile.name} className="rounded-[1.5rem] max-h-[75vh] max-w-full object-contain" /></div> : <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 text-center space-y-8 shadow-2xl border border-slate-200 dark:border-slate-800"><div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto"><FileIcon size={48} /></div><div className="space-y-2"><h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{previewFile.name}</h3><p className="text-slate-500 font-medium italic">Document Preview Unavailable</p></div><a href={previewFile.url} download={previewFile.name} className="inline-flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"><DownloadIcon size={18} /> Download to View</a></div>}
           </div>
        </div>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-md shadow-2xl p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2"><div className="flex items-center gap-4"><div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg"><DollarSign size={24} /></div><h3 className="text-2xl font-black tracking-tight">Record Payment</h3></div><button onClick={() => setShowPaymentModal(false)} className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={24}/></button></div>
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-1"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Remaining</div><div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatMoney(calculateBalance(selectedInvoice), selectedInvoice.currency)}</div></div>
            <div className="space-y-4"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount to Pay</label><input type="number" className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}/></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label><input type="date" className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}/></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Method</label><select className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Bank Transfer</option><option>Credit Card</option><option>Cash</option><option>Cheque</option></select></div></div><div className="space-y-4 pt-2"><div className="flex items-center justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><Paperclip size={12} /> Payment Proof</label><button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2 transition-all"><Upload size={12} /> Add Files</button><input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx"/></div><div className="space-y-2"><div className="relative group"><input type="text" placeholder="Or paste receipt link here..." className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all pr-10" value={paymentProofUrl} onChange={(e) => setPaymentProofUrl(e.target.value)}/><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"><ImageIcon size={16} /></div></div>{uploadedProofs.length > 0 && <div className="grid grid-cols-1 gap-2 pt-2 animate-in fade-in duration-300">{uploadedProofs.map((file) => <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-emerald-200 transition-all"><div className="flex items-center gap-3 overflow-hidden"><div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-emerald-600">{file.type === 'image' ? <ImageIcon size={14} /> : <FileIcon size={14} />}</div><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</span></div><button onClick={() => removeUploadedProof(file.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button></div>)}</div>}</div></div></div>
            <div className="pt-4 sticky bottom-0 bg-white dark:bg-slate-900 z-10"><button onClick={handleRecordPayment} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-emerald-700 shadow-2xl shadow-emerald-500/40 transition-all active:scale-95 flex items-center justify-center gap-2"><CheckCircle size={18} /> Verify & Record</button></div>
          </div>
        </div>
      )}

      {showRecurringModal && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-md shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center"><div className="flex items-center gap-4"><div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg"><Repeat size={24} /></div><h3 className="text-2xl font-black tracking-tight">Recurring Billing</h3></div><button onClick={() => setShowRecurringModal(false)} className="text-slate-400 p-2"><X size={24}/></button></div>
            <div className="space-y-6"><div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isRecurring ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}><RefreshCw size={18} className={isRecurring ? 'animate-spin-slow' : ''}/></div><div><div className="text-sm font-black">Enable Subscription</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Generate next cycle automatically</div></div></div><div onClick={() => setIsRecurring(!isRecurring)} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${isRecurring ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'translate-x-6' : 'translate-x-0'}`} /></div></div>{isRecurring && <div className="space-y-4 animate-in slide-in-from-top-4"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Interval</label><div className="grid grid-cols-3 gap-2">{['Monthly', 'Quarterly', 'Annual'].map((f) => <button key={f} onClick={() => setFrequency(f as RecurringFrequency)} className={`py-3 rounded-xl text-xs font-black transition-all border ${frequency === f ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300'}`}>{f}</button>)}</div></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle End Date (Optional)</label><input type="date" className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div></div>}</div>
            <button onClick={handleSetupRecurring} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all active:scale-95">Update Subscription</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesView;