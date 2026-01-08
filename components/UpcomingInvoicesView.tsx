import React, { useState, useMemo } from 'react';
import { Quote, Invoice, RecurringFrequency } from '../types';
import { 
  CalendarClock, Info, Repeat, ChevronRight, Receipt,
  Search, Filter, FilterX, Calendar, ListFilter
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  invoices: Invoice[];
  formatMoney: (val: number, curr?: string) => string;
  onSelectInvoice: (id: string) => void;
}

const UpcomingInvoicesView: React.FC<Props> = ({ quotes, invoices, formatMoney, onSelectInvoice }) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'unpaid' | 'projected'>('all');
  const [freqFilter, setFreqFilter] = useState<'all' | RecurringFrequency>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Generate unique clients list for dropdown
  const uniqueClients = useMemo(() => {
    const names = new Set(invoices.map(i => i.clientName));
    return Array.from(names).sort();
  }, [invoices]);

  // Combined Data Generation & Filtering
  const filteredData = useMemo(() => {
    const today = new Date();
    const horizonLimit = new Date();
    horizonLimit.setMonth(today.getMonth() + 12); // Default 12 month lookahead

    // 1. Process Projections
    const projectedList: any[] = [];
    
    // Aggregate by Quote ID to handle commitment capping globally
    invoices.filter(inv => inv.isRecurring).forEach(parent => {
      const originalQuote = quotes.find(q => q.id === parent.quoteId);
      if (!originalQuote) return;

      // Calculate the global commitment balance for this contract service node
      const relatedInvoices = invoices.filter(i => i.quoteId === parent.quoteId);
      const totalBilledSoFar = relatedInvoices.reduce((s, i) => s + i.totalAmount, 0);
      let remainingCommitment = Math.max(0, originalQuote.totalAmount - totalBilledSoFar);

      let lastDate = new Date(parent.lastGeneratedDate || parent.date);
      const freq = parent.recurringFrequency;
      
      // Safety check: Avoid infinite loops, check up to 36 cycles out
      for (let i = 0; i < 36; i++) {
        if (remainingCommitment <= 0.01) break; // Use small delta for floating point

        const nextDate = new Date(lastDate);
        if (freq === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (freq === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (freq === 'Annual') nextDate.setFullYear(nextDate.getFullYear() + 1);

        // Break if past our 12-month visibility horizon
        if (nextDate > horizonLimit) break;
        
        // Break if we passed the actual contract end date defined in the invoice
        if (parent.recurringEndDate && nextDate > new Date(parent.recurringEndDate)) break;

        const dateStr = nextDate.toISOString().split('T')[0];
        
        // Use the standard installment but never more than the remaining commitment
        const maxMonths = Math.max(...originalQuote.items.map(it => it.contractMonths), 1);
        const standardInstallment = parent.recurringAmount || (originalQuote.totalAmount / maxMonths);
        const projectedAmount = Math.min(remainingCommitment, standardInstallment);

        if (projectedAmount <= 0) break;

        projectedList.push({
          id: `proj-${parent.id}-${i}`,
          type: 'Projected',
          clientName: parent.clientName,
          amount: projectedAmount,
          date: dateStr,
          parentRef: parent.invoiceNumber,
          frequency: freq,
          currency: parent.currency,
          originalInvoice: parent
        });

        remainingCommitment -= projectedAmount;
        lastDate = nextDate;
      }
    });

    // 2. Process Unpaid
    const unpaidList = invoices
      .filter(i => i.status !== 'Paid')
      .map(i => ({
        id: i.id,
        type: 'Unpaid',
        clientName: i.clientName,
        amount: i.totalAmount - (i.paymentHistory?.reduce((s, p) => s + p.amount, 0) || 0),
        date: i.dueDate,
        parentRef: i.invoiceNumber,
        currency: i.currency,
        originalInvoice: i,
        status: i.status
      }));

    // 3. Apply Filters
    const applyCommonFilters = (item: any) => {
      const matchSearch = item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.parentRef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClient = clientFilter === 'all' || item.clientName === clientFilter;
      const matchStart = !dateRange.start || item.date >= dateRange.start;
      const matchEnd = !dateRange.end || item.date <= dateRange.end;
      
      return matchSearch && matchClient && matchStart && matchEnd;
    };

    const finalUnpaid = (typeFilter === 'all' || typeFilter === 'unpaid') 
      ? unpaidList.filter(applyCommonFilters) 
      : [];

    const finalProjected = (typeFilter === 'all' || typeFilter === 'projected') 
      ? projectedList.filter(item => {
          const common = applyCommonFilters(item);
          const freqMatch = freqFilter === 'all' || item.frequency === freqFilter;
          return common && freqMatch;
        }) 
      : [];

    return {
      unpaid: finalUnpaid.sort((a, b) => a.date.localeCompare(b.date)),
      projected: finalProjected.sort((a, b) => a.date.localeCompare(b.date)),
      totalValue: [...finalUnpaid, ...finalProjected].reduce((s, i) => s + i.amount, 0)
    };
  }, [invoices, quotes, searchTerm, clientFilter, typeFilter, freqFilter, dateRange]);

  const clearFilters = () => {
    setSearchTerm('');
    setClientFilter('all');
    setTypeFilter('all');
    setFreqFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const combinedItems = useMemo(() => {
    return [...filteredData.unpaid, ...filteredData.projected].sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-12">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary-600 dark:bg-primary-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary-600/20 col-span-1 md:col-span-2 relative overflow-hidden">
           <CalendarClock className="absolute -bottom-4 -right-4 w-40 h-40 opacity-10" />
           <div className="relative z-10 space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary-200">Filtered Projected Receivable</div>
              <div className="text-4xl font-black tracking-tight">{formatMoney(filteredData.totalValue)}</div>
              <p className="text-sm font-medium text-primary-100/70 max-w-lg leading-relaxed">
                Aggregating <span className="text-white font-bold">{filteredData.unpaid.length} pending settlements</span> and <span className="text-white font-bold">{filteredData.projected.length} future cycles</span> for the selected criteria.
              </p>
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
           <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Horizon Density</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{filteredData.unpaid.length + filteredData.projected.length} Events Found</div>
           </div>
           <div className="space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800 mt-6">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-500 dark:text-slate-400 font-bold">Unpaid Value</span>
                 <span className="font-black text-amber-600 dark:text-amber-500">{formatMoney(filteredData.unpaid.reduce((s,i)=>s+i.amount, 0))}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-500 dark:text-slate-400 font-bold">Projected Revenue</span>
                 <span className="font-black text-primary-600 dark:text-primary-400">{formatMoney(filteredData.projected.reduce((s,i)=>s+i.amount, 0))}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-black text-[10px] uppercase tracking-widest">
            <Filter size={14} /> Refine Revenue Forecast
          </div>
          <button onClick={clearFilters} className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1">
             <FilterX size={12} /> Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Search Identifier</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder="Client name or invoice ref..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold outline-none focus:ring-4 focus:ring-primary-500/10 transition-all dark:text-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Account Entity</label>
             <select 
               className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold outline-none dark:text-white"
               value={clientFilter}
               onChange={e => setClientFilter(e.target.value)}
             >
                <option value="all">All Accounts</option>
                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Event Type</label>
             <select 
               className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold outline-none dark:text-white"
               value={typeFilter}
               onChange={e => setTypeFilter(e.target.value as any)}
             >
                <option value="all">Unpaid & Projected</option>
                <option value="unpaid">Unpaid Ledger Only</option>
                <option value="projected">Future Forecast Only</option>
             </select>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Cycle Interval</label>
             <select 
               className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 font-bold outline-none dark:text-white"
               value={freqFilter}
               onChange={e => setFreqFilter(e.target.value as any)}
             >
                <option value="all">Any Frequency</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
             </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <ListFilter size={20} className="text-primary-600" /> Revenue Horizon Ledger
           </h3>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-[10px] font-black uppercase text-slate-400">Unpaid</span>
              <div className="w-3 h-3 rounded-full bg-primary-600 ml-2" />
              <span className="text-[10px] font-black uppercase text-slate-400">Projected</span>
           </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-8 py-5">Source Node</th>
              <th className="px-8 py-5">Event Target Date</th>
              <th className="px-8 py-5 text-right">Value Magnitude</th>
              <th className="px-8 py-5 text-center">Lifecycle Stage</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {combinedItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${item.type === 'Unpaid' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-primary-50 border-primary-100 text-primary-600'}`}>
                      {item.type === 'Unpaid' ? <Receipt size={18} /> : <Repeat size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">{item.clientName}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Ref: {item.parentRef}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <Calendar size={14} className="text-slate-400" />
                    {item.date}
                  </div>
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-slate-100">
                  {formatMoney(item.amount, item.currency)}
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                      item.type === 'Unpaid' 
                        ? 'bg-amber-100 text-amber-700 border-amber-200' 
                        : 'bg-primary-100 text-primary-700 border-primary-200'
                    }`}>
                      {item.type} {item.frequency ? `(${item.frequency})` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => onSelectInvoice(item.originalInvoice.id)}
                    className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </td>
              </tr>
            ))}
            {combinedItems.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">
                  No revenue nodes found for the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-primary-50 dark:bg-primary-900/20 p-8 rounded-[2.5rem] border border-primary-100 dark:border-primary-800/50 flex items-start gap-6">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm text-primary-600">
           <Info size={32} />
        </div>
        <div className="space-y-2">
           <h4 className="text-lg font-black text-primary-900 dark:text-primary-100">Horizon Intelligence</h4>
           <p className="text-sm text-primary-800/70 dark:text-primary-200/70 leading-relaxed font-medium">
              This registry combines <span className="font-bold">Realized Debt</span> (Unpaid Invoices) with <span className="font-bold">Contractual Expectancy</span> (Future Recurring Cycles). Projected values are calculated based on the approved terms of active subscription contracts and are subject to generation thresholds.
           </p>
        </div>
      </div>
    </div>
  );
};

// Added missing default export to resolve "no default export" error in App.tsx
export default UpcomingInvoicesView;