import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Salesperson, SalespersonType, Permission } from '../types';
import { 
  MapPinned, UserPlus, Search, Building2, User, 
  Calendar, Info, Plus, X, ArrowUpRight, CheckCircle2,
  TrendingUp, Target, UserCheck, Trash2, Mail, Phone,
  Navigation, LocateFixed, Map as MapIcon, Loader2, Edit3,
  AlertCircle, CalendarDays
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  team: Salesperson[];
  hasPermission: (p: Permission) => boolean;
  isSalesRole?: boolean;
  currentSalesperson?: Salesperson | null;
}

interface FormErrors {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  salespersonId?: string;
  visitDate?: string;
  visitDetails?: string;
}

const FORBIDDEN_DOMAINS = ['test.com', 'example.com', 'dummy.com', 'none.com', 'temp.com', 'mailinator.com', 'fake.com', 'xxx.com'];

const LeadsView: React.FC<Props> = ({ leads, setLeads, team, hasPermission, isSalesRole, currentSalesperson }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    salespersonId: currentSalesperson?.id || (isSalesRole ? '' : team[0]?.id || ''),
    visitDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    visitDetails: '',
    status: 'Potential'
  });

  useEffect(() => {
    if (showAddModal && isSalesRole && currentSalesperson && !editingLeadId) {
      setNewLead(prev => ({ ...prev, salespersonId: currentSalesperson.id }));
    }
  }, [showAddModal, isSalesRole, currentSalesperson, editingLeadId]);

  const filteredLeads = useMemo(() => 
    leads.filter(l => 
      l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  , [leads, searchTerm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!newLead.companyName?.trim()) newErrors.companyName = 'Entity name is required';
    if (!newLead.contactPerson?.trim()) newErrors.contactPerson = 'Contact principal is required';
    
    if (newLead.email?.trim()) {
      if (!emailRegex.test(newLead.email)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        const domain = newLead.email.split('@')[1]?.toLowerCase();
        if (FORBIDDEN_DOMAINS.includes(domain)) {
          newErrors.email = 'Educational/Dummy domains are not accepted';
        } else if (newLead.email.toLowerCase().startsWith('xxx@')) {
          newErrors.email = 'Placeholder email formats are not accepted';
        }
      }
    } else if (!newLead.email?.trim()) {
      newErrors.email = 'Email address is required';
    }

    if (!newLead.phone?.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else if (newLead.phone.length < 8) {
      newErrors.phone = 'Invalid mobile number length';
    }

    if (isSalesRole && !currentSalesperson) {
       alert("SECURITY ALERT: Your agent profile is not configured in the Sales Matrix. Please contact the administrator to register your email in the 'Sales Matrix' team list before logging leads.");
       return false;
    }

    if (!newLead.salespersonId) newErrors.salespersonId = 'Please assign a responsible agent';
    if (!newLead.visitDate) newErrors.visitDate = 'Event date is required';
    
    if (!newLead.visitDetails?.trim()) {
      newErrors.visitDetails = 'Visit narrative cannot be empty';
    } else if (newLead.visitDetails.length < 10) {
      newErrors.visitDetails = 'Narrative is too brief (min 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditLead = (lead: Lead) => {
    setNewLead({ ...lead });
    setEditingLeadId(lead.id);
    setErrors({});
    setShowAddModal(true);
  };

  const handleSaveLead = () => {
    if (!validateForm()) return;
    
    const finalSalespersonId = isSalesRole && currentSalesperson ? currentSalesperson.id : (newLead.salespersonId || '');

    const leadData = {
      ...newLead as Lead,
      salespersonId: finalSalespersonId
    };

    if (editingLeadId) {
      setLeads(prev => prev.map(l => l.id === editingLeadId ? { ...l, ...leadData } : l));
    } else {
      const lead: Lead = {
        ...leadData,
        id: Math.random().toString(36).substr(2, 9),
        status: 'Potential'
      };
      setLeads(prev => [lead, ...prev]);
    }

    closeModal();
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingLeadId(null);
    setErrors({});
    setNewLead({
      companyName: '', contactPerson: '', email: '', phone: '', address: '',
      salespersonId: currentSalesperson?.id || (isSalesRole ? '' : team[0]?.id || ''), 
      visitDate: new Date().toISOString().split('T')[0],
      followUpDate: '',
      visitDetails: '', status: 'Potential'
    });
  };

  const handleDeleteLead = () => {
    if (!leadToDelete) return;
    setLeads(prev => prev.filter(l => l.id !== leadToDelete));
    setLeadToDelete(null);
  };

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNewLead(prev => ({
          ...prev,
          address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Error fetching location:", error);
        alert("Unable to retrieve location. Please check permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const openExternalMap = () => {
    if (newLead.address) {
      const query = encodeURIComponent(newLead.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    } else {
      window.open('https://www.google.com/maps', '_blank');
    }
  };

  const getTeamLeadsPerformance = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const displayTeam = isSalesRole && currentSalesperson ? [currentSalesperson] : team;
    
    return displayTeam.map(member => {
      const monthlyLeads = leads.filter(l => 
        l.salespersonId === member.id && 
        l.visitDate.startsWith(currentMonth)
      ).length;
      return {
        ...member,
        leadsCount: monthlyLeads,
        target: member.monthlyLeadsTarget || 0
      };
    });
  };

  const performance = getTeamLeadsPerformance();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
               <div className="bg-primary-600 p-4 rounded-3xl shadow-xl">
                  <Target size={32} className="text-white" />
               </div>
               <div>
                  <h2 className="text-3xl font-black tracking-tight">Visit Intelligence</h2>
                  <p className="text-primary-200 font-medium">Real-time tracking of salesperson field activity vs. monthly quotas.</p>
               </div>
            </div>
          </div>
          <button 
            onClick={() => { setEditingLeadId(null); setShowAddModal(true); }}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-50 transition-all flex items-center gap-3 shadow-xl active:scale-95"
          >
            <Plus size={20} /> Log Field Visit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {performance.map(member => (
            <div key={member.id} className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 space-y-4">
               <div className="flex justify-between items-center">
                  <div className="text-xs font-black uppercase tracking-widest text-primary-300">{member.name}</div>
                  <div className="text-[10px] font-black uppercase text-white/40">{member.leadsCount} / {member.target} Leads</div>
               </div>
               <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${member.leadsCount >= member.target ? 'bg-emerald-400' : 'bg-primary-50'}`}
                    style={{ width: `${Math.min(100, (member.leadsCount / (member.target || 1)) * 100)}%` }}
                  />
               </div>
               {member.leadsCount >= member.target ? (
                 <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase">
                    <CheckCircle2 size={12} /> Target achieved
                 </div>
               ) : (
                 <div className="text-[9px] text-white/40 font-bold uppercase">
                   Needs {member.target - member.leadsCount} more visits to meet quota
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
               <tr>
                  <th className="px-8 py-5">Corporate Lead</th>
                  <th className="px-8 py-5">Agent Responsible</th>
                  <th className="px-8 py-5">Visit Timestamp</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {filteredLeads.map(lead => (
                 <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary-600 group-hover:text-white transition-all">
                             <Building2 size={20} />
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-800 dark:text-slate-100">{lead.companyName}</div>
                             <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{lead.contactPerson}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                          <User size={14} className="text-primary-500" />
                          {team.find(t => t.id === lead.salespersonId)?.name || 'Unknown Agent'}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <Calendar size={14} />
                          {lead.visitDate}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                            lead.status === 'Converted' 
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                              : 'bg-primary-100 text-primary-700 border-primary-200'
                          }`}>
                             {lead.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleEditLead(lead)}
                            className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            title="View/Edit Details"
                          >
                             <ArrowUpRight size={18} />
                          </button>
                          {hasPermission('delete_leads') && (
                             <button 
                               onClick={() => { setLeadToDelete(lead.id); setShowDeleteConfirm(true); }}
                               className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                             >
                                <Trash2 size={18} />
                             </button>
                          )}
                       </div>
                    </td>
                 </tr>
               ))}
               {filteredLeads.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 dark:text-slate-600 italic font-medium">
                       No field visits recorded in current directory.
                    </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg">
                  {editingLeadId ? <Edit3 size={24} /> : <MapPinned size={24} />}
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                     {editingLeadId ? 'Update Lead Context' : 'Visit Intelligence Log'}
                   </h3>
                   <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                     {editingLeadId ? `Ref: ${editingLeadId.toUpperCase()}` : 'Recording new field activity'}
                   </p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto bg-slate-50/20 dark:bg-slate-950/20">
               {isSalesRole && !currentSalesperson && (
                  <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-3xl border border-red-100 dark:border-red-800 flex items-start gap-4 animate-pulse">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-red-900 dark:text-red-100">IDENTITY MISMATCH DETECTED</p>
                      <p className="text-xs text-red-800/80 dark:text-red-300 font-medium leading-relaxed">
                        Your account ({currentSalesperson ? '' : 'New Agent'}) is not linked to an active salesperson identity in the system. 
                        <strong> You cannot save leads until an administrator adds your email to the Sales Matrix.</strong>
                      </p>
                    </div>
                  </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${errors.companyName ? 'text-red-500' : 'text-slate-400'}`}>Entity Identity</label>
                     <input 
                       type="text"
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-bold dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${errors.companyName ? 'border-red-500 bg-red-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                       placeholder="Corporate Company Name"
                       value={newLead.companyName}
                       onChange={e => {
                         setNewLead({...newLead, companyName: e.target.value});
                         if (errors.companyName) setErrors({...errors, companyName: undefined});
                       }}
                     />
                     {errors.companyName && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.companyName}</p>}
                  </div>
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${errors.contactPerson ? 'text-red-500' : 'text-slate-400'}`}>Contact Principal</label>
                     <input 
                       type="text"
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-medium dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${errors.contactPerson ? 'border-red-500 bg-red-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                       placeholder="Point of Contact Name"
                       value={newLead.contactPerson}
                       onChange={e => {
                         setNewLead({...newLead, contactPerson: e.target.value});
                         if (errors.contactPerson) setErrors({...errors, contactPerson: undefined});
                       }}
                     />
                     {errors.contactPerson && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.contactPerson}</p>}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${errors.email ? 'text-red-500' : 'text-slate-400'}`}>
                       <Mail size={12} /> Email Address
                     </label>
                     <input 
                       type="email"
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-medium dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${errors.email ? 'border-red-500 bg-red-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                       placeholder="contact@email.com"
                       value={newLead.email}
                       onChange={e => {
                         setNewLead({...newLead, email: e.target.value});
                         if (errors.email) setErrors({...errors, email: undefined});
                       }}
                     />
                     {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.email}</p>}
                  </div>
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 ${errors.phone ? 'text-red-500' : 'text-slate-400'}`}>
                       <Phone size={12} /> Mobile Number
                     </label>
                     <input 
                       type="tel"
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-medium dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${errors.phone ? 'border-red-500 bg-red-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                       placeholder="+968 XXXX XXXX"
                       value={newLead.phone}
                       onChange={e => {
                         setNewLead({...newLead, phone: e.target.value});
                         if (errors.phone) setErrors({...errors, phone: undefined});
                       }}
                     />
                     {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone}</p>}
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Navigation size={12} className="text-slate-400" /> Geographic Location
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                      placeholder="Coordinates or physical address..."
                      value={newLead.address}
                      onChange={e => setNewLead({...newLead, address: e.target.value})}
                    />
                    <button 
                      onClick={handleAutoLocate}
                      disabled={isLocating}
                      className="p-4 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-2xl border border-primary-100 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[56px]"
                      title="Auto-locate coordinates"
                    >
                      {isLocating ? <Loader2 className="animate-spin" size={20} /> : <LocateFixed size={20} />}
                    </button>
                    <button 
                      onClick={openExternalMap}
                      className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[56px]"
                      title="Open map for manual lookup"
                    >
                      <MapIcon size={20} />
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${errors.salespersonId ? 'text-red-500' : 'text-slate-400'}`}>Responsible Agent</label>
                     <select 
                       disabled={isSalesRole && currentSalesperson}
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-bold dark:text-white outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 ${errors.salespersonId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                       value={newLead.salespersonId}
                       onChange={e => {
                         setNewLead({...newLead, salespersonId: e.target.value});
                         if (errors.salespersonId) setErrors({...errors, salespersonId: undefined});
                       }}
                     >
                        <option value="">{isSalesRole ? 'Assigning to my profile...' : 'Select an Agent'}</option>
                        {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                     {errors.salespersonId && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.salespersonId}</p>}
                  </div>
                  <div className="space-y-1">
                     <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${errors.visitDate ? 'text-red-500' : 'text-slate-400'}`}>Event Date</label>
                     <input 
                       type="date"
                       className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-bold dark:text-white outline-none transition-all ${errors.visitDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                       value={newLead.visitDate}
                       onChange={e => {
                         setNewLead({...newLead, visitDate: e.target.value});
                         if (errors.visitDate) setErrors({...errors, visitDate: undefined});
                       }}
                     />
                     {errors.visitDate && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.visitDate}</p>}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <CalendarDays size={12} className="text-primary-500" /> Follow-up Date (Optional)
                     </label>
                     <input 
                       type="date"
                       className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                       value={newLead.followUpDate}
                       onChange={e => setNewLead({...newLead, followUpDate: e.target.value})}
                     />
                  </div>
                  <div className="flex items-end pb-4">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                        <Info size={12} /> Sets a reminder for re-engagement
                     </div>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${errors.visitDetails ? 'text-red-500' : 'text-slate-400'}`}>Visit Narrative</label>
                  <textarea 
                    className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-800 font-medium h-32 outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${errors.visitDetails ? 'border-red-500 bg-red-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                    placeholder="Log technical requirements, pain points, and strategic opening..."
                    value={newLead.visitDetails}
                    onChange={e => {
                      setNewLead({...newLead, visitDetails: e.target.value});
                      if (errors.visitDetails) setErrors({...errors, visitDetails: undefined});
                    }}
                  />
                  {errors.visitDetails && <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.visitDetails}</p>}
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-white dark:bg-slate-900">
               <button onClick={closeModal} className="px-8 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Discard</button>
               <button 
                 onClick={handleSaveLead}
                 disabled={isSalesRole && !currentSalesperson}
                 className="bg-primary-600 text-white px-12 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-600/30 active:scale-95 transition-all disabled:opacity-50"
               >
                 {editingLeadId ? 'Update Record' : 'Register Lead'}
               </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteLead}
        title="Purge Lead Data"
        message="This operation permanently removes the lead identity and all associated visit intelligence. This action cannot be reversed."
        confirmText="Confirm Purge"
        type="danger"
      />
    </div>
  );
};

export default LeadsView;