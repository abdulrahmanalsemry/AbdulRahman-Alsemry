
import React, { useState } from 'react';
import { OperationalExpense, ExpenseFrequency } from '../types';
import { Plus, CreditCard, RefreshCw, X, Repeat, Edit2, Trash2, FileSpreadsheet, FileText, ChevronDown, Check, Info } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { CURRENCY_LIST } from '../App';

interface Props {
  expenses: OperationalExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<OperationalExpense[]>>;
  formatMoney: (val: number, currencyCode?: string) => string;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
}

const INITIAL_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Software', 'Travel', 'Logistics', 'Others'];

const ExpensesView: React.FC<Props> = ({ expenses, setExpenses, formatMoney, baseCurrency, exchangeRates }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [categories] = useState<string[]>(INITIAL_CATEGORIES);
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const [newExp, setNewExp] = useState<Partial<OperationalExpense> & { cyclesToGenerate: number }>({
    category: 'Rent',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    frequency: 'Monthly',
    currency: baseCurrency,
    exchangeRate: 1,
    cyclesToGenerate: 1
  });

  const handleSave = () => {
    if (!newExp.amount || !newExp.description) return;

    // Use current time to make the timestamp "correct" for the user's local entry moment
    const now = new Date();
    const [year, month, day] = (newExp.date || now.toISOString().split('T')[0]).split('-').map(Number);
    
    // Create a local date with the selected day but CURRENT time
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const entryDate = finalDate.toISOString();

    const firstEntry: OperationalExpense = {
      ...newExp as OperationalExpense,
      id: Math.random().toString(36).substr(2, 9),
      date: entryDate,
      remainingCycles: newExp.recurring ? (newExp.cyclesToGenerate - 1) : 0,
      lastGeneratedDate: entryDate,
    };

    if (editingExpense) {
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...firstEntry, id: editingExpense.id } : e));
    } else {
      setExpenses(prev => [...prev, firstEntry]);
    }

    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setNewExp({
      category: 'Rent',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      recurring: false,
      frequency: 'Monthly',
      currency: baseCurrency,
      exchangeRate: 1,
      cyclesToGenerate: 1
    });
    setEditingExpense(null);
  };

  const syncRecurringExpenses = () => {
    const now = new Date();
    let updatedCount = 0;
    
    const newExpenses = [...expenses];
    const createdEntries: OperationalExpense[] = [];

    newExpenses.forEach((exp) => {
      if (exp.recurring && (exp.remainingCycles || 0) > 0) {
        let lastDate = new Date(exp.lastGeneratedDate || exp.date);
        
        const calculateNext = (d: Date) => {
          const nd = new Date(d);
          switch (exp.frequency) {
            case '1 Hour': nd.setHours(nd.getHours() + 1); break;
            case 'Half Day': nd.setHours(nd.getHours() + 12); break;
            case 'Daily': nd.setDate(nd.getDate() + 1); break;
            case 'Monthly': nd.setMonth(nd.getMonth() + 1); break;
            case 'Quarterly': nd.setMonth(nd.getMonth() + 3); break;
            case 'Half Year': nd.setMonth(nd.getMonth() + 6); break;
            case 'Yearly': nd.setFullYear(nd.getFullYear() + 1); break;
          }
          return nd;
        };

        let tempNext = calculateNext(lastDate);
        
        while (tempNext <= now && (exp.remainingCycles || 0) > 0) {
          createdEntries.push({
            ...exp,
            id: Math.random().toString(36).substr(2, 9),
            date: tempNext.toISOString(),
            recurring: false,
            remainingCycles: 0,
            lastGeneratedDate: undefined
          });

          exp.lastGeneratedDate = tempNext.toISOString();
          exp.remainingCycles = (exp.remainingCycles || 0) - 1;
          updatedCount++;
          tempNext = calculateNext(tempNext);
        }
        
        if (exp.remainingCycles === 0) exp.recurring = false;
      }
    });

    if (updatedCount > 0) {
      setExpenses([...newExpenses, ...createdEntries]);
      alert(`Ledger Synchronized: ${updatedCount} cycle(s) realized.`);
    } else {
      alert("No cycles currently due for generation.");
    }
  };

  const handleDelete = () => {
    if (!expenseToDelete) return;
    setExpenses(prev => prev.filter(e => e.id !== expenseToDelete));
    setExpenseToDelete(null);
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/\//g, '/');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full lg:w-auto">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 mb-2">
                <CreditCard size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Aggregate Overhead</span>
             </div>
             <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
               {formatMoney(expenses.reduce((s, e) => s + (e.amount / e.exchangeRate), 0))}
             </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-3 text-indigo-500 mb-2">
                <Repeat size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Active Subscriptions</span>
             </div>
             <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
               {expenses.filter(e => e.recurring).length} Master Nodes
             </div>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
           <button onClick={() => {}} className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 px-6 py-4 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
             <FileSpreadsheet size={18} className="text-emerald-600" /> CSV
           </button>
           <button onClick={syncRecurringExpenses} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-6 py-4 rounded-xl font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
             <RefreshCw size={18} /> SYNC CYCLES
           </button>
           <button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl active:scale-95 transition-all">
             <Plus size={18} /> Record Overhead
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-8 py-6">Expense Identity</th>
              <th className="px-8 py-6">Category</th>
              <th className="px-8 py-6">Timestamp</th>
              <th className="px-8 py-6 text-right">Magnitude</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.sort((a,b) => b.date.localeCompare(a.date)).map(exp => (
              <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${exp.recurring ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                      {exp.recurring ? <RefreshCw size={16} className="animate-spin-slow" /> : <CreditCard size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{exp.description}</div>
                      {exp.recurring && (
                        <div className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1">
                          <Repeat size={10} /> {exp.frequency} Cycle • {exp.remainingCycles} left
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase border border-slate-200 dark:border-slate-700">
                    {exp.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {formatTimestamp(exp.date)}
                </td>
                <td className="px-8 py-6 text-right font-black text-indigo-600 dark:text-indigo-400">
                  {formatMoney(exp.amount, exp.currency)}
                </td>
                <td className="px-8 py-6 text-right flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setNewExp({...exp, cyclesToGenerate: (exp.remainingCycles || 0) + 1}); setEditingExpense(exp); setShowAdd(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                  <button onClick={() => { setExpenseToDelete(exp.id); setShowDeleteConfirm(true); }} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">No overhead records in current registry.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex justify-between items-center bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-600/30">
                  <CreditCard size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Log Transaction</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6">
              <div className="relative group">
                <select 
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-black text-slate-800 dark:text-white outline-none appearance-none cursor-pointer"
                  value={newExp.category}
                  onChange={e => setNewExp({...newExp, category: e.target.value})}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <input 
                  type="text" 
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="e.g. Muscat Hub Server Subscription"
                  value={newExp.description}
                  onChange={e => setNewExp({...newExp, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value ({baseCurrency})</label>
                  <input 
                    type="number" 
                    className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 font-black text-2xl dark:text-white outline-none"
                    value={newExp.amount}
                    onChange={e => setNewExp({...newExp, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effective Date</label>
                  <input 
                    type="date" 
                    className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 font-bold dark:text-white outline-none"
                    value={newExp.date}
                    onChange={e => setNewExp({...newExp, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-[1.5rem] border border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${newExp.recurring ? 'text-indigo-600' : 'text-slate-300'}`}>
                    <Repeat size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-white">Subscription Cycle</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Automate future ledger nodes</div>
                  </div>
                </div>
                <div 
                  onClick={() => setNewExp({...newExp, recurring: !newExp.recurring})}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${newExp.recurring ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${newExp.recurring ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              {newExp.recurring && (
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] space-y-6 animate-in slide-in-from-top-4 duration-300 border border-indigo-50 dark:border-indigo-900/20">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1">Billing Period</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['1 Hour', 'Half Day', 'Daily', 'Monthly', 'Quarterly', 'Half Year', 'Yearly'].map(freq => (
                        <button 
                          key={freq}
                          type="button"
                          onClick={() => setNewExp({...newExp, frequency: freq as ExpenseFrequency})}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black transition-all border ${
                            newExp.frequency === freq 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-indigo-200'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1">Total Lifecycle Cycles</label>
                    <input 
                      type="number"
                      min="1"
                      className="w-full p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-900 font-black text-indigo-600 outline-none"
                      value={newExp.cyclesToGenerate}
                      onChange={e => setNewExp({...newExp, cyclesToGenerate: Math.max(1, parseInt(e.target.value) || 1)})}
                    />
                    <div className="flex items-start gap-2 bg-white/60 p-3 rounded-xl border border-indigo-50 mt-2">
                       <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                       <p className="text-[9px] text-indigo-500 font-bold uppercase leading-relaxed">
                          Transactions follow the browser's local timezone. The first cycle starts at your current local time on the selected date.
                       </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-0 flex justify-end items-center gap-8">
              <button onClick={() => setShowAdd(false)} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
              <button onClick={handleSave} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95">Commit Entry</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        onConfirm={handleDelete} 
        title="Purge Transaction" 
        message="Permanently remove this overhead record from the financial ledger? If this is a Master subscription, all remaining cycles will be canceled." 
      />
    </div>
  );
};

export default ExpensesView;
