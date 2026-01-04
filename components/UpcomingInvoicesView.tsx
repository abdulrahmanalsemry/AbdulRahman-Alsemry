import React, { useState, useMemo } from 'react';
import { Quote, Invoice, QuoteStatus, RecurringFrequency, Client } from '../types';
import { 
  CalendarClock, TrendingUp, Info, ArrowUpRight, 
  Repeat, Clock, ChevronRight, Building2, Receipt,
  CheckCircle2, AlertCircle, Search, Filter, FilterX,
  Calendar, ListFilter
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-12">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 dark:bg-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 col-span-1 md:col-span-2 relative overflow-hidden">
           <CalendarClock className="absolute -bottom-4 -right-4 w-40 h-40 opacity-10" />
           <div className="relative z-10 space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Filtered Projected Receivable</div>
              <div className="text-4xl font-black tracking-tight">{formatMoney(filteredData.totalValue)}</div>
              <p className="text-sm font-medium text-indigo-100/70 max-w-lg leading-relaxed">
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
                 <span className="font-black text-indigo-600 dark:text-indigo-400">{formatMoney(filteredData.projected.reduce((s,i)=>s+i.amount, 0))}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest">
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Client Filter</label>
            <select 
              className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-slate-200"
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              {uniqueClients.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Settlement Type</label>
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
               <button 
                 onClick={() => setTypeFilter('all')}
                 className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
               >All</button>
               <button 
                 onClick={() => setTypeFilter('unpaid')}
                 className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${typeFilter === 'unpaid' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
               >Unpaid</button>
               <button 
                 onClick={() => setTypeFilter('projected')}
                 className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${typeFilter === 'projected' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
               >Projected</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Cycle Frequency</label>
            <select 
              disabled={typeFilter === 'unpaid'}
              className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-bold disabled:opacity-30 dark:text-slate-200"
              value={freqFilter}
              onChange={e => setFreqFilter(e.target.value as any)}
            >
              <option value="all">All Frequencies</option>
              <option value="Monthly">Monthly Only</option>
              <option value="Quarterly">Quarterly Only</option>
              <option value="Annual">Annual Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 flex items-center gap-2">
                <Calendar size={12} /> Target Date Range
              </label>
              <div className="flex items-center gap-3">
                 <input 
                   type="date" 
                   className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-slate-200" 
                   value={dateRange.start}
                   onChange={e => setDateRange({...dateRange, start: e.target.value})}
                 />
                 <span className="text-slate-300 dark:text-slate-600 font-bold">to</span>
                 <input 
                   type="date" 
                   className="flex-1 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold dark:text-slate-200" 
                   value={dateRange.end}
                   onChange={e => setDateRange({...dateRange, end: e.target.value})}
                 />
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Projected Lifecycle Timeline</h3>
            </div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {filteredData.unpaid.length + filteredData.projected.length} Scheduled Events
            </div>
         </div>

         <div className="grid grid-cols-1 gap-4">
            {/* UNPAID ITEMS */}
            {filteredData.unpaid.map(item => (
              <div key={item.id} onClick={() => onSelectInvoice(item.id)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/30 shadow-sm group hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 bg-amber-400 h-full" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                         <Receipt size={24} />
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{item.clientName}</h4>
                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase rounded border border-amber-100 dark:border-amber-800">Pending Settlement</span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overdue/Unpaid Ref: <span className="font-black">{item.parentRef}</span></p>
                      </div>
                   </div>
                   <div className="flex flex-1 md:justify-center items-center gap-8 border-l border-r border-slate-50 dark:border-slate-800 border-dashed px-10">
                      <div className="text-center">
                         <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Maturity Date</div>
                         <div className="text-sm font-black text-slate-800 dark:text-slate-100">{item.date}</div>
                      </div>
                      <div className="text-center">
                         <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Logic</div>
                         <div className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase">{item.originalInvoice.paymentTerms}</div>
                      </div>
                   </div>
                   <div className="text-right min-w-[150px]">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Balance Due</div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatMoney(item.amount, item.currency)}</div>
                   </div>
                   <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all">
                      <ArrowUpRight size={20} />
                   </div>
                </div>
              </div>
            ))}

            {/* PROJECTED ITEMS */}
            {filteredData.projected.map(item => (
              <div key={item.id} className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-400 dark:hover:border-indigo-600 transition-all relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                         <Repeat size={24} />
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{item.clientName}</h4>
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase rounded border border-indigo-100 dark:border-indigo-800">Future Cycle</span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.frequency} Installment Ref: <span className="font-black">{item.parentRef}</span></p>
                      </div>
                   </div>
                   <div className="flex flex-1 md:justify-center items-center gap-8 border-l border-r border-slate-50 dark:border-slate-800 border-dashed px-10">
                      <div className="text-center">
                         <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Forecast Date</div>
                         <div className="text-sm font-black text-slate-800 dark:text-slate-100">{item.date}</div>
                      </div>
                      <div className="text-center">
                         <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Automation</div>
                         <div className="text-sm font-black text-emerald-600 dark:text-emerald-500 uppercase flex items-center gap-1">
                            <CheckCircle2 size={12} /> Cycle Ready
                         </div>
                      </div>
                   </div>
                   <div className="text-right min-w-[150px]">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Forecast Value</div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(item.amount, item.currency)}</div>
                   </div>
                   <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 opacity-40">
                      <Clock size={20} />
                   </div>
                </div>
              </div>
            ))}

            {(filteredData.unpaid.length === 0 && filteredData.projected.length === 0) && (
              <div className="py-24 text-center bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                 <CalendarClock className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={64} />
                 <h4 className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No matching cashflows</h4>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">Try adjusting your filters or date range to see more results.</p>
                 <button onClick={clearFilters} className="mt-6 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-[0.2em] border-b-2 border-indigo-100 dark:border-indigo-900 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all">Reset All Parameters</button>
              </div>
            )}
         </div>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/50 flex flex-col md:flex-row items-center gap-8">
         <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0 border border-indigo-50 dark:border-indigo-900">
            <Info size={32} />
         </div>
         <div className="flex-1">
            <h5 className="text-sm font-black text-indigo-900 dark:text-indigo-100 mb-1 uppercase tracking-tight">Projection Methodology</h5>
            <p className="text-xs text-indigo-800/70 dark:text-indigo-300/70 font-medium leading-relaxed">
               The dashboard currently displays a <span className="font-bold">rolling forecast</span> based on active corporate contracts. Projections are automatically constrained by the <strong>Total Contractual Commitment</strong> and use calculated <strong>Installment Values</strong> to ensure financial accuracy across multi-month terms.
            </p>
         </div>
      </div>
    </div>
  );
};

export default UpcomingInvoicesView;