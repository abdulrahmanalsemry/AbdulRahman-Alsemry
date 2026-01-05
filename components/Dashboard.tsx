import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Quote, Invoice, OperationalExpense, Lead, Salesperson, QuoteStatus } from '../types';
import { 
  DollarSign, FileCheck, ShoppingCart, TrendingUp, 
  Users, Target, CalendarDays, Clock, ArrowUpRight, 
  CheckCircle2, AlertTriangle, Coins, Briefcase, MapPinned,
  ChevronRight, Footprints, MessageSquare, HandCoins, Activity,
  Receipt, History, Flame, Banknote, X, Search, FileText
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  invoices: Invoice[];
  expenses: OperationalExpense[];
  formatMoney: (val: number) => string;
  onViewAllTransactions?: () => void;
  isSalesRole?: boolean;
  salesperson?: Salesperson | null;
  leads?: Lead[];
  userRoleId?: string;
}

const Dashboard: React.FC<Props> = ({ 
  quotes, invoices, expenses, formatMoney, 
  onViewAllTransactions, salesperson, leads = [], userRoleId 
}) => {
  
  // --- ROLES DEFINITIONS ---
  const isLeadsFocus = userRoleId === 'role-sales-team-leads';
  const isAccountant = userRoleId === 'role-accountant';

  // --- STATE FOR INTERACTIVE DRILL-DOWN ---
  const [selectedMonthReport, setSelectedMonthReport] = useState<{name: string, monthYear: string} | null>(null);

  // --- ACCRUAL COST CALCULATION HELPER ---
  // This helper calculates the COGS and Commission portion for a specific month OR total realized up to now.
  const calculateRealizedCosts = (quote: Quote, targetMonthYear?: string) => {
    let realizedCOGS = 0;
    let realizedComm = 0;
    
    if (quote.status !== QuoteStatus.APPROVED) return { cogs: 0, comm: 0 };

    const quoteStartDate = new Date(quote.date);
    const quoteMY = `${quoteStartDate.getFullYear()}-${(quoteStartDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const discountRatio = quote.subtotal > 0 ? (quote.totalAmount / quote.subtotal) : 1;

    quote.items.forEach(item => {
      const lineTerm = item.billingFrequency === 'One-time' ? 1 : item.contractMonths;
      const totalLineRevenue = item.quantity * item.unitPrice * lineTerm;
      const totalLineCOGS = item.quantity * item.costOfGoodsSold * lineTerm;
      
      // CALCULATION SYNC: Commission is now calculated based on Net Revenue (Gross - Discount)
      const netLineRevenue = totalLineRevenue * discountRatio;
      const totalLineComm = netLineRevenue * (quote.appliedCommissionRate / 100);
      
      const monthlyCOGS = totalLineCOGS / lineTerm;
      const monthlyComm = totalLineComm / lineTerm;

      if (item.billingFrequency === 'One-time') {
        // Only count if it's the specific month we are looking for (or all time)
        if (!targetMonthYear || targetMonthYear === quoteMY) {
          realizedCOGS += totalLineCOGS;
          realizedComm += totalLineComm;
        }
      } else {
        // Recurring: Check how many months have passed since quote approval
        if (targetMonthYear) {
          // Check if the specific monthYear falls within the contract window
          const target = new Date(targetMonthYear + "-01");
          const diffMonths = (target.getFullYear() - quoteStartDate.getFullYear()) * 12 + (target.getMonth() - quoteStartDate.getMonth());
          if (diffMonths >= 0 && diffMonths < item.contractMonths) {
            realizedCOGS += monthlyCOGS;
            realizedComm += monthlyComm;
          }
        } else {
          // Total realized since the start up to TODAY
          const now = new Date();
          const diffMonths = (now.getFullYear() - quoteStartDate.getFullYear()) * 12 + (now.getMonth() - quoteStartDate.getMonth());
          const monthsPassed = Math.max(0, Math.min(item.contractMonths, diffMonths + 1));
          realizedCOGS += monthlyCOGS * monthsPassed;
          realizedComm += monthlyComm * monthsPassed;
        }
      }
    });

    return { cogs: realizedCOGS, comm: realizedComm };
  };

  // --- COMMON CALCULATIONS ---
  // Revenue: Simple sum of issued invoices
  const totalRevenue = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  
  // Realized Costs: The sum of costs accrued for approved deals up to today
  const { totalRealizedCOGS, totalRealizedComm } = useMemo(() => {
    return quotes.reduce((acc, q) => {
      const { cogs, comm } = calculateRealizedCosts(q);
      return { totalRealizedCOGS: acc.totalRealizedCOGS + cogs, totalRealizedComm: acc.totalRealizedComm + comm };
    }, { totalRealizedCOGS: 0, totalRealizedComm: 0 });
  }, [quotes]);

  const opExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  
  // Net Profit: Total Revenue - (Realized Direct Costs + OpEx)
  const netProfit = totalRevenue - (totalRealizedCOGS + totalRealizedComm + opExpenses);

  // --- DYNAMIC CHART DATA GENERATION ---
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const monthYear = `${year}-${monthStr}`;
      
      const monthlyInvoices = invoices.filter(inv => inv.date.startsWith(monthYear));
      const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(monthYear));
      
      const rev = monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const opex = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Calculate costs belonging specifically to this month window
      let cogsThisMonth = 0;
      let commThisMonth = 0;
      quotes.forEach(q => {
        const { cogs, comm } = calculateRealizedCosts(q, monthYear);
        cogsThisMonth += cogs;
        commThisMonth += comm;
      });
      
      const outflow = cogsThisMonth + commThisMonth + opex;
      const profit = rev - outflow;
      
      months.push({
        name: monthLabel,
        fullYear: year,
        monthYear: monthYear,
        rev: rev,
        exp: outflow,
        profit: profit,
        cogs: cogsThisMonth,
        comm: commThisMonth,
        opex: opex
      });
    }
    return months;
  }, [invoices, quotes, expenses]);

  // --- DRILL-DOWN MODAL DATA ---
  const monthAuditDetails = useMemo(() => {
    if (!selectedMonthReport) return null;
    const my = selectedMonthReport.monthYear;
    
    const monthlyInvoices = invoices.filter(inv => inv.date.startsWith(my));
    const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(my));
    
    let cogsThisMonth = 0;
    let commThisMonth = 0;
    quotes.forEach(q => {
      const { cogs, comm } = calculateRealizedCosts(q, my);
      cogsThisMonth += cogs;
      commThisMonth += comm;
    });

    const rev = monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const opex = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const profit = rev - (cogsThisMonth + commThisMonth + opex);

    return {
      invoices: monthlyInvoices,
      expenses: monthlyExpenses,
      totals: { rev, cogs: cogsThisMonth, comm: commThisMonth, opex, profit }
    };
  }, [selectedMonthReport, invoices, quotes, expenses]);

  // --- SALES LEADS FOCUS DASHBOARD ---
  if (isLeadsFocus) {
    const myLeads = leads;
    const winsCount = quotes.filter(q => q.status === 'Approved').length;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyVisits = myLeads.filter(l => l.visitDate.startsWith(currentMonth)).length;
    const visitTarget = salesperson?.monthlyLeadsTarget || 10;
    const visitProgress = Math.min(100, (monthlyVisits / visitTarget) * 100);

    const upcomingFollowUps = myLeads
      .filter(l => l.followUpDate && new Date(l.followUpDate) >= new Date())
      .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''))
      .slice(0, 4);

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl"><Target size={24}/></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Visit Quota</span>
             </div>
             <div className="text-3xl font-black text-slate-900 dark:text-white">{monthlyVisits} / {visitTarget}</div>
             <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${visitProgress}%` }} />
             </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><CheckCircle2 size={24}/></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Leads Converted</span>
             </div>
             <div className="text-3xl font-black text-slate-900 dark:text-white">{winsCount} Wins</div>
             <p className="text-[9px] text-emerald-600 font-black uppercase mt-2">Achievement Analysis Active</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl"><Clock size={24}/></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Engagement Pulse</span>
             </div>
             <div className="text-3xl font-black text-slate-900 dark:text-white">{upcomingFollowUps.length} Pending</div>
             <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Next 7 days strategy</p>
          </div>
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <TrendingUp size={24} className="text-indigo-200" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Efficiency</span>
                </div>
                <div className="text-3xl font-black">{(winsCount / (myLeads.length || 1) * 100).toFixed(1)}%</div>
                <p className="text-[9px] text-indigo-200 font-bold uppercase mt-2">Global Scoreboard</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                 <CalendarDays size={20} className="text-indigo-600" /> Upcoming Follow-ups
              </h3>
              <div className="space-y-4">
                 {upcomingFollowUps.length > 0 ? upcomingFollowUps.map(l => (
                   <div key={l.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-300 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 shadow-sm"><Footprints size={20}/></div>
                         <div>
                            <div className="font-black text-slate-800 dark:text-white">{l.companyName}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Contact: {l.contactPerson}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black uppercase text-indigo-600">{l.followUpDate}</div>
                         <div className="text-[8px] text-slate-400 font-bold uppercase">Scheduled Re-entry</div>
                      </div>
                   </div>
                 )) : (
                   <div className="py-20 text-center text-slate-400 font-medium italic">No immediate re-engagements logged.</div>
                 )}
              </div>
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative z-10">
                 <h3 className="text-xl font-black mb-2 flex items-center gap-2">Commercial Trajectory <Activity size={18} className="text-indigo-400"/></h3>
                 <p className="text-indigo-200 text-sm mb-10">Real-time delta of your field conversions vs. approved project nodes.</p>
                 
                 <div className="space-y-6">
                    <div>
                       <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>Visit Quota Density</span><span>{visitProgress.toFixed(0)}%</span></div>
                       <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div className="bg-white h-full" style={{ width: `${visitProgress}%` }} /></div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex items-center gap-6">
                       <div className="bg-indigo-600 p-4 rounded-2xl"><HandCoins size={28}/></div>
                       <div>
                          <div className="text-[10px] font-black uppercase text-indigo-300">Projected Yield</div>
                          <div className="text-2xl font-black">{formatMoney(quotes.reduce((s,q) => s + q.totalAmount, 0))}</div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- ACCOUNTANT DASHBOARD ---
  if (isAccountant) {
    const collected = invoices.reduce((s, i) => s + (i.paymentHistory?.reduce((p, h) => p + h.amount, 0) || 0), 0);
    const receivable = totalRevenue - collected;
    const totalOutflow = totalRealizedCOGS + totalRealizedComm + opExpenses;
    
    const overdueInvoices = invoices.filter(i => i.status !== 'Paid' && new Date(i.dueDate) < new Date());

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><Coins size={24}/></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cash Liquidity</span>
               </div>
               <div className="text-3xl font-black text-slate-900 dark:text-white">{formatMoney(collected)}</div>
               <p className="text-[9px] text-emerald-600 font-black uppercase mt-2">Verified Realized Assets</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl"><Receipt size={24}/></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recievable</span>
               </div>
               <div className="text-3xl font-black text-slate-900 dark:text-white">{formatMoney(receivable)}</div>
               <p className="text-[9px] text-amber-600 font-black uppercase mt-2">Outstanding Ledger Balance</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl"><Flame size={24}/></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Realized Burn</span>
               </div>
               <div className="text-3xl font-black text-slate-900 dark:text-white">{formatMoney(totalOutflow)}</div>
               <p className="text-[9px] text-slate-500 font-black uppercase mt-2">Accrued Direct + OpEx</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden ${netProfit >= 0 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-red-600 text-white border-red-500'}`}>
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="p-3 bg-white/20 text-white rounded-2xl"><Banknote size={24}/></div>
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Enterprise Net Profit</span>
                  </div>
                  <div className="text-3xl font-black">{formatMoney(netProfit)}</div>
                  <p className="text-[9px] font-black uppercase mt-2 opacity-80">Accrual-based bottom-line</p>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                  <History size={20} className="text-indigo-600" /> Settlement Watchlist
               </h3>
               <div className="space-y-4">
                  {overdueInvoices.length > 0 ? overdueInvoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="p-5 bg-red-50/30 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
                       <div>
                          <div className="font-black text-slate-800 dark:text-white">{inv.clientName}</div>
                          <div className="text-[10px] text-red-500 font-bold uppercase">Due since: {inv.dueDate}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-lg font-black text-red-600">{formatMoney(inv.totalAmount)}</div>
                          <button onClick={onViewAllTransactions} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Mark Settlement</button>
                       </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-emerald-500 font-bold italic">All settlements are within cycle terms.</div>
                  )}
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                  <Briefcase size={20} className="text-indigo-600" /> Operational Overhead Distribution
               </h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie 
                          data={expenses.length > 0 ? Array.from(new Set(expenses.map(e => e.category))).map(cat => ({
                            category: cat,
                            amount: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
                          })) : [{category: 'No Data', amount: 1}]} 
                          dataKey="amount" 
                          nameKey="category" 
                          cx="50%" cy="50%" 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={5}
                        >
                           {expenses.map((_, index) => <Cell key={index} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />)}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </div>
    );
  }

  // --- MANAGER / ADMIN DASHBOARD (DEFAULT) ---
  const stats = [
    { label: 'Total Revenue', value: formatMoney(totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pending Quotes', value: quotes.filter(q => q.status !== 'Approved' && q.status !== 'Rejected').length, icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Orders Processed', value: invoices.length, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Net Profit', value: formatMoney(netProfit), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  const handleBarClick = (data: any) => {
    if (data && data.payload) {
      setSelectedMonthReport({ 
        name: data.payload.name, 
        monthYear: data.payload.monthYear 
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl shadow-sm`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <HandCoins size={20} className="text-indigo-600" /> Revenue vs Outflow
             </h3>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Click column to audit</div>
          </div>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Bar 
                   dataKey="rev" 
                   fill="#4f46e5" 
                   radius={[4, 4, 0, 0]} 
                   name="Revenue" 
                   cursor="pointer"
                   onClick={handleBarClick}
                />
                <Bar 
                   dataKey="exp" 
                   fill="#e2e8f0" 
                   radius={[4, 4, 0, 0]} 
                   name="Outflow" 
                   cursor="pointer"
                   onClick={handleBarClick}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black mb-8 text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <TrendingUp size={20} className="text-emerald-500" /> Strategic Profit Trend
          </h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Area type="monotone" dataKey="profit" stroke="#4f46e5" fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DRILL-DOWN AUDIT MODAL */}
      {selectedMonthReport && monthAuditDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg">
                       <Search size={24} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Performance Audit</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMonthReport.name} Cycle Overview</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedMonthReport(null)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors"><X size={28} /></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
                 {/* Audit Totals Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Revenue</div>
                       <div className="text-2xl font-black text-emerald-600">{formatMoney(monthAuditDetails.totals.rev)}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Outflow</div>
                       <div className="text-2xl font-black text-red-600">{formatMoney(monthAuditDetails.totals.cogs + monthAuditDetails.totals.comm + monthAuditDetails.totals.opex)}</div>
                    </div>
                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white">
                       <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Period Net Profit</div>
                       <div className="text-2xl font-black">{formatMoney(monthAuditDetails.totals.profit)}</div>
                    </div>
                 </div>

                 {/* Detailed Sections */}
                 <div className="space-y-8">
                    {/* Revenue Ledger */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                          <Receipt size={14} className="text-indigo-600" /> Revenue Invoices ({monthAuditDetails.invoices.length})
                       </h4>
                       <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-left text-xs">
                             <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-black uppercase">
                                <tr><th className="px-6 py-4">Client</th><th className="px-6 py-4">Ref</th><th className="px-6 py-4 text-right">Magnitude</th></tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {monthAuditDetails.invoices.map(inv => (
                                  <tr key={inv.id}><td className="px-6 py-4 font-bold">{inv.clientName}</td><td className="px-6 py-4 text-slate-500">{inv.invoiceNumber}</td><td className="px-6 py-4 text-right font-black">{formatMoney(inv.totalAmount)}</td></tr>
                                ))}
                                {monthAuditDetails.invoices.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">No revenue nodes found.</td></tr>}
                             </tbody>
                          </table>
                       </div>
                    </div>

                    {/* Cost Structure */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                             <Coins size={14} className="text-amber-500" /> Accrued Direct Costs (Portions)
                          </h4>
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 space-y-4">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Amortized COGS:</span>
                                <span className="font-black text-slate-800 dark:text-slate-100">{formatMoney(monthAuditDetails.totals.cogs)}</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Sales Commissions:</span>
                                <span className="font-black text-slate-800 dark:text-slate-100">{formatMoney(monthAuditDetails.totals.comm)}</span>
                             </div>
                             <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400">Total Direct:</span>
                                <span className="text-lg font-black text-red-600">{formatMoney(monthAuditDetails.totals.cogs + monthAuditDetails.totals.comm)}</span>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                             <Briefcase size={14} className="text-indigo-500" /> Ledger Overhead (OpEx)
                          </h4>
                          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {monthAuditDetails.expenses.map(exp => (
                                        <tr key={exp.id}><td className="px-6 py-3 font-medium text-slate-600 dark:text-slate-300">{exp.description}</td><td className="px-6 py-3 text-right font-black">{formatMoney(exp.amount / exp.exchangeRate)}</td></tr>
                                      ))}
                                      {monthAuditDetails.expenses.length === 0 && <tr><td className="px-6 py-8 text-center text-slate-400 italic">No ledger expenses.</td></tr>}
                                   </tbody>
                                </table>
                             </div>
                             <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400">Total Indirect:</span>
                                <span className="text-sm font-black text-red-600">{formatMoney(monthAuditDetails.totals.opex)}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
                 <button 
                    onClick={() => setSelectedMonthReport(null)}
                    className="bg-slate-900 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                 >
                    Dismiss Audit
                 </button>
              </div>
           </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <History size={20} className="text-indigo-600" /> Recent Enterprise Activity
          </h3>
          <button 
            onClick={onViewAllTransactions}
            className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-2"
          >
            Ledger Overview <ChevronRight size={14}/>
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
              <th className="px-10 py-5">Entity Account</th>
              <th className="px-10 py-5">Activity Date</th>
              <th className="px-10 py-5 text-right">Magnitude</th>
              <th className="px-10 py-5 text-center">Settlement Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.slice(0, 5).map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <td className="px-10 py-5 font-bold text-slate-800 dark:text-slate-100">{inv.clientName}</td>
                <td className="px-10 py-5 text-slate-500 dark:text-slate-400 font-medium text-sm">{inv.date}</td>
                <td className="px-10 py-5 text-right font-black text-slate-900 dark:text-slate-100">{formatMoney(inv.totalAmount)}</td>
                <td className="px-10 py-5">
                  <div className="flex justify-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic font-medium">No activity nodes recorded in this cycle.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;