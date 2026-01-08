import React, { useState, useMemo, useRef } from 'react';
import { 
  Quote, Salesperson, SalespersonType, ServiceItem, QuoteStatus, 
  Invoice, InvoiceStatus, Client, QuoteStatusChange, Attachment, 
  BillingFrequency, QuoteLineItem, Lead 
} from '../types';
import { 
  Plus, Eye, CheckCircle, X, Percent, FileText, 
  Calendar, History, Clock, AlertCircle, 
  RotateCcw, Package, FileDown, TrendingUp, DollarSign, 
  Filter, FilterX, Paperclip, Trash2, Edit3, Link as LinkIcon, 
  Download, Info, ChevronDown, Check, Briefcase, PieChart, Lock, 
  ArrowRight, Building2, Bell, CheckCircle2, XCircle, ListTree, Activity,
  MapPinned, Calculator, HandCoins, Footprints
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  team: Salesperson[];
  catalog: ServiceItem[];
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  invoices: Invoice[];
  companyName: string;
  letterhead?: string | null;
  formatMoney: (val: number, currencyCode?: string) => string;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
  bankDetails: string;
  defaultTerms: string;
  primaryColorHex?: string;
}

const QuotesView: React.FC<Props> = ({ 
  quotes, setQuotes, team, catalog, clients, setClients, leads, setLeads, setInvoices, invoices,
  companyName, letterhead, formatMoney, baseCurrency, exchangeRates, bankDetails, defaultTerms, primaryColorHex = '#4f46e5'
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'revise'>('create');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 (Default)');

  const [activeVersionIds, setActiveVersionIds] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [dateStartFilter, setDateStartFilter] = useState<string>('');
  const [dateEndFilter, setDateEndFilter] = useState<string>('');

  const [newQuote, setNewQuote] = useState<Partial<Quote>>({
    clientId: clients[0]?.id || '',
    clientName: clients[0]?.companyName || '',
    salespersonId: team[0]?.id || '',
    items: [],
    discount: 0,
    discountType: 'fixed',
    date: new Date().toISOString().split('T')[0],
    followUpDate: '',
    notes: '',
    termsAndConditions: defaultTerms,
    status: QuoteStatus.DRAFT,
    version: 1,
    attachments: [],
    currency: baseCurrency,
    exchangeRate: 1
  });

  const groupedQuotes = useMemo(() => {
    const groups: Record<string, Quote[]> = {};
    quotes.forEach(q => {
      const rootId = q.parentQuoteId || q.id;
      groups[rootId] = groups[rootId] || [];
      groups[rootId].push(q);
    });
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.version - a.version);
    });
    return groups;
  }, [quotes]);

  const derivedValues = useMemo(() => {
    const items = newQuote.items || [];
    const subtotal = items.reduce((sum, item) => {
        const lineVal = item.quantity * item.unitPrice;
        return sum + (item.billingFrequency !== 'One-time' ? lineVal * item.contractMonths : lineVal);
    }, 0);
    const totalCOGS = items.reduce((sum, item) => {
        const lineCOGS = item.quantity * item.costOfGoodsSold;
        return sum + (item.billingFrequency !== 'One-time' ? lineCOGS * item.contractMonths : lineCOGS);
    }, 0);
    const discountVal = newQuote.discount || 0;
    const discountType = newQuote.discountType || 'fixed';
    const discAmount = discountType === 'percentage' ? (subtotal * (discountVal / 100)) : discountVal;
    const totalAmount = Math.max(0, subtotal - discAmount);

    let dueAtSigning = 0;
    let recurringAmount = 0;
    items.forEach(item => {
        const linePrice = item.quantity * item.unitPrice;
        let lineDownpayment = item.downpaymentType === 'percentage' ? (linePrice * (item.downpayment / 100)) : item.downpayment;
        if (item.billingFrequency === 'One-time') dueAtSigning += linePrice;
        else {
            dueAtSigning += lineDownpayment;
            let installment = 0;
            if (item.billingFrequency === 'Monthly') installment = linePrice;
            else if (item.billingFrequency === 'Quarterly') installment = linePrice * 3;
            else if (item.billingFrequency === 'Annual') installment = linePrice * 12;
            dueAtSigning += installment;
            recurringAmount += installment;
        }
    });

    const discRatio = subtotal > 0 ? (totalAmount / subtotal) : 1;
    dueAtSigning = dueAtSigning * discRatio;
    recurringAmount = recurringAmount * discRatio;
    
    const salesperson = team.find(t => t.id === newQuote.salespersonId);
    let appliedRate = salesperson ? salesperson.commissionRate : 0;
    
    // CALCULATION: Sales Commission is now calculated from (Gross Amount - Discount)
    const commissionAmount = totalAmount * (appliedRate / 100);

    return { 
      subtotal, totalCOGS, totalAmount, commissionAmount, appliedRate, 
      netProfit: totalAmount - totalCOGS - commissionAmount, 
      dueAtSigning, recurringAmount, discAmount 
    };
  }, [newQuote.items, newQuote.discount, newQuote.discountType, newQuote.salespersonId, team]);

  const handleSaveQuote = () => {
    const { subtotal, totalCOGS, totalAmount, commissionAmount, appliedRate, netProfit, dueAtSigning, recurringAmount } = derivedValues;
    
    let finalClientId = newQuote.clientId!;
    let finalClientName = newQuote.clientName!;

    const sourceLead = leads.find(l => l.id === newQuote.clientId);
    if (sourceLead) {
       const newClient: Client = {
          id: `c-${Math.random().toString(36).substr(2, 6)}`,
          companyName: sourceLead.companyName,
          contactPerson: sourceLead.contactPerson,
          email: sourceLead.email,
          phone: sourceLead.phone,
          address: sourceLead.address,
          communicationLogs: [{
             id: Math.random().toString(36).substr(2, 6),
             date: new Date().toISOString().split('T')[0],
             type: 'Note',
             summary: `Identity converted from Lead registry upon issuance of Quote ${modalMode === 'create' ? 'initial draft' : newQuote.quoteNumber}.`,
             agentName: 'System Core'
          }]
       };
       finalClientId = newClient.id;
       finalClientName = newClient.companyName;
       
       setClients(prev => [...prev, newClient]);
       setLeads(prev => prev.map(l => l.id === sourceLead.id ? { ...l, status: 'Converted' } : l));
    }

    if (modalMode === 'create' || modalMode === 'revise') {
      const quoteNumber = modalMode === 'create' ? `Q-${1000 + Object.keys(groupedQuotes).length + 1}` : newQuote.quoteNumber!;
      const version = modalMode === 'create' ? 1 : (newQuote.version! + 1);
      const finalQuote: Quote = {
        ...newQuote as Quote,
        id: Math.random().toString(36).substr(2, 9),
        clientId: finalClientId,
        clientName: finalClientName,
        quoteNumber,
        version,
        parentQuoteId: modalMode === 'revise' ? (newQuote.parentQuoteId || newQuote.id) : undefined,
        subtotal, totalAmount, costOfGoodsSold: totalCOGS, totalCost: totalCOGS,
        commissionAmount, appliedCommissionRate: appliedRate, netProfit,
        status: QuoteStatus.DRAFT,
        statusHistory: [{ status: QuoteStatus.DRAFT, timestamp: new Date().toLocaleString() }],
        dueAtSigning, recurringAmount
      };
      setQuotes(prev => [finalQuote, ...prev]);
    } else {
      setQuotes(prev => prev.map(q => q.id === newQuote.id ? { ...q, ...newQuote as Quote, clientId: finalClientId, clientName: finalClientName, subtotal, totalAmount, costOfGoodsSold: totalCOGS, commissionAmount, netProfit, dueAtSigning, recurringAmount } : q));
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewQuote({
      clientId: clients[0]?.id || '', clientName: clients[0]?.companyName || '',
      salespersonId: team[0]?.id || '', items: [], discount: 0, discountType: 'fixed',
      date: new Date().toISOString().split('T')[0], followUpDate: '', notes: '',
      termsAndConditions: defaultTerms, status: QuoteStatus.DRAFT, version: 1,
      attachments: [], currency: baseCurrency, exchangeRate: 1
    });
    setModalMode('create');
  };

  const clientLeadOptions = useMemo(() => {
     const options: { id: string, name: string, type: 'Client' | 'Lead' }[] = [
        ...clients.map(c => ({ id: c.id, name: c.companyName, type: 'Client' as const })),
        ...leads.filter(l => l.status === 'Potential').map(l => ({ id: l.id, name: l.companyName, type: 'Lead' as const }))
     ];
     return options.sort((a,b) => a.name.localeCompare(b.name));
  }, [clients, leads]);

  const updateQuoteStatus = (id: string, newStatus: QuoteStatus) => {
    setQuotes(prev => prev.map(q => q.id === id ? {
      ...q,
      status: newStatus,
      statusHistory: [...(q.statusHistory || []), { status: newStatus, timestamp: new Date().toLocaleString() }]
    } : q));
  };

  const filteredGroups = useMemo(() => {
    return Object.entries(groupedQuotes).filter(([rootId, versions]) => {
      const latest = versions[0];
      const matchStatus = statusFilter === 'all' || latest.status === statusFilter;
      const matchClient = clientFilter === 'all' || latest.clientId === clientFilter;
      const matchSalesperson = salespersonFilter === 'all' || latest.salespersonId === salespersonFilter;
      const matchStart = !dateStartFilter || latest.date >= dateStartFilter;
      const matchEnd = !dateEndFilter || latest.date <= dateEndFilter;
      return matchStatus && matchClient && matchSalesperson && matchStart && matchEnd;
    });
  }, [groupedQuotes, statusFilter, clientFilter, salespersonFilter, dateStartFilter, dateEndFilter]);

  const handleLineItemUpdate = (idx: number, updates: Partial<QuoteLineItem>) => {
    const updated = [...(newQuote.items || [])];
    updated[idx] = { ...updated[idx], ...updates };
    setNewQuote({ ...newQuote, items: updated });
  };

  const handleConvertQuote = () => {
    if (!quoteToConvert) return;
    
    const isContract = quoteToConvert.items.some(item => item.billingFrequency !== 'One-time');
    const recurringFreq = quoteToConvert.items.find(item => item.billingFrequency !== 'One-time')?.billingFrequency;
    
    let recurringEndDate: string | undefined = undefined;
    if (isContract) {
      const maxMonths = Math.max(...quoteToConvert.items.map(i => i.contractMonths || 1));
      const end = new Date();
      end.setMonth(end.getMonth() + maxMonths - 1);
      recurringEndDate = end.toISOString().split('T')[0];
    }

    const baseInvoiceData = {
      quoteId: quoteToConvert.id,
      clientId: quoteToConvert.clientId,
      clientName: quoteToConvert.clientName,
      date: new Date().toISOString().split('T')[0],
      status: InvoiceStatus.UNPAID,
      paymentHistory: [],
      paymentTerms,
      currency: quoteToConvert.currency,
      exchangeRate: quoteToConvert.exchangeRate,
      isRecurring: isContract,
      recurringFrequency: recurringFreq === 'One-time' ? undefined : (recurringFreq as any),
      recurringAmount: quoteToConvert.recurringAmount,
      recurringEndDate
    };

    if (paymentTerms === '50% Advance / 50% Milestone') {
      const splitAmount = quoteToConvert.totalAmount / 2;
      const inv1: Invoice = {
        ...baseInvoiceData,
        id: Math.random().toString(36).substr(2, 9),
        invoiceNumber: `INV-${quoteToConvert.quoteNumber.split('-')[1]}-ADV`,
        totalAmount: splitAmount,
        dueDate: new Date().toISOString().split('T')[0],
        isRecurring: false 
      };
      const inv2: Invoice = {
        ...baseInvoiceData,
        id: Math.random().toString(36).substr(2, 9),
        invoiceNumber: `INV-${quoteToConvert.quoteNumber.split('-')[1]}-MS`,
        totalAmount: splitAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isRecurring: false
      };
      setInvoices(prev => [inv1, inv2, ...prev]);
    } else {
      const invAmount = isContract ? quoteToConvert.dueAtSigning : quoteToConvert.totalAmount;
      const newInvoice: Invoice = {
        ...baseInvoiceData,
        id: Math.random().toString(36).substr(2, 9),
        invoiceNumber: `INV-${quoteToConvert.quoteNumber.split('-')[1]}-${Math.floor(Math.random() * 900 + 100)}`,
        totalAmount: invAmount,
        dueDate: paymentTerms === 'Due on Receipt' 
          ? new Date().toISOString().split('T')[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      setInvoices(prev => [newInvoice, ...prev]);
    }

    updateQuoteStatus(quoteToConvert.id, QuoteStatus.APPROVED);
    setShowConvertModal(false);
    setQuoteToConvert(null);
  };

  const generatePDF = (q: Quote) => {
    const client = clients.find(c => c.id === q.clientId);
    const salesperson = team.find(t => t.id === q.salespersonId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = q.items.map(item => {
      const isRecurring = item.billingFrequency !== 'One-time';
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 12px; color: #334155;">
            <strong style="display: block; font-size: 12.5px; color: #1e293b;">${catalog.find(s => s.id === item.serviceId)?.name || 'Service'}</strong>
            <div style="color: #64748b; font-size: 10px; margin-top: 2px; white-space: pre-wrap;">${item.description || ''}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px; font-weight: 600; text-transform: uppercase;">
              ${item.billingFrequency} cycle ${isRecurring ? ` • ${item.contractMonths} months term` : ''}
            </div>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 12px; font-weight: 600;">${item.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 12px; font-weight: 600;">${formatMoney(item.unitPrice, q.currency)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 12px; font-weight: 700; color: #1e293b;">${formatMoney(item.quantity * item.unitPrice * (item.billingFrequency === 'One-time' ? 1 : item.contractMonths), q.currency)}</td>
        </tr>
      `;
    }).join('');

    const discountAmount = q.discountType === 'percentage' ? (q.subtotal * (q.discount / 100)) : q.discount;
    const discountRowHtml = q.discount > 0 ? `
      <div class="summary-row" style="color: #ef4444;">
        <span>Discount (${q.discountType === 'percentage' ? q.discount + '%' : 'Fixed'}):</span>
        <span>-${formatMoney(discountAmount, q.currency)}</span>
      </div>
    ` : '';

    const isPDF = letterhead?.startsWith('data:application/pdf');

    printWindow.document.write(`
      <html>
        <head>
          <title>Proposal ${q.quoteNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #1e293b; line-height: 1.25; font-size: 10.5px; background: transparent; width: 210mm; }
            .letterhead { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; z-index: -1; object-fit: fill; pointer-events: none; border: none; }
            .container { padding: 250px 35px 60px 35px; position: relative; min-height: 297mm; box-sizing: border-box; }
            .header { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 15px; }
            .meta { text-align: right; }
            .meta h2 { margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; }
            .meta p { margin: 0; color: #94a3b8; font-size: 8.5px; font-weight: 600; text-transform: uppercase; }
            .info-grid { display: flex; gap: 12px; margin-bottom: 15px; }
            .info-box { flex: 1; padding: 8px 12px; background: rgba(248, 250, 252, 0.8); border-radius: 8px; border-left: 3px solid #e2e8f0; }
            .info-box h3 { margin: 0 0 2px 0; font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.5px; }
            .info-box p { margin: 0; font-weight: 500; color: #475569; }
            .info-box strong { color: #1e293b; font-weight: 700; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { text-align: left; background: rgba(241, 245, 249, 0.8); padding: 8px 10px; font-size: 8.5px; text-transform: uppercase; color: #475569; font-weight: 800; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .summary-container { display: flex; justify-content: flex-end; margin-bottom: 15px; }
            .summary-box { width: 250px; background: rgba(248, 250, 252, 0.8); padding: 10px 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 2px 0; font-weight: 600; color: #64748b; font-size: 10.5px; }
            .summary-row.total { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; color: #1e293b; font-weight: 800; font-size: 14px; }
            .total-value { color: ${primaryColorHex}; }
            .sections { display: flex; flex-direction: column; gap: 10px; }
            .section-title { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: ${primaryColorHex}; margin-bottom: 3px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
            .section-content { color: #64748b; font-size: 9.5px; white-space: pre-wrap; font-family: inherit; margin: 0; }
            .footer { margin-top: 25px; text-align: center; color: #94a3b8; font-size: 8.5px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
            @media print { .letterhead { display: block !important; -webkit-print-color-adjust: exact; } body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${letterhead ? (isPDF ? `<object data="${letterhead}" type="application/pdf" class="letterhead"></object>` : `<img src="${letterhead}" class="letterhead" alt="Letterhead" />`) : ''}
          <div class="container">
            <div class="header">
              <div class="meta"><h2>PROPOSAL #${q.quoteNumber}</h2><p>Date: ${q.date} | Rev: V${q.version}</p></div>
            </div>
            <div class="info-grid">
              <div class="info-box" style="border-left-color: ${primaryColorHex};"><h3>Client Entity</h3><strong>${q.clientName}</strong><p>${client?.email || ''}</p></div>
              <div class="info-box"><h3>Account Agent</h3><strong>${salesperson?.name || 'Authorized Agent'}</strong><p>Corporate Solutions</p></div>
            </div>
            <table><thead><tr><th style="width: 55%;">Service Item / Description</th><th style="text-align: center; width: 10%;">Qty</th><th style="text-align: right; width: 17%;">Rate</th><th style="text-align: right; width: 18%;">Net Value</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="summary-container"><div class="summary-box"><div class="summary-row"><span>Gross Amount:</span><span>${formatMoney(q.subtotal, q.currency)}</span></div>${discountRowHtml}<div class="summary-row total"><span>Project Commitment:</span><span class="total-value">${formatMoney(q.totalAmount, q.currency)}</span></div></div></div>
            <div class="sections"><div><h4 class="section-title">Settlement Compliance & Terms</h4><pre class="section-content">${q.termsAndConditions || 'Standard 30-day validity applies.'}</pre></div><div><h4 class="section-title">Official Banking Credentials</h4><pre class="section-content">${bankDetails}</pre></div></div>
            <div class="footer"><p>Computer generated commercial proposal. Valid for 30 days from issue date.</p></div>
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
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{companyName} | Quote Pipeline</p>
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
             <Bell size={14} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-primary-600 text-white px-8 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95 flex items-center gap-2">
          <Plus size={20} /> Create New Quote
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-black text-[10px] uppercase tracking-widest">
           <Filter size={14} /> Advanced Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Status</label>
            <select className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-slate-200" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.values(QuoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Client</label>
            <select className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-slate-200" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option value="all">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Salesperson</label>
            <select className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-slate-200" value={salespersonFilter} onChange={e => setSalespersonFilter(e.target.value)}>
              <option value="all">All Salespeople</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Date From</label>
            <input type="date" className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-slate-200" value={dateStartFilter} onChange={e => setDateStartFilter(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setStatusFilter('all'); setClientFilter('all'); setSalespersonFilter('all'); setDateStartFilter(''); setDateEndFilter(''); }} className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-all border border-slate-200 dark:border-slate-700">
               <FilterX size={18} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredGroups.map(([rootId, versions]) => {
          const latestVersion = versions[0];
          const selectedVersionId = activeVersionIds[rootId] || latestVersion.id;
          const activeQuote = versions.find(v => v.id === selectedVersionId) || latestVersion;
          const isExpanded = expandedQuoteId === rootId;
          const margin = ((activeQuote.netProfit / (activeQuote.totalAmount || 1)) * 100).toFixed(0);
          const isApproved = activeQuote.status === QuoteStatus.APPROVED;

          return (
            <div key={rootId} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary-400 dark:border-primary-600 shadow-2xl' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
               <div onClick={() => setExpandedQuoteId(isExpanded ? null : rootId)} className="px-6 lg:px-10 py-6 lg:py-8 flex flex-col lg:flex-row lg:items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="w-32 shrink-0">
                     <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-primary-600 dark:text-primary-400 leading-none">{activeQuote.quoteNumber}</span>
                       <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 text-[9px] font-black rounded border border-primary-100 dark:border-primary-800">V{activeQuote.version}</span>
                     </div>
                     <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1.5">{activeQuote.date}</p>
                  </div>
                  <div className="flex-1 px-4 min-w-0"><div className="text-lg lg:text-xl font-black text-slate-800 dark:text-slate-100 truncate">{activeQuote.clientName}</div></div>
                  <div className="w-full lg:w-[180px] shrink-0 text-left lg:text-right mt-4 lg:mt-0 pr-0 lg:pr-4">
                     <div className="text-xl font-black text-slate-900 dark:text-slate-100 whitespace-nowrap leading-tight">{formatMoney(activeQuote.totalAmount, activeQuote.currency)}</div>
                     <div className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 ${parseInt(margin) > 50 ? 'text-emerald-600' : 'text-primary-600 dark:text-primary-400'}`}>ROI: {margin}%</div>
                  </div>
                  <div className="w-full lg:w-[110px] shrink-0 flex items-center justify-start lg:justify-center mt-3 lg:mt-0" onClick={e => e.stopPropagation()}>
                     <div className="relative group w-full max-w-[100px]">
                        <select 
                          disabled={isApproved}
                          className={`appearance-none w-full pl-3 pr-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all outline-none shadow-sm text-center truncate ${
                            activeQuote.status === QuoteStatus.APPROVED ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 cursor-not-allowed opacity-80' :
                            activeQuote.status === QuoteStatus.SENT ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-100 dark:border-primary-800 cursor-pointer' :
                            activeQuote.status === QuoteStatus.REJECTED ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800 cursor-pointer' :
                            'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 cursor-pointer'
                          }`}
                          value={activeQuote.status}
                          onChange={e => updateQuoteStatus(activeQuote.id, e.target.value as QuoteStatus)}
                        >
                           {Object.values(QuoteStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {!isApproved && <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 dark:text-slate-400" />}
                     </div>
                  </div>
                  <div className="w-full lg:w-[180px] shrink-0 flex items-center justify-end gap-2 mt-4 lg:mt-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setExpandedQuoteId(isExpanded ? null : rootId)} className={`p-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${isExpanded ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`} title="View Details"><Eye size={18}/></button>
                        <button disabled={isApproved} onClick={() => { setNewQuote({ ...activeQuote }); setModalMode('revise'); setShowModal(true); }} className={`p-2.5 rounded-xl transition-all border dark:border-slate-800 shadow-sm ${isApproved ? 'opacity-30 cursor-not-allowed text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800' : 'text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900'}`} title={isApproved ? "Approved quotes cannot be revised" : "Create Revision"}><RotateCcw size={18}/></button>
                        <button onClick={() => generatePDF(activeQuote)} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800 shadow-sm" title="Generate PDF"><FileDown size={18}/></button>
                        {!isApproved && <button onClick={() => { setQuoteToConvert(activeQuote); setShowConvertModal(true); }} className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800 shadow-sm" title="Convert to Invoice"><CheckCircle size={18}/></button>}
                  </div>
               </div>
               {isExpanded && (
                 <div className="px-10 pb-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                             <History size={14} className="text-primary-600" /> Revision Registry
                          </h5>
                          <div className="flex flex-wrap gap-2">
                             {versions.map(v => (
                                <button 
                                   key={v.id}
                                   onClick={(e) => { e.stopPropagation(); setActiveVersionIds({...activeVersionIds, [rootId]: v.id}); }}
                                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border shadow-sm ${
                                      selectedVersionId === v.id 
                                      ? 'bg-primary-600 text-white border-primary-600 shadow-primary-600/30' 
                                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-primary-400'
                                   }`}
                                >
                                   <div className="flex flex-col items-start leading-tight">
                                      <span>Version {v.version}</span>
                                      <span className="opacity-60 text-[8px]">{formatMoney(v.totalAmount, v.currency)}</span>
                                   </div>
                                </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Activity size={14} className="text-primary-600" /> Status Evolution
                          </h5>
                          <div className="space-y-3">
                             {(activeQuote.statusHistory || []).map((h, idx) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                   <div className="w-2 h-2 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:border-primary-200 transition-all">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{h.status}</span>
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{h.timestamp}</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500"><DollarSign size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Gross Revenue</span></div>
                          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(activeQuote.totalAmount, activeQuote.currency)}</div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Pipeline Logic</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400"><Briefcase size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Total COGS</span></div>
                          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(activeQuote.costOfGoodsSold, activeQuote.currency)}</div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Resource Cost</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400"><Percent size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Commission</span></div>
                          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(activeQuote.commissionAmount, activeQuote.currency)}</div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Effective Payout</p>
                       </div>
                       <div className="bg-primary-600 dark:bg-primary-700 p-6 rounded-3xl shadow-xl space-y-3">
                          <div className="flex items-center gap-2 text-primary-200"><TrendingUp size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Net Contribution</span></div>
                          <div className="text-2xl font-black text-white">{formatMoney(activeQuote.netProfit, activeQuote.currency)}</div>
                          <p className="text-[9px] text-primary-100/60 font-bold uppercase tracking-tight">Project Return</p>
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2"><ListTree size={16} className="text-primary-600 dark:text-primary-400" /> Strategic Composition</h5>
                       <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left">
                             <thead className="bg-slate-100/50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase">
                                <tr><th className="px-6 py-4">Service Item</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-right">Unit Rate</th><th className="px-6 py-4 text-right">Commitment</th></tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {activeQuote.items.map((item, idx) => (
                                   <tr key={idx} className="text-sm">
                                      <td className="px-6 py-4">
                                        <div className="font-black text-slate-800 dark:text-slate-100">{catalog.find(s => s.id === item.serviceId)?.name || 'Service Node'}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mb-1">{item.description}</div>
                                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">{item.billingFrequency} cycle</div>
                                      </td>
                                      <td className="px-6 py-4 text-center font-bold dark:text-slate-300">{item.quantity}</td>
                                      <td className="px-6 py-4 text-right font-medium text-slate-500 dark:text-slate-400">{formatMoney(item.unitPrice, activeQuote.currency)}</td>
                                      <td className="px-6 py-4 text-right font-black text-primary-600 dark:text-primary-400">{formatMoney(item.quantity * item.unitPrice * (item.billingFrequency === 'One-time' ? 1 : item.contractMonths), activeQuote.currency)}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                 <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg shadow-primary-500/20">{modalMode === 'revise' ? <RotateCcw size={24}/> : <FileText size={24} />}</div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{modalMode === 'revise' ? 'Version Evolution strategy' : 'Proposal Configuration Architect'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{modalMode === 'edit' ? `Editing Ref: ${newQuote.quoteNumber}` : 'Drafting new commercial instrument'}</p>
                 </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={32} /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/20">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="space-y-1 md:col-span-5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Target Account (Client or Lead)</label>
                    <select className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-slate-100" value={newQuote.clientId} onChange={e => { const option = clientLeadOptions.find(o => o.id === e.target.value); setNewQuote({...newQuote, clientId: e.target.value, clientName: option?.name || ''}); }}>
                      {clientLeadOptions.map(opt => (
                         <option key={opt.id} value={opt.id}>{opt.type === 'Lead' ? '🟢 LEAD: ' : '🏢 CLIENT: '}{opt.name}</option>
                      ))}
                    </select>
                    {leads.some(l => l.id === newQuote.clientId) && <div className="flex items-center gap-2 mt-2 ml-1 text-primary-600 dark:text-primary-400 font-bold text-[9px] uppercase"><Info size={12} /> This lead will convert to a Client upon saving.</div>}
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Representative Agent</label>
                    <select className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-slate-100" value={newQuote.salespersonId} onChange={e => setNewQuote({...newQuote, salespersonId: e.target.value})}>{team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Issuance Date</label>
                    <input type="date" className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-slate-100" value={newQuote.date} onChange={e => setNewQuote({...newQuote, date: e.target.value})} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Follow-up Target</label>
                    <input type="date" className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-slate-100" value={newQuote.followUpDate} onChange={e => setNewQuote({...newQuote, followUpDate: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3"><Package size={16} className="text-primary-600 dark:text-primary-400"/> Resource Components & Lifecycle Configuration</h4>
                  <div className="space-y-4">
                     {(newQuote.items || []).map((item, idx) => (
                       <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative group space-y-6">
                          <div className="grid grid-cols-12 gap-6 items-start">
                             <div className="col-span-12 md:col-span-4 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Service Entity</label>
                                <select className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold dark:text-slate-100" value={item.serviceId} onChange={e => {
                                  const s = catalog.find(sv => sv.id === e.target.value);
                                  if (s) handleLineItemUpdate(idx, { serviceId: s.id, unitPrice: s.basePrice, costOfGoodsSold: s.baseCost, description: s.description, billingFrequency: s.type === 'Recurring' ? 'Monthly' : 'One-time', contractMonths: s.minContractMonths || 1 });
                                }}>{catalog.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                             </div>
                             <div className="col-span-6 md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Quantity</label>
                                <input type="number" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black dark:text-slate-100" value={item.quantity} onChange={e => handleLineItemUpdate(idx, { quantity: parseInt(e.target.value) || 1 })} />
                             </div>
                             <div className="col-span-6 md:col-span-3 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Unit Value</label>
                                <input type="number" className="w-full p-4 rounded-2xl border border-primary-200 dark:border-primary-700 bg-slate-50 dark:bg-slate-900 font-black text-primary-600 dark:text-primary-400" value={item.unitPrice} onChange={e => handleLineItemUpdate(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                             </div>
                             <div className="col-span-12 md:col-span-3 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Unit Delta (COGS)</label>
                                <input type="number" className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-amber-600 dark:text-amber-400" value={item.costOfGoodsSold} onChange={e => handleLineItemUpdate(idx, { costOfGoodsSold: parseFloat(e.target.value) || 0 })} />
                             </div>
                             
                             {/* Line Item Description Field */}
                             <div className="col-span-12 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Service Scope / Description</label>
                                <textarea 
                                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium dark:text-slate-100 h-20 outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/10 transition-all text-sm resize-none"
                                  value={item.description}
                                  placeholder="Detail specific deliverables for this item..."
                                  onChange={e => handleLineItemUpdate(idx, { description: e.target.value })}
                                />
                             </div>

                             <div className="col-span-12 md:col-span-3 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Billing cycle</label>
                                <select className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-slate-100" value={item.billingFrequency} onChange={e => handleLineItemUpdate(idx, { billingFrequency: e.target.value as any })}>
                                   <option value="One-time">One-time Settlement</option>
                                   <option value="Monthly">Monthly Installments</option>
                                   <option value="Quarterly">Quarterly Installments</option>
                                   <option value="Annual">Annual Installments</option>
                                </select>
                             </div>
                             <div className="col-span-6 md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Term (Months)</label>
                                <input type="number" disabled={item.billingFrequency === 'One-time'} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold disabled:opacity-30 dark:text-slate-100" value={item.contractMonths} onChange={e => handleLineItemUpdate(idx, { contractMonths: parseInt(e.target.value) || 1 })} />
                             </div>
                             <div className="col-span-12 md:col-span-4 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Advance Commitment</label>
                                <div className="flex gap-2">
                                  <input type="number" className="flex-1 p-4 rounded-2xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-slate-900 font-black text-emerald-600 dark:text-emerald-400" value={item.downpayment} onChange={e => handleLineItemUpdate(idx, { downpayment: parseFloat(e.target.value) || 0 })} />
                                  <select className="w-20 p-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-xs font-black" value={item.downpaymentType} onChange={e => handleLineItemUpdate(idx, { downpaymentType: e.target.value as any })}>
                                     <option value="fixed">{baseCurrency}</option>
                                     <option value="percentage">%</option>
                                  </select>
                                </div>
                             </div>
                             <div className="col-span-12 md:col-span-3 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Performance Insight</label>
                                <div className="w-full p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/50 flex justify-between items-center">
                                   <span className="text-[9px] font-black uppercase text-primary-600 dark:text-primary-400">Line ROI</span>
                                   <span className="text-sm font-black text-primary-700 dark:text-primary-300">
                                      {(((item.unitPrice - item.costOfGoodsSold) / (item.unitPrice || 1)) * 100).toFixed(0)}%
                                   </span>
                                </div>
                             </div>
                          </div>
                          <button onClick={() => setNewQuote({...newQuote, items: (newQuote.items || []).filter((_, i) => i !== idx)})} className="absolute -top-3 -right-3 w-10 h-10 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-500 hover:text-red-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all"><X size={20}/></button>
                       </div>
                     ))}
                     <button onClick={() => { const s = catalog[0]; setNewQuote({...newQuote, items: [...(newQuote.items || []), { serviceId: s.id, quantity: 1, unitPrice: s.basePrice, costOfGoodsSold: s.baseCost, description: s.description, billingFrequency: s.type === 'Recurring' ? 'Monthly' : 'One-time', contractMonths: s.minContractMonths || 1, downpayment: 0, downpaymentType: 'fixed' }]}) }} className="w-full py-6 rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-primary-400 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400 transition-all group">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30"><Plus size={24}/></div>
                        <span className="font-black uppercase text-[10px] tracking-widest">Inject Line Item Node</span>
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1"><Percent size={14} className="text-primary-600" /> Commercial Adjustments</h4>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-3 gap-6">
                       <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjustment Magnitude</label>
                          <input type="number" className="w-full p-4 rounded-2xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-slate-800 font-black text-red-600 dark:text-red-400 outline-none focus:ring-4 focus:ring-primary-100" value={newQuote.discount} onChange={e => setNewQuote({...newQuote, discount: parseFloat(e.target.value) || 0})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                          <select className="w-full p-4 rounded-2xl border border-primary-200 dark:border-primary-700 bg-slate-50 dark:bg-slate-800 font-bold dark:text-slate-100 outline-none" value={newQuote.discountType} onChange={e => setNewQuote({...newQuote, discountType: e.target.value as any})}>
                             <option value="fixed">Fixed</option>
                             <option value="percentage">% Percentage</option>
                          </select>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1"><FileText size={14} className="text-primary-600" /> Engagement Footprint</h4>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                       <textarea 
                          className="w-full p-6 rounded-[2rem] border-none bg-slate-50 dark:bg-slate-800/50 font-medium h-[120px] outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/20 transition-all dark:text-slate-300 resize-none text-sm" 
                          placeholder="Quote validity, delivery terms, and legal footnotes..." 
                          value={newQuote.termsAndConditions} 
                          onChange={e => setNewQuote({...newQuote, termsAndConditions: e.target.value})} 
                       />
                    </div>
                  </div>
               </div>

               <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                     <div className="space-y-6">
                        <div className="text-[10px] font-black text-primary-300 uppercase tracking-[0.2em]">Projection Summary</div>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-sm font-medium opacity-60"><span>Gross Amount:</span><span>{formatMoney(derivedValues.subtotal)}</span></div>
                           <div className="flex justify-between items-center text-sm font-medium text-red-400"><span>Discount:</span><span>-{formatMoney(derivedValues.discAmount)}</span></div>
                           <div className="flex justify-between items-center text-sm font-medium text-slate-400"><span>COGS:</span><span>-{formatMoney(derivedValues.totalCOGS)}</span></div>
                           <div className="flex justify-between items-center text-sm font-medium text-amber-400"><span>Sales Commission ({derivedValues.appliedRate}%):</span><span>-{formatMoney(derivedValues.commissionAmount)}</span></div>
                           <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                              <span className="text-xs font-black uppercase">Net Amount:</span>
                              <span className="text-3xl font-black text-emerald-400">{formatMoney(derivedValues.netProfit)}</span>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/10 flex flex-col justify-center gap-8">
                        <div>
                           <div className="text-[9px] font-black text-primary-200 uppercase tracking-widest opacity-60">Initial Flow</div>
                           <div className="text-4xl font-black mt-1">{formatMoney(derivedValues.dueAtSigning)}</div>
                        </div>
                        <div>
                           <div className="text-[9px] font-black text-primary-200 uppercase tracking-widest opacity-60">Lifecycle Rate</div>
                           <div className="text-4xl font-black mt-1">{formatMoney(derivedValues.recurringAmount)}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0 z-10 shadow-2xl">
               <button onClick={() => setShowModal(false)} className="px-10 py-4 font-black uppercase tracking-widest text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Abort</button>
               <button onClick={handleSaveQuote} className="bg-primary-600 text-white px-14 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-2xl shadow-primary-600/30 transition-all active:scale-95">Commit Strategy</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Invoice / Approve Modal */}
      {showConvertModal && quoteToConvert && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg">
                    <CheckCircle size={24} />
                 </div>
                 <h3 className="text-2xl font-black tracking-tight">Final Authorization</h3>
               </div>
               <button onClick={() => setShowConvertModal(false)} className="text-slate-400 p-2"><X size={24}/></button>
             </div>
             
             <div className="space-y-4">
                <p className="text-sm text-slate-500 font-medium">You are converting <strong>{quoteToConvert.quoteNumber}</strong> into an actionable invoice ledger. Please select the settlement terms:</p>
                <div className="space-y-2">
                   {['Due on Receipt', 'Net 30 (Default)', '50% Advance / 50% Milestone'].map(term => (
                      <button 
                        key={term} 
                        onClick={() => setPaymentTerms(term)}
                        className={`w-full p-4 rounded-2xl border text-left font-bold text-xs uppercase tracking-widest transition-all ${
                          paymentTerms === term 
                          ? 'bg-primary-600 border-primary-600 text-white shadow-lg' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary-300'
                        }`}
                      >
                         {term}
                      </button>
                   ))}
                </div>
             </div>

             <button 
               onClick={handleConvertQuote}
               className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-emerald-700 shadow-2xl shadow-emerald-500/40 transition-all active:scale-95"
             >
               Approve & Generate Invoice
             </button>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { if (quoteToDelete) setQuotes(prev => prev.filter(q => q.id !== quoteToDelete)); setQuoteToDelete(null); }}
        title="Purge Identity"
        message="This operation erases historical commercial trails. Financial data will be lost."
        confirmText="Confirm Purge"
        type="danger"
      />
    </div>
  );
};

export default QuotesView;