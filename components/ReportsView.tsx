import React, { useMemo } from 'react';
import { Quote, Invoice, OperationalExpense, Salesperson } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Users, Percent, Wallet, TrendingUp, DollarSign } from 'lucide-react';

interface Props {
  quotes: Quote[];
  invoices: Invoice[];
  expenses: OperationalExpense[];
  team: Salesperson[];
  formatMoney: (val: number, curr?: string) => string;
}

const ReportsView: React.FC<Props> = ({ quotes, invoices, expenses, team, formatMoney }) => {
  const approvedQuotes = quotes.filter(q => q.status === 'Approved');
  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCOGS = approvedQuotes.reduce((s, q) => s + q.costOfGoodsSold, 0);
  const totalCommissions = approvedQuotes.reduce((s, q) => s + q.commissionAmount, 0);
  const totalOpEx = expenses.reduce((s, e) => s + e.amount, 0);
  
  const netProfit = totalRevenue - (totalCOGS + totalCommissions + totalOpEx);

  const allocationData = [
    { name: 'COGS', value: totalCOGS, color: '#94a3b8' },
    { name: 'Commissions', value: totalCommissions, color: '#f59e0b' },
    { name: 'Op. Expenses', value: totalOpEx, color: '#ef4444' },
    { name: 'Net Profit', value: Math.max(0, netProfit), color: '#10b981' },
  ];

  const commissionSummary = useMemo(() => {
    return team.map(member => {
      const memberQuotes = approvedQuotes.filter(q => q.salespersonId === member.id);
      const totalComm = memberQuotes.reduce((sum, q) => sum + q.commissionAmount, 0);
      return {
        name: member.name,
        commission: totalComm,
        revenue: memberQuotes.reduce((sum, q) => sum + q.totalAmount, 0)
      };
    }).filter(d => d.commission > 0 || d.revenue > 0);
  }, [team, approvedQuotes]);

  const monthlyCommissionData = useMemo(() => {
    const months: Record<string, any> = {};
    
    approvedQuotes.forEach(q => {
      const date = new Date(q.date);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      const salesperson = team.find(t => t.id === q.salespersonId)?.name || 'Unknown';

      if (!months[monthKey]) months[monthKey] = { name: monthKey };
      months[monthKey][salesperson] = (months[monthKey][salesperson] || 0) + q.commissionAmount;
    });

    return Object.values(months).sort((a, b) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.indexOf(a.name) - monthNames.indexOf(b.name);
    });
  }, [approvedQuotes, team]);

  const COLORS = ['var(--primary-600)', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-primary-50 dark:bg-primary-900/30 p-3 rounded-xl text-primary-600 dark:text-primary-400"><Percent size={24} /></div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Commissions</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(totalCommissions)}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl text-emerald-600 dark:text-emerald-400"><TrendingUp size={24} /></div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Net Profit</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(netProfit)}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl text-amber-600 dark:text-amber-400"><DollarSign size={24} /></div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Avg. Comm Rate</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {totalRevenue > 0 ? ((totalCommissions / totalRevenue) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Percent size={20} className="text-primary-600 dark:text-primary-400" />
            Commission Share by Salesperson
          </h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={commissionSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="commission"
                >
                  {commissionSummary.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatMoney(value)} 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#64748b' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600 dark:text-primary-400" />
            Overall Revenue Allocation
          </h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatMoney(value)} 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#64748b' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Users size={20} className="text-primary-600 dark:text-primary-400" />
          Monthly Commission Payouts
        </h3>
        <div className="h-96 w-full relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={monthlyCommissionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{backgroundColor: '#1e293b', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value: number) => formatMoney(value)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', color: '#94a3b8'}} />
              {team.map((member, index) => (
                <Bar 
                  key={member.id} 
                  dataKey={member.name} 
                  fill={COLORS[index % COLORS.length]} 
                  stackId="a" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detailed Project P&L Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                      <th className="px-8 py-4">Quote Ref</th>
                      <th className="px-8 py-4">Agent</th>
                      <th className="px-8 py-4 text-right">Revenue</th>
                      <th className="px-8 py-4 text-right">Comm.</th>
                      <th className="px-8 py-4 text-right">Net Profit</th>
                      <th className="px-8 py-4 text-center">Efficiency</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {approvedQuotes.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800 dark:text-slate-100">{q.quoteNumber}</td>
                          <td className="px-8 py-4 font-medium text-slate-500 dark:text-slate-400">{team.find(t => t.id === q.salespersonId)?.name}</td>
                          <td className="px-8 py-4 text-right font-bold text-slate-800 dark:text-slate-100">{formatMoney(q.totalAmount)}</td>
                          <td className="px-8 py-4 text-right text-amber-500 dark:text-amber-400">-{formatMoney(q.commissionAmount)}</td>
                          <td className="px-8 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">{formatMoney(q.netProfit)}</td>
                          <td className="px-8 py-4 text-center">
                              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold">
                                  {((q.netProfit / (q.totalAmount || 1)) * 100).toFixed(0)}%
                              </span>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;