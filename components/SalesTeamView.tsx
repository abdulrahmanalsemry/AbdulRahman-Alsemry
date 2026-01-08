import React, { useState, useMemo } from 'react';
import { Salesperson, SalespersonType, CommissionTier, Quote, Invoice, QuoteStatus, Lead } from '../types';
import { 
  UserPlus, Wallet, Briefcase, Percent, Trash2, Plus, Sparkles, TrendingUp, X, History, 
  BarChart3, PieChart, Target, DollarSign, Settings, ShieldCheck, UserCheck, 
  ChevronRight, Lightbulb, CheckCircle2, AlertCircle, Coins, Flame, Trophy,
  Star, ArrowUpRight, Activity, CalendarDays
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  team: Salesperson[];
  setTeam: React.Dispatch<React.SetStateAction<Salesperson[]>>;
  quotes: Quote[];
  invoices: Invoice[];
  formatMoney: (val: number, curr?: string) => string;
  leads?: Lead[];
  isSalesRole?: boolean;
  currentSalesperson?: Salesperson | null;
}

const SalesTeamView: React.FC<Props> = ({ 
  team, setTeam, quotes, invoices, formatMoney, leads = [], 
  isSalesRole, currentSalesperson 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [auditMember, setAuditMember] = useState<Salesperson | null>(null);
  
  const [member, setMember] = useState<Partial<Salesperson>>({
    name: '',
    type: SalespersonType.FIXED_PLUS_COMMISSION,
    baseSalary: 0,
    commissionRate: 5,
    operationalBudget: 0,
    monthlyLeadsTarget: 10,
    commissionDetails: {
      tieredRates: [],
      performanceBonusThreshold: 0,
      performanceBonusAmount: 0
    }
  });

  const getMemberMetrics = useMemo(() => (m: Salesperson) => {
    const memberQuotes = quotes.filter(q => q.salespersonId === m.id);
    const approvedQuotes = memberQuotes.filter(q => q.status === QuoteStatus.APPROVED);
    const memberInvoices = invoices.filter(inv => memberQuotes.some(q => q.id === inv.quoteId));
    
    const winsCount = approvedQuotes.length;
    const myLeads = leads.filter(l => l.salespersonId === m.id);
    const totalLeadsCount = myLeads.length || winsCount;
    const conversionRate = totalLeadsCount > 0 ? (winsCount / totalLeadsCount) * 100 : 0;
    const totalRevenue = memberInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalCommission = approvedQuotes.reduce((sum, q) => sum + q.commissionAmount, 0);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyVisits = myLeads.filter(l => l.visitDate.startsWith(currentMonth)).length;
    const visitTarget = m.monthlyLeadsTarget || 10;
    const visitProgress = Math.min(100, (monthlyVisits / visitTarget) * 100);

    return { 
      totalQuotes: memberQuotes.length, 
      winsCount, 
      totalLeadsCount, 
      conversionRate, 
      totalRevenue, 
      totalCommission,
      monthlyVisits,
      visitTarget,
      visitProgress
    };
  }, [quotes, invoices, leads]);

  const resetForm = () => {
    setMember({ 
      name: '', 
      type: SalespersonType.FIXED_PLUS_COMMISSION, 
      baseSalary: 0, 
      commissionRate: 5, 
      operationalBudget: 0,
      monthlyLeadsTarget: 10,
      commissionDetails: {
        tieredRates: [],
        performanceBonusThreshold: 0,
        performanceBonusAmount: 0
      }
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAdd(true);
  };

  const handleOpenEdit = (m: Salesperson) => {
    setMember(JSON.parse(JSON.stringify(m)));
    setIsEditing(true);
    setShowAdd(true);
  };

  const handleOpenAudit = (m: Salesperson) => {
    setAuditMember(m);
    setShowAuditModal(true);
  };

  const handleSave = () => {
    if (!member.name) return;
    
    if (isEditing && member.id) {
      setTeam(team.map(t => t.id === member.id ? (member as Salesperson) : t));
    } else {
      const newMember: Salesperson = {
        ...member as Salesperson,
        id: Math.random().toString(36).substr(2, 9)
      };
      setTeam([...team, newMember]);
    }
    
    setShowAdd(false);
    resetForm();
  };

  if (isSalesRole && currentSalesperson) {
    const m = getMemberMetrics(currentSalesperson);
    const upcomingFollowUps = leads
      .filter(l => l.salespersonId === currentSalesperson.id && l.followUpDate && new Date(l.followUpDate) >= new Date())
      .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''))
      .slice(0, 5);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
            <div className="flex items-center gap-6">
              <div className="bg-primary-600 p-5 rounded-3xl shadow-xl shadow-primary-500/20">
                <Trophy size={48} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter">My Performance Matrix</h2>
                <p className="text-primary-200 font-medium">Tracking your commercial trajectory and field activity quotas.</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 flex items-center gap-8 min-w-[320px]">
               <div className="flex-1">
                  <div className="text-[10px] font-black uppercase text-primary-300 tracking-widest mb-1">Invoiced Revenue</div>
                  <div className="text-3xl font-black">{formatMoney(m.totalRevenue)}</div>
               </div>
               <div className="p-4 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg shadow-emerald-500/20">
                  <TrendingUp size={24} />
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                       <Target size={20} className="text-primary-600" /> Visit Quota
                    </h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.monthlyVisits} / {m.visitTarget}</span>
                 </div>
                 <p className="text-sm text-slate-500 font-medium">Your progress toward this month's field lead target.</p>
              </div>
              
              <div className="py-8 flex flex-col items-center">
                 <div className="relative w-44 h-44">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                       <circle className="text-slate-100 dark:text-slate-800 stroke-current" strokeWidth="8" cx="50" cy="50" r="42" fill="transparent"></circle>
                       <circle className="text-primary-600 stroke-current transition-all duration-1000 ease-out" strokeWidth="8" strokeDasharray={`${m.visitProgress * 2.63}, 263.8`} strokeLinecap="round" cx="50" cy="50" r="42" fill="transparent" transform="rotate(-90 50 50)"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{m.visitProgress.toFixed(0)}%</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase">Reached</span>
                    </div>
                 </div>
                 {m.visitTarget - m.monthlyVisits > 0 ? (
                    <div className="mt-6 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-100 dark:border-amber-800 flex items-center gap-2">
                       <Flame size={12} /> {m.visitTarget - m.monthlyVisits} visits remaining to target
                    </div>
                 ) : (
                    <div className="mt-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-amber-800 flex items-center gap-2">
                       <Star size={12} /> Quota Achievement Unlocked
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversion</div>
                    <div className="text-xl font-black text-primary-600">{m.conversionRate.toFixed(1)}%</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Wins</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">{m.winsCount}</div>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays size={20} className="text-primary-600" /> High-Priority Matrix
                 </h3>
                 <span className="bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-black px-3 py-1 rounded-full uppercase">Week 43</span>
              </div>
              <div className="space-y-4 flex-1">
                 {upcomingFollowUps.length > 0 ? (
                    upcomingFollowUps.map(l => (
                       <div key={l.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-primary-400 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-2">
                             <div className="font-black text-slate-800 dark:text-slate-100 group-hover:text-primary-600 truncate">{l.companyName}</div>
                             <div className="text-[9px] font-black text-white bg-primary-600 px-2 py-0.5 rounded-lg shadow-md">{l.followUpDate}</div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                             <UserCheck size={12} className="text-slate-300" /> {l.contactPerson}
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                       <CheckCircle2 size={64} className="mb-4" />
                       <p className="font-black uppercase text-xs tracking-widest">Pipeline Clear</p>
                    </div>
                 )}
              </div>
              <div className="mt-8 bg-primary-50 dark:bg-primary-900/30 p-6 rounded-[2rem] border border-primary-100 dark:border-primary-800 flex items-start gap-4">
                 <Lightbulb className="text-primary-500 shrink-0 mt-1" size={20} />
                 <p className="text-xs text-primary-900 dark:text-primary-200 leading-relaxed font-medium">
                    <span className="font-black">Strategy Tip:</span> Consistent follow-up within 48 hours of initial field visits increases conversion probability by 40% in the OMR market.
                 </p>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                 <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Coins size={20} className="text-primary-600" /> Commission Yield
                 </h3>
                 
                 <div className="space-y-4">
                    <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                       <div className="text-[10px] font-black uppercase text-primary-400 tracking-widest mb-1">Earned to Date</div>
                       <div className="text-3xl font-black">{formatMoney(m.totalCommission)}</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                       <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-primary-100 dark:bg-primary-900/50 text-primary-600 rounded-lg"><Activity size={16}/></div>
                             <span className="text-[10px] font-black uppercase text-slate-500">Quotes Hub</span>
                          </div>
                          <span className="text-sm font-black dark:text-slate-100">{m.totalQuotes} Issued</span>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-lg"><CheckCircle2 size={16}/></div>
                             <span className="text-[10px] font-black uppercase text-slate-500">Wins Logged</span>
                          </div>
                          <span className="text-sm font-black dark:text-slate-100">{m.winsCount} Nodes</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-8">
                 <button 
                   onClick={() => handleOpenAudit(currentSalesperson)}
                   className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95"
                 >
                    <ShieldCheck size={16} /> Request Personal Performance Audit
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Sales Force Matrix</h2>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-agent performance benchmarking & quota analysis</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
        >
          <UserPlus size={18} /> Recruit Agent
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-8 py-6">Representative Profile</th>
              <th className="px-8 py-6">Visit Quota Progress</th>
              <th className="px-8 py-6 text-right">Revenue Yield</th>
              <th className="px-8 py-6 text-center">Conversion</th>
              <th className="px-8 py-6 text-right">Actions Matrix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {team.map((t) => {
              const m = getMemberMetrics(t);
              return (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-black group-hover:bg-primary-600 group-hover:text-white transition-all">
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-2 max-w-[180px]">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className="text-slate-400">{m.monthlyVisits} / {m.visitTarget} visits</span>
                        <span className={m.visitProgress >= 100 ? 'text-emerald-500' : 'text-primary-600'}>{m.visitProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${m.visitProgress >= 100 ? 'bg-emerald-500' : 'bg-primary-600'}`}
                          style={{ width: `${m.visitProgress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100">{formatMoney(m.totalRevenue)}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Net Comm: {formatMoney(m.totalCommission)}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                         m.conversionRate > 30 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                         m.conversionRate > 15 ? 'bg-primary-100 text-primary-700 border-primary-200' :
                         'bg-slate-100 text-slate-600 border-slate-200'
                       }`}>
                         {m.conversionRate.toFixed(1)}% Ratio
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenAudit(t)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-800 shadow-sm transition-all" title="Audit Performance"><History size={18}/></button>
                      <button onClick={() => handleOpenEdit(t)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-800 shadow-sm transition-all" title="Configure Agent"><Settings size={18}/></button>
                      <button onClick={() => { setMemberToDelete(t.id); setShowConfirmDelete(true); }} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-red-500 border border-slate-100 dark:border-slate-800 shadow-sm transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-primary-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary-600/20 col-span-1 md:col-span-2 relative overflow-hidden">
            <TrendingUp className="absolute -bottom-4 -right-4 w-40 h-40 opacity-10" />
            <div className="relative z-10 space-y-4">
               <div className="text-[10px] font-black uppercase tracking-widest text-primary-200">Force Wide Efficiency</div>
               <div className="text-4xl font-black">
                  {(team.reduce((s,t) => s + getMemberMetrics(t).conversionRate, 0) / (team.length || 1)).toFixed(1)}% Avg Ratio
               </div>
               <p className="text-sm font-medium text-primary-100/70 max-w-sm leading-relaxed">Cross-agent analysis of closing capacity across the current lead registry.</p>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Force Revenue</div>
               <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {formatMoney(team.reduce((s,t) => s + getMemberMetrics(t).totalRevenue, 0))}
               </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-tighter mt-4">
               <ArrowUpRight size={14} /> 12% increase from last audit
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visit Quota Density</div>
               <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {team.reduce((s,t) => s + getMemberMetrics(t).monthlyVisits, 0)} Logged
               </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
               <div className="bg-primary-600 h-full w-[68%]" />
            </div>
         </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg">
                  <Settings size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {isEditing ? 'Update Representative' : 'Configure Representative'}
                </h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-10 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/10 bg-white dark:bg-slate-800 dark:text-white transition-all font-bold"
                        placeholder="e.g. Salim Al-Abri"
                        value={member.name}
                        onChange={(e) => setMember({...member, name: e.target.value})}
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Email (Matrix Sync)</label>
                      <input 
                        type="email" 
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/10 bg-white dark:bg-slate-800 dark:text-white transition-all font-bold"
                        placeholder="agent@company.om"
                        value={member.email}
                        onChange={(e) => setMember({...member, email: e.target.value})}
                      />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Model</label>
                      <select 
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/10 bg-white dark:bg-slate-800 dark:text-white transition-all font-bold appearance-none"
                        value={member.type}
                        onChange={(e) => setMember({...member, type: e.target.value as SalespersonType})}
                      >
                          {Object.values(SalespersonType).map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Monthly Lead Target</label>
                      <input 
                        type="number" 
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-primary-600"
                        value={member.monthlyLeadsTarget}
                        onChange={(e) => setMember({...member, monthlyLeadsTarget: parseInt(e.target.value) || 0})}
                      />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px] flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Wallet size={16} className="text-slate-400 dark:text-slate-500" /> BASE FINANCIALS & INCENTIVES
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {member.type === SalespersonType.FIXED_PLUS_COMMISSION && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Base Salary</label>
                            <input 
                              type="number" 
                              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold"
                              value={member.baseSalary}
                              onChange={(e) => setMember({...member, baseSalary: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Base Rate (%)</label>
                          <input 
                            type="number" 
                            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-primary-600 dark:text-primary-400"
                            value={member.commissionRate}
                            onChange={(e) => setMember({...member, commissionRate: parseFloat(e.target.value) || 0})}
                          />
                      </div>

                      {member.type !== SalespersonType.COMMISSION_ONLY && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Op. Budget</label>
                            <input 
                              type="number" 
                              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold"
                              value={member.operationalBudget}
                              onChange={(e) => setMember({...member, operationalBudget: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary-500" /> TIERED COMMISSION SCALING
                      </h4>
                      <button onClick={() => {
                        const details = member.commissionDetails || { tieredRates: [], performanceBonusThreshold: 0, performanceBonusAmount: 0 };
                        setMember({...member, commissionDetails: {...details, tieredRates: [...(details.tieredRates || []), { threshold: 0, rate: 0 }]}});
                      }} className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest flex items-center gap-1 hover:underline">
                         <Plus size={14} /> Add Threshold
                      </button>
                   </div>
                   <div className="space-y-3">
                      {(member.commissionDetails?.tieredRates || []).length > 0 ? (
                        member.commissionDetails!.tieredRates.map((tier, idx) => (
                           <div key={idx} className="grid grid-cols-12 gap-4 items-end bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div className="col-span-6 space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Threshold Value</label>
                                 <input 
                                   type="number" 
                                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                   placeholder="e.g. 5000"
                                   value={tier.threshold}
                                   onChange={e => {
                                     const newTiers = [...member.commissionDetails!.tieredRates];
                                     newTiers[idx].threshold = parseFloat(e.target.value) || 0;
                                     setMember({...member, commissionDetails: {...member.commissionDetails!, tieredRates: newTiers}});
                                   }}
                                 />
                              </div>
                              <div className="col-span-4 space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate (%)</label>
                                 <input 
                                   type="number" 
                                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black text-primary-600"
                                   placeholder="8"
                                   value={tier.rate}
                                   onChange={e => {
                                     const newTiers = [...member.commissionDetails!.tieredRates];
                                     newTiers[idx].rate = parseFloat(e.target.value) || 0;
                                     setMember({...member, commissionDetails: {...member.commissionDetails!, tieredRates: newTiers}});
                                   }}
                                 />
                              </div>
                              <div className="col-span-2 flex justify-center">
                                 <button onClick={() => {
                                   const newTiers = member.commissionDetails!.tieredRates.filter((_, i) => i !== idx);
                                   setMember({...member, commissionDetails: {...member.commissionDetails!, tieredRates: newTiers}});
                                 }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                              </div>
                           </div>
                        ))
                      ) : (
                        <div className="py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                           <div className="text-[10px] font-black uppercase tracking-widest">No tiered scaling defined</div>
                        </div>
                      )}
                   </div>
                </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-white dark:bg-slate-900 sticky bottom-0 z-10 shadow-2xl">
                <button onClick={() => setShowAdd(false)} className="px-10 py-4 font-black uppercase tracking-widest text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button>
                <button onClick={handleSave} className="bg-primary-600 text-white px-14 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-2xl shadow-primary-600/30 transition-all active:scale-95">
                  Deploy to Force
                </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                 <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-3 rounded-2xl">
                    <History size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Agent Audit Log</h3>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-0.5">{auditMember.name}</p>
                 </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/20">
               <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const m = getMemberMetrics(auditMember);
                    return (
                      <>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                           <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                              <BarChart3 size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Pipeline</span>
                           </div>
                           <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{m.totalQuotes}</div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Total Quotes Issued</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                           <div className="flex items-center gap-2 text-primary-600">
                              <UserCheck size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Conversion</span>
                           </div>
                           <div className="text-2xl font-black text-primary-600 dark:text-primary-400">{m.conversionRate.toFixed(1)}%</div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{m.winsCount} Wins / {m.totalLeadsCount} Leads</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                           <div className="flex items-center gap-2 text-emerald-600">
                              <Coins size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Revenue</span>
                           </div>
                           <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatMoney(m.totalRevenue)}</div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Value Invoiced</p>
                        </div>
                        <div className="bg-primary-600 p-6 rounded-3xl shadow-xl shadow-primary-600/20 text-white space-y-3">
                           <div className="flex items-center gap-2 text-primary-200">
                              <PieChart size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Commission</span>
                           </div>
                           <div className="text-lg font-black">{formatMoney(m.totalCommission)}</div>
                           <p className="text-[9px] font-bold text-primary-100/60 uppercase tracking-tight">Total Earned YTD</p>
                        </div>
                      </>
                    );
                  })()}
               </div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Lightbulb size={14} className="text-amber-500" /> FORCE BENCHMARKING
                  </h4>
                  <div className="space-y-3">
                     {(() => {
                        const m = getMemberMetrics(auditMember);
                        return (
                          <>
                            <div className="flex items-start gap-3">
                               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5" />
                               <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  This agent maintains a <span className="font-black text-slate-800 dark:text-slate-100">{m.conversionRate > 30 ? 'High' : 'Standard'}</span> closing ratio relative to the force average.
                               </p>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5" />
                               <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  Average deal realization value: <span className="font-black text-slate-800 dark:text-slate-100">{formatMoney(m.winsCount > 0 ? m.totalRevenue / m.winsCount : 0)}</span> per conversion node.
                               </p>
                            </div>
                          </>
                        );
                     })()}
                  </div>
               </div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
               <button onClick={() => setShowAuditModal(false)} className="bg-slate-950 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                 Terminate Audit
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => { if (memberToDelete) setTeam(team.filter(t => t.id !== memberToDelete)); setMemberToDelete(null); }}
        title="Purge Agent Data"
        message="This operation erases all historical commercial logs for this agent. This action is irreversible."
      />
    </div>
  );
};

export default SalesTeamView;