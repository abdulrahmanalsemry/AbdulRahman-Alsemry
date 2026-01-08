import React, { useState, useMemo } from 'react';
import { Client, Quote, Invoice, CommunicationLog, CommLogType, QuoteStatus } from '../types';
import { 
  UserPlus, Search, Building2, Mail, Phone, MapPin, ChevronRight, 
  FileText, Receipt, X, Trash2, ArrowUpRight, Edit3, MessageSquare, 
  Plus, History, PhoneCall, MailCheck, Users, Calendar, Clock,
  ArrowRightLeft, TrendingUp, Info, AlertCircle
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  quotes: Quote[];
  invoices: Invoice[];
  formatMoney: (val: number, curr?: string) => string;
}

const ClientsView: React.FC<Props> = ({ clients, setClients, quotes, invoices, formatMoney }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'communication'>('financial');
  
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId) || null
  , [clients, selectedClientId]);

  const [newClient, setNewClient] = useState<Partial<Client>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  const [newLog, setNewLog] = useState<Partial<CommunicationLog>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Call',
    summary: '',
    agentName: ''
  });

  const getClientStats = (clientId: string) => {
    const clientQuotes = quotes.filter(q => q.clientId === clientId && q.status === QuoteStatus.APPROVED);
    const clientInvoices = invoices.filter(i => i.clientId === clientId);

    const totalContractCommitment = clientQuotes.reduce((sum, q) => sum + q.totalAmount, 0);
    const totalBilledSoFar = clientInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const otherOutstanding = Math.max(0, totalContractCommitment - totalBilledSoFar);

    let nextBillingDate: string | null = null;
    clientInvoices.forEach(i => {
      if (i.isRecurring) {
        const lastDate = new Date(i.lastGeneratedDate || i.date);
        const nextDate = new Date(lastDate);
        if (i.recurringFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (i.recurringFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (i.recurringFrequency === 'Annual') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        const dateStr = nextDate.toISOString().split('T')[0];
        if (!nextBillingDate || dateStr < nextBillingDate) {
          nextBillingDate = dateStr;
        }
      }
    });

    return { otherOutstanding, nextBillingDate, totalBilledSoFar, totalContractCommitment };
  };

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setNewClient({ companyName: '', contactPerson: '', email: '', phone: '', address: '' });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = () => {
    if (!selectedClient) return;
    setNewClient({ ...selectedClient });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSaveClient = () => {
    if (!newClient.companyName) return;

    if (isEditing && selectedClient) {
      const updatedClient = { ...selectedClient, ...newClient as Client };
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
    } else {
      const finalClient: Client = {
        ...newClient as Client,
        id: Math.random().toString(36).substr(2, 9),
        communicationLogs: []
      };
      setClients([...clients, finalClient]);
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleDeleteClient = () => {
    if (!clientToDelete) return;
    setClients(clients.filter(c => c.id !== clientToDelete));
    if (selectedClientId === clientToDelete) {
      setSelectedClientId(null);
    }
    setClientToDelete(null);
  };

  const handleAddLog = () => {
    if (!selectedClient || !newLog.summary) return;
    
    const log: CommunicationLog = {
      ...newLog as CommunicationLog,
      id: Math.random().toString(36).substr(2, 9)
    };

    const updatedClient = {
      ...selectedClient,
      communicationLogs: [log, ...(selectedClient.communicationLogs || [])]
    };

    setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
    setShowAddLogModal(false);
    setNewLog({ date: new Date().toISOString().split('T')[0], type: 'Call', summary: '', agentName: '' });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'Call': return <PhoneCall size={14} />;
      case 'Email': return <MailCheck size={14} />;
      case 'Meeting': return <Users size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all w-full md:w-auto justify-center active:scale-95"
        >
          <UserPlus size={20} /> Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider px-2">Client Directory</h3>
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {filteredClients.map(client => {
              const { otherOutstanding } = getClientStats(client.id);
              return (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedClientId === client.id 
                      ? 'bg-primary-600 border-primary-600 text-white shadow-lg' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      selectedClientId === client.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {client.companyName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{client.companyName}</h4>
                      {otherOutstanding > 0 && (
                        <div className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${selectedClientId === client.id ? 'text-primary-200' : 'text-primary-500 dark:text-primary-400'}`}>
                          Commitment: {formatMoney(otherOutstanding)}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className={selectedClientId === client.id ? 'text-white' : 'text-slate-300 dark:text-slate-600'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedClient ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex flex-col xl:flex-row justify-between items-start gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">
                      {selectedClient.companyName[0]}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">{selectedClient.companyName}</h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{selectedClient.contactPerson}</p>
                      <div className="flex gap-2 mt-2">
                         <button onClick={handleOpenEdit} className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:underline">Edit Identity</button>
                         <span className="text-slate-300 dark:text-slate-700">•</span>
                         <button onClick={() => { setClientToDelete(selectedClient.id); setShowConfirmDelete(true); }} className="text-xs font-black text-red-400 dark:text-red-500 uppercase tracking-widest hover:underline">Archive</button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const stats = getClientStats(selectedClient.id);
                    return (
                      <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                        <div className="bg-primary-600 p-6 rounded-[2rem] text-white shadow-xl shadow-primary-600/20 min-w-[220px] relative overflow-hidden">
                           <TrendingUp className="absolute -bottom-2 -right-2 w-20 h-20 text-white opacity-5" />
                           <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-primary-100">Contract Remainder</div>
                           <div className="text-2xl font-black">{formatMoney(stats.otherOutstanding)}</div>
                           {stats.nextBillingDate && (
                             <div className="mt-3 flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                                <Calendar size={12} className="text-primary-200" />
                                <span className="text-[9px] font-black uppercase text-primary-100">Next Cycle: {stats.nextBillingDate}</span>
                             </div>
                           )}
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm min-w-[220px]">
                           <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Lifecycle</div>
                           <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatMoney(stats.totalContractCommitment)}</div>
                           <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                              <div 
                                className="bg-primary-600 h-full transition-all duration-1000" 
                                style={{ width: `${(stats.totalBilledSoFar / (stats.totalContractCommitment || 1)) * 100}%` }}
                              />
                           </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"><Mail size={16} /></div>
                    <span className="text-sm font-medium">{selectedClient.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"><Phone size={16} /></div>
                    <span className="text-sm font-medium">{selectedClient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"><MapPin size={16} /></div>
                    <span className="text-sm font-medium truncate">{selectedClient.address}</span>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setActiveTab('financial')}
                    className={`pb-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'financial' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                  >
                    Financial History
                  </button>
                  <button 
                    onClick={() => setActiveTab('communication')}
                    className={`pb-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'communication' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                  >
                    Communication Log
                  </button>
                </div>

                <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  {activeTab === 'financial' ? (
                    <div className="space-y-10">
                      {(() => {
                        const stats = getClientStats(selectedClient.id);
                        if (stats.otherOutstanding > 0) {
                          return (
                            <div className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-[2rem] border border-primary-100 dark:border-primary-800/50 flex items-start gap-4">
                               <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                                  <Clock size={20} />
                               </div>
                               <div>
                                  <h6 className="text-sm font-black text-primary-900 dark:text-primary-100 mb-1">Unrealized Contractual Value</h6>
                                  <p className="text-xs text-primary-800/70 dark:text-primary-200/70 leading-relaxed font-medium">
                                    The system tracks <span className="font-black">{formatMoney(stats.otherOutstanding)}</span> in future revenue for this client. 
                                    {stats.nextBillingDate ? ` The next scheduled installment will be realized on ${stats.nextBillingDate}.` : ' Ensure recurring billing is synchronized to generate future invoices.'}
                                  </p>
                               </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <section>
                        <div className="flex justify-between items-center mb-4 px-2">
                          <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileText size={18} className="text-slate-400 dark:text-slate-500" />
                            Approved Proposals
                          </h5>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                            {quotes.filter(q => q.clientId === selectedClient.id && q.status === QuoteStatus.APPROVED).length} Node(s)
                          </span>
                        </div>
                        <div className="space-y-3">
                          {quotes.filter(q => q.clientId === selectedClient.id && q.status === QuoteStatus.APPROVED).map(quote => {
                            const relatedInvoices = invoices.filter(i => i.quoteId === quote.id);
                            const billedAmount = relatedInvoices.reduce((s, i) => s + i.totalAmount, 0);
                            const remainder = Math.max(0, quote.totalAmount - billedAmount);
                            
                            return (
                              <div key={quote.id} className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-primary-200 dark:hover:border-primary-900 transition-all">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-primary-600 dark:text-primary-400">{quote.quoteNumber}</span>
                                      <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 text-[9px] font-black rounded border border-primary-100 dark:border-primary-800">V{quote.version}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{quote.date}</div>
                                  </div>
                                  <div className="flex flex-1 md:justify-center items-center gap-8 px-8 border-l border-r border-slate-100 dark:border-slate-800 border-dashed mx-4">
                                     <div className="text-center">
                                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quote Value</div>
                                        <div className="text-sm font-black text-slate-800 dark:text-slate-100">{formatMoney(quote.totalAmount, quote.currency)}</div>
                                     </div>
                                     <ArrowRightLeft className="text-slate-200 dark:text-slate-700" size={16} />
                                     <div className="text-center">
                                        <div className="text-[9px] font-black text-primary-500 dark:text-primary-400 uppercase tracking-widest">Invoiced Value</div>
                                        <div className="text-sm font-black text-primary-600 dark:text-primary-400">{formatMoney(billedAmount, quote.currency)}</div>
                                     </div>
                                  </div>
                                  <div className="text-right flex flex-col justify-center min-w-[120px]">
                                     <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Future Remainder</div>
                                     <div className={`text-lg font-black ${remainder > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                       {formatMoney(remainder, quote.currency)}
                                     </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section>
                        <div className="flex justify-between items-center mb-4 px-2">
                          <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Receipt size={18} className="text-slate-400 dark:text-slate-500" />
                            Settlement Ledger
                          </h5>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">
                               <tr>
                                  <th className="px-6 py-4">Invoice #</th>
                                  <th className="px-6 py-4">Issue Date</th>
                                  <th className="px-6 py-4 text-right">Value</th>
                                  <th className="px-6 py-4 text-center">State</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {invoices.filter(i => i.clientId === selectedClient.id).map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="font-black text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</div>
                                     <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">{inv.paymentTerms}</div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{inv.date}</td>
                                  <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-100">{formatMoney(inv.totalAmount, inv.currency)}</td>
                                  <td className="px-6 py-4">
                                     <div className="flex justify-center">
                                        <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800'
                                        }`}>{inv.status}</span>
                                     </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-2">
                        <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <History size={18} className="text-slate-400 dark:text-slate-500" />
                          Interaction Timeline
                        </h5>
                        <button 
                          onClick={() => setShowAddLogModal(true)}
                          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-primary-700 shadow-md transition-all active:scale-95"
                        >
                          <Plus size={14} /> Log Interaction
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {(selectedClient.communicationLogs || []).length > 0 ? (
                          selectedClient.communicationLogs!.map(log => (
                            <div key={log.id} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-primary-200 dark:hover:border-primary-900 transition-all">
                              <div className="shrink-0">
                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-sm">
                                  {getLogIcon(log.type)}
                                </div>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-sm">{log.type}</span>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{log.date}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 shadow-sm">{log.agentName || 'System'}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                  {log.summary}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                             <MessageSquare className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                             <p className="text-slate-400 dark:text-slate-500 font-medium italic">No communication logs recorded yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6">
                <Building2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Active Identity Repository</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2 font-medium">Select a corporate entity from the directory to initiate 360° profile analysis.</p>
            </div>
          )}
        </div>
      </div>

      {showAddLogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <div className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 p-3 rounded-2xl">
                    <MessageSquare size={24} />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Log Interaction</h3>
               </div>
               <button onClick={() => setShowAddLogModal(false)} className="text-slate-400 dark:text-slate-500"><X size={24}/></button>
             </div>

             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold outline-none"
                      value={newLog.date}
                      onChange={e => setNewLog({...newLog, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Type</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold outline-none"
                      value={newLog.type}
                      onChange={e => setNewLog({...newLog, type: e.target.value as CommLogType})}
                    >
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                      <option>Note</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Agent Name</label>
                  <input 
                    type="text" 
                    placeholder="Who handled this?"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium outline-none"
                    value={newLog.agentName}
                    onChange={e => setNewLog({...newLog, agentName: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Summary</label>
                  <textarea 
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium h-32 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/20 transition-all outline-none"
                    placeholder="Details of the interaction..."
                    value={newLog.summary}
                    onChange={e => setNewLog({...newLog, summary: e.target.value})}
                  ></textarea>
                </div>
             </div>

             <button 
               onClick={handleAddLog}
               className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
             >
               Commit to Ledger
             </button>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message="Are you sure you want to delete this client? All historical tracking for this entity will be removed from the view. This action cannot be undone."
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg">
                  {isEditing ? <Edit3 size={24} /> : <UserPlus size={24} />}
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {isEditing ? 'Update Client Profile' : 'New Client Profile'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2">
                <X size={28} />
              </button>
            </div>
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Company Name</label>
                    <input 
                      type="text" 
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 bg-slate-50 dark:bg-slate-800 dark:text-white font-bold transition-all"
                      value={newClient.companyName}
                      onChange={(e) => setNewClient({...newClient, companyName: e.target.value})}
                      placeholder="e.g., Global Logistics LLC"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Contact Person</label>
                    <input 
                      type="text" 
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium transition-all"
                      value={newClient.contactPerson}
                      onChange={(e) => setNewClient({...newClient, contactPerson: e.target.value})}
                      placeholder="e.g., Jane Doe"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                        <input 
                          type="email" 
                          className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium outline-none"
                          value={newClient.email}
                          onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                          placeholder="jane@example.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                        <input 
                          type="tel" 
                          className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium outline-none"
                          value={newClient.phone}
                          onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                          placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Physical Address</label>
                    <textarea 
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium h-28 transition-all"
                      value={newClient.address}
                      onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Street, City, Zip Code"
                    ></textarea>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="px-8 py-4 font-black uppercase tracking-widest text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveClient} 
                  className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
                >
                  {isEditing ? 'Save Changes' : 'Create Profile'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;