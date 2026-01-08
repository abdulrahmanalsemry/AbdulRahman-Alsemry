import React, { useState, useRef } from 'react';
import { UserProfile, CustomRole, UserStatus } from '../types';
import { 
  Settings, User, Shield, Building, Globe, 
  Moon, Sun, DollarSign, Bell, Lock, Image as ImageIcon, Upload, Trash2,
  Save, RefreshCw, LogOut, CheckCircle, Info, TrendingUp, RefreshCcw, Search,
  CreditCard, FileText, ShieldCheck, AlertCircle, Loader2, Palette,
  Pipette
} from 'lucide-react';
import { CURRENCY_LIST, SYSTEM_THEMES } from '../App';
import { supabase } from '../services/supabase';

interface Props {
  profile: UserProfile | null;
  roles: CustomRole[];
  companyName: string;
  setCompanyName: (name: string) => void;
  companyLetterhead: string | null;
  setCompanyLetterhead: (val: string | null) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  currency: string;
  setCurrency: (val: string) => void;
  exchangeRates: Record<string, number>;
  setExchangeRates: (rates: Record<string, number>) => void;
  bankDetails: string;
  setBankDetails: (val: string) => void;
  defaultTerms: string;
  setDefaultTerms: (val: string) => void;
  onLogout: () => void;
  defaultRoleId?: string;
  setDefaultRoleId?: (val: string) => void;
  primaryColorId: string;
  setPrimaryColorId: (val: string) => void;
  customColorHex: string;
  setCustomColorHex: (val: string) => void;
}

const SettingsView: React.FC<Props> = ({ 
  profile, roles, companyName, setCompanyName, 
  companyLetterhead, setCompanyLetterhead,
  isDarkMode, setIsDarkMode, currency, setCurrency,
  exchangeRates, setExchangeRates,
  bankDetails, setBankDetails,
  defaultTerms, setDefaultTerms,
  onLogout, primaryColorId, setPrimaryColorId,
  customColorHex, setCustomColorHex
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'exchange' | 'company' | 'security'>('profile');
  const [pendingCurrency, setPendingCurrency] = useState(currency);
  const [pendingDarkMode, setPendingDarkMode] = useState(isDarkMode);
  const [localRates, setLocalRates] = useState(exchangeRates);
  const [pendingBankDetails, setPendingBankDetails] = useState(bankDetails);
  const [pendingTerms, setPendingTerms] = useState(defaultTerms);
  const [pendingLetterhead, setPendingLetterhead] = useState(companyLetterhead);
  const [pendingColorId, setPendingColorId] = useState(primaryColorId);
  const [pendingCustomHex, setPendingCustomHex] = useState(customColorHex);
  const [rateSearch, setRateSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const isSuperAdmin = profile?.roleId === 'role-super-admin';
  const currentRole = roles.find(r => r.id === profile?.roleId);

  const handleSave = () => {
    setIsSaving(true);
    setCurrency(pendingCurrency);
    setIsDarkMode(pendingDarkMode);
    setExchangeRates(localRates);
    setBankDetails(pendingBankDetails);
    setDefaultTerms(pendingTerms);
    setCompanyLetterhead(pendingLetterhead);
    setPrimaryColorId(pendingColorId);
    setCustomColorHex(pendingCustomHex);
    setTimeout(() => {
      setIsSaving(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }, 800);
  };

  const handleToggleDarkModeDirectly = () => {
    const newVal = !isDarkMode;
    setPendingDarkMode(newVal);
    setIsDarkMode(newVal);
  };

  const handleRateChange = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    setLocalRates(prev => ({ ...prev, [code]: num }));
  };

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingLetterhead(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const filteredCurrencies = CURRENCY_LIST.filter(c => 
    c.code.toLowerCase().includes(rateSearch.toLowerCase()) || 
    c.name.toLowerCase().includes(rateSearch.toLowerCase())
  );

  const isPDFLetterhead = pendingLetterhead?.startsWith('data:application/pdf');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-5xl mx-auto pb-12">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl">
              <Settings size={48} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter mb-2">Workspace Control</h2>
              <p className="text-primary-200 font-medium max-sm:text-sm">Configure global identity, currency, and company branding assets.</p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full custom-scrollbar">
            {['profile', 'security', 'preferences', 'exchange', 'company'].map(tab => (
              (tab !== 'company' || isSuperAdmin) && (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {tab}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'exchange' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-6">
              <div className="flex items-center gap-3">
                 <TrendingUp size={24} className="text-primary-600" />
                 <div>
                    <h4 className="text-lg font-black tracking-tight">Lifetime Exchange Registry</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historical conversion seeds for OMR normalization</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Search currency..."
                    className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white"
                    value={rateSearch}
                    onChange={(e) => setRateSearch(e.target.value)}
                  />
                </div>
                <button onClick={() => setLocalRates(exchangeRates)} className="text-[10px] font-black uppercase text-primary-600 hover:underline flex items-center gap-1">
                  <RefreshCcw size={12} /> Reset to Seed
                </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
             {filteredCurrencies.map(curr => (
               <div key={curr.code} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{curr.name}</span>
                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 text-[9px] font-black rounded-md">{curr.code}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="flex-1 relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">1 OMR = </span>
                     <input 
                       type="number"
                       step="0.0001"
                       className="w-full pl-16 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-black outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                       value={localRates[curr.code] || 0}
                       onChange={e => handleRateChange(curr.code, e.target.value)}
                       disabled={curr.code === 'OMR'}
                     />
                   </div>
                   <span className="text-lg font-bold text-slate-400 w-8 text-center">{curr.symbol}</span>
                 </div>
               </div>
             ))}
           </div>

           <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-800/50 flex items-start gap-4">
              <Info className="text-amber-500 mt-1 shrink-0" size={20} />
              <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed font-medium">
                Changing these rates will <span className="font-bold uppercase">not retrospectively alter</span> existing records. The "Lifetime Rate" is captured as a static snapshot at the moment of entry.
              </p>
           </div>

           <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={handleSave} disabled={isSaving} className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-50">
                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Synchronize Global Registry
              </button>
           </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-300">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center overflow-hidden">
              <div className="w-24 h-24 rounded-3xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-4xl font-black border-4 border-white dark:border-slate-800 shadow-xl mb-4 uppercase">
                {profile?.email?.substring(0, 2)}
              </div>
              <h3 className="text-xl font-black mb-1 truncate w-full px-2 dark:text-white" title={profile?.email || ''}>{profile?.email}</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-100 dark:border-primary-800">
                  {currentRole?.name}
                </span>
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-primary-800">
                  {profile?.status}
                </span>
              </div>
              
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                   <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700 text-amber-400' : 'bg-white text-slate-400'} shadow-sm`}>
                         {isDarkMode ? <Moon size={16}/> : <Sun size={16}/>}
                      </div>
                      <div className="text-left">
                         <div className="text-xs font-black">Theme</div>
                         <div className="text-[9px] text-slate-400 font-bold uppercase">{isDarkMode ? 'Dark' : 'Light'} Mode</div>
                      </div>
                   </div>
                   <div 
                     onClick={handleToggleDarkModeDirectly}
                     className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-all ${isDarkMode ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                   >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                   </div>
                </div>

                <button 
                  onClick={onLogout}
                  className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
                 <Shield size={24} className="text-primary-600" />
                 <h4 className="text-lg font-black dark:text-white">Authorization Context</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Tier</label>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 font-bold dark:text-white">
                    {currentRole?.name || 'System User'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Created</label>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 font-bold dark:text-white">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Historical'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
            <Lock size={24} className="text-primary-600" />
            <h4 className="text-lg font-black dark:text-white">Security Gateway</h4>
          </div>

          <form onSubmit={handleChangePassword} className="max-w-md space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm New Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {passwordError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle size={18} />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                <CheckCircle size={18} />
                Identity password updated successfully.
              </div>
            )}

            <button 
              type="submit"
              disabled={passwordLoading}
              className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 min-w-[200px]"
            >
              {passwordLoading ? <Loader2 className="animate-spin" size={16}/> : <Shield size={16}/>}
              Update Credentials
            </button>
          </form>

          <div className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-3xl border border-primary-100 dark:border-primary-800/50 flex items-start gap-4">
            <Info className="text-primary-400 mt-1 shrink-0" size={20} />
            <p className="text-xs text-primary-900 dark:text-primary-100 leading-relaxed font-medium">
              Updating your password will sync your credentials across all enterprise workspace sessions. Ensure your new password adheres to corporate complexity standards.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-12 animate-in fade-in duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Globe size={24} className="text-primary-600" />
                        <h4 className="text-lg font-black tracking-tight dark:text-white">Regional Settings</h4>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reporting Base Currency</label>
                       <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-500/10 appearance-none dark:text-white"
                            value={pendingCurrency}
                            onChange={(e) => setPendingCurrency(e.target.value)}
                          >
                            {CURRENCY_LIST.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>)}
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Palette size={24} className="text-primary-600" />
                        <h4 className="text-lg font-black tracking-tight dark:text-white">System Aesthetics</h4>
                    </div>
                    
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Primary Brand Color</label>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {SYSTEM_THEMES.map(theme => (
                             <button
                                key={theme.id}
                                onClick={() => setPendingColorId(theme.id)}
                                className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${pendingColorId === theme.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-lg' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-200'}`}
                             >
                                <div 
                                  className="w-8 h-8 rounded-full shadow-inner border-2 border-white dark:border-slate-800" 
                                  style={{ backgroundColor: theme.colors[600] }}
                                />
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${pendingColorId === theme.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>{theme.name}</span>
                             </button>
                          ))}
                          {/* Custom Color Option */}
                          <button
                            onClick={() => setPendingColorId('custom')}
                            className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${pendingColorId === 'custom' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-lg' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-200'}`}
                          >
                             <div 
                               className="w-8 h-8 rounded-full shadow-inner border-2 border-white dark:border-slate-800 flex items-center justify-center bg-gradient-to-tr from-pink-400 via-primary-500 to-blue-500"
                             >
                                <Pipette size={14} className="text-white" />
                             </div>
                             <span className={`text-[9px] font-black uppercase tracking-tighter ${pendingColorId === 'custom' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>Custom</span>
                          </button>
                       </div>

                       {/* Custom Color Input Fields */}
                       {pendingColorId === 'custom' && (
                         <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-300 space-y-4">
                            <div className="flex items-center gap-4">
                               <input 
                                 type="color" 
                                 className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer overflow-hidden p-0"
                                 value={pendingCustomHex}
                                 onChange={(e) => setPendingCustomHex(e.target.value)}
                               />
                               <div className="flex-1 space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hex Identifier</label>
                                  <input 
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-black uppercase dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                    value={pendingCustomHex}
                                    onChange={(e) => setPendingCustomHex(e.target.value)}
                                  />
                               </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                               Picking a custom color will dynamically generate a matching scale for buttons, accents, and visuals.
                            </p>
                         </div>
                       )}
                       
                       <p className="text-[9px] text-slate-400 font-bold uppercase ml-2 tracking-tight">Accents, buttons, and visual focus elements will adapt.</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <Bell size={24} className="text-primary-600" />
                    <h4 className="text-lg font-black tracking-tight dark:text-white">Notification Pulse</h4>
                 </div>
                 <div className="space-y-4">
                    {['Quote Expiry Alerts', 'Payment Clearances', 'Exchange Volatility'].map((n, i) => (
                      <div key={i} className="flex items-center justify-between group">
                         <div className="space-y-1">
                            <div className="text-sm font-black dark:text-white">{n}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Active monitoring enabled</div>
                         </div>
                         <div className="w-12 h-6 rounded-full bg-primary-600 p-1 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full translate-x-6 shadow-sm" />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                Apply Preferences
              </button>
           </div>
        </div>
      )}

      {activeTab === 'company' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-10 animate-in slide-in-from-right-4 duration-300">
           <div className="flex items-center gap-3">
              <Building size={24} className="text-primary-600" />
              <h4 className="text-lg font-black tracking-tight dark:text-white">Enterprise Identity Configuration</h4>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Display Entity Name</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <ImageIcon size={12} /> Company Letterhead Asset
                    </label>
                    <div className="flex flex-col gap-4">
                       <div 
                         className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}
                       >
                          {pendingLetterhead ? (
                            <>
                              {isPDFLetterhead ? (
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <FileText size={48} className="text-primary-600" />
                                  <span className="text-xs font-black uppercase text-primary-600">PDF Asset Registered</span>
                                </div>
                              ) : (
                                <img src={pendingLetterhead} alt="Letterhead Preview" className="w-full h-full object-contain" />
                              )}
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                 <div className="p-2 bg-white rounded-full text-primary-600 shadow-xl"><Upload size={20}/></div>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setPendingLetterhead(null); }} 
                                   className="p-2 bg-white rounded-full text-red-600 shadow-xl"
                                 >
                                    <Trash2 size={20}/>
                                 </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                               <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400 mx-auto w-fit"><Upload size={24}/></div>
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload PNG/JPG or PDF Letterhead</div>
                            </div>
                          )}
                       </div>
                       <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleLetterheadUpload} />
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Recommended: A4 PDF or high-res PNG with transparency.</p>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <CreditCard size={12} /> Global Bank Details
                    </label>
                    <textarea 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-medium h-32 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                      value={pendingBankDetails}
                      onChange={(e) => setPendingBankDetails(e.target.value)}
                      placeholder="Account Number, IBAN, Bank Name..."
                    ></textarea>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <FileText size={12} /> Default Terms & Conditions
                    </label>
                    <textarea 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-medium h-64 outline-none focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                      value={pendingTerms}
                      onChange={(e) => setPendingTerms(e.target.value)}
                      placeholder="Default legal terms for all quotes..."
                    ></textarea>
                 </div>

                 <div className="bg-primary-50 dark:bg-primary-900/30 p-6 rounded-3xl border border-primary-100 dark:border-primary-800 flex items-start gap-4">
                    <Info size={20} className="text-primary-600 dark:text-primary-400 mt-1 shrink-0" />
                    <p className="text-xs text-primary-900 dark:text-primary-100 leading-relaxed font-medium">
                       The uploaded letterhead will be applied as a full-page background to all Quote and Invoice PDF prints. PDF assets offer superior vector quality.
                    </p>
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                Update Company Profile
              </button>
           </div>
        </div>
      )}

      {showSavedToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
              <CheckCircle size={20} className="text-emerald-400" />
              <span className="text-sm font-black uppercase tracking-widest">Branding Registry Updated</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;