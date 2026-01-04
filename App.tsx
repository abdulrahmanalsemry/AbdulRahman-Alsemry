
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Receipt, Users, Package, CreditCard, 
  TrendingUp, Settings, Menu, X, BrainCircuit, Building2, 
  LogOut, ShieldAlert, ShieldCheck, Sun, Moon, Globe, CalendarClock,
  Clock, AlertTriangle, MapPinned, LayoutGrid
} from 'lucide-react';
import { Quote, Invoice, Salesperson, ServiceItem, OperationalExpense, QuoteStatus, InvoiceStatus, Client, UserProfile, CustomRole, Permission, UserStatus, Lead } from './types';
import { INITIAL_SALES_TEAM, INITIAL_CATALOG, INITIAL_QUOTES, INITIAL_INVOICES, INITIAL_EXPENSES, INITIAL_CLIENTS, SYSTEM_ROLES, INITIAL_USER_PROFILES } from './constants';
import Dashboard from './components/Dashboard';
import QuotesView from './components/QuotesView';
import InvoicesView from './components/InvoicesView';
import UpcomingInvoicesView from './components/UpcomingInvoicesView';
import SalesTeamView from './components/SalesTeamView';
import CatalogView from './components/CatalogView';
import ExpensesView from './components/ExpensesView';
import ReportsView from './components/ReportsView';
import AIInsightsView from './components/AIInsightsView';
import ClientsView from './components/ClientsView';
import LeadsView from './components/LeadsView';
import AuthView from './components/AuthView';
import AccessManagementView from './components/AccessManagementView';
import SettingsView from './components/SettingsView';
import { supabase } from './services/supabase';

type View = 'dashboard' | 'clients' | 'leads' | 'quotes' | 'invoices' | 'upcoming' | 'team' | 'catalog' | 'expenses' | 'reports' | 'ai' | 'access' | 'settings';

const SUPER_ADMIN_EMAIL = 'abdulrahmanalsemry@gmail.com';

export const CURRENCY_LIST = [
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'DH', name: 'UAE Dirham' }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Global App Settings
  const [companyName, setCompanyName] = useState('SmartQuote ERP');
  const [companyLetterhead, setCompanyLetterhead] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [companyBankDetails, setCompanyBankDetails] = useState('Bank Name: Muscat International\nAccount Name: SmartQuote ERP LLC\nAccount Number: 0123-4567-8901-2345\nBranch: Main Muscat');
  const [defaultTerms, setDefaultTerms] = useState('1. Quote validity is 30 days.\n2. 50% advance payment required.\n3. Delivery within 14 working days.');
  const [defaultRoleId, setDefaultRoleId] = useState('role-new-user');

  // Currency & Exchange State
  const [baseCurrency, setBaseCurrency] = useState('OMR');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ 'OMR': 1, 'USD': 2.6, 'SAR': 9.75, 'AED': 9.54 });

  // Security & Authorization State
  const [roles, setRoles] = useState<CustomRole[]>(SYSTEM_ROLES);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(INITIAL_USER_PROFILES);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Application Data State
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<Salesperson[]>(INITIAL_SALES_TEAM);
  const [catalog, setCatalog] = useState<ServiceItem[]>(INITIAL_CATALOG);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [expenses, setExpenses] = useState<OperationalExpense[]>(INITIAL_EXPENSES);

  const pendingUsersCount = useMemo(() => userProfiles.filter(u => u.roleId === 'role-new-user').length, [userProfiles]);

  // Authorization Data Isolation Logic
  const currentSalesperson = useMemo(() => {
    if (!currentUserProfile) return null;
    // Strict identity match via email to ensure Hanan or others are linked to their Matrix profile
    return team.find(s => s.email?.toLowerCase() === currentUserProfile.email.toLowerCase()) || null;
  }, [currentUserProfile, team]);

  const isRestrictedRole = useMemo(() => {
    if (!currentUserProfile) return true;
    
    // Roles that CAN see all records from all staff:
    // Super Admin, Administrator, Sales Manager, Secretary, and Accountant
    // Accountants MUST see all invoices to manage collections.
    const unrestrictedRoles = ['role-super-admin', 'role-admin', 'role-sales-manager', 'role-secretary', 'role-accountant'];
    
    // If the current role IS NOT in the unrestricted list, they are restricted to their own data
    return !unrestrictedRoles.includes(currentUserProfile.roleId);
  }, [currentUserProfile]);

  const filteredLeads = useMemo(() => {
    // If user is a manager/admin/secretary/accountant, show ALL leads
    if (!isRestrictedRole) return leads;
    
    // If restricted but somehow doesn't have a team profile yet, show nothing to avoid data leaks
    if (!currentSalesperson) return [];
    
    // Otherwise, show only their own leads
    return leads.filter(l => l.salespersonId === currentSalesperson.id);
  }, [leads, isRestrictedRole, currentSalesperson]);

  const filteredQuotes = useMemo(() => {
    if (!isRestrictedRole) return quotes;
    if (!currentSalesperson) return [];
    return quotes.filter(q => q.salespersonId === currentSalesperson.id);
  }, [quotes, isRestrictedRole, currentSalesperson]);

  const filteredInvoices = useMemo(() => {
    if (!isRestrictedRole) return invoices;
    if (!currentSalesperson) return [];
    const myQuoteIds = filteredQuotes.map(q => q.id);
    return invoices.filter(i => myQuoteIds.includes(i.quoteId));
  }, [invoices, filteredQuotes, isRestrictedRole, currentSalesperson]);

  // Initialize Session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (err) {
        console.error("Session initialization error:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const email = session.user.email;
      let profile = userProfiles.find(p => p.email === email);
      if (email === SUPER_ADMIN_EMAIL) {
        const superAdminProfile: UserProfile = {
          id: session.user.id,
          email: email,
          roleId: 'role-super-admin',
          status: UserStatus.ACTIVE,
          createdAt: '2023-01-01T00:00:00Z',
          lastActive: new Date().toISOString(),
          activityLogs: profile?.activityLogs || []
        };
        if (!profile || profile.roleId !== 'role-super-admin') {
          setUserProfiles(prev => [...prev.filter(p => p.email !== email), superAdminProfile]);
        }
        setCurrentUserProfile(superAdminProfile);
      } else if (profile) {
        setCurrentUserProfile(profile);
      } else {
        // Support selected role from user_metadata or fallback to global default
        const selectedRoleId = session.user.user_metadata?.roleId || defaultRoleId;
        const newProfile: UserProfile = {
          id: session.user.id,
          email: email || '',
          roleId: selectedRoleId,
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          activityLogs: []
        };
        setUserProfiles(prev => [...prev, newProfile]);
        setCurrentUserProfile(newProfile);
      }
    } else {
      setCurrentUserProfile(null);
    }
  }, [session, userProfiles.length, defaultRoleId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { 
      await supabase.auth.signOut(); 
      setSession(null);
      setCurrentUserProfile(null);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsLoggingOut(false); 
    }
  };

  const hasPermission = useCallback((permission: Permission) => {
    if (!currentUserProfile || currentUserProfile.status !== UserStatus.ACTIVE) return false;
    const role = roles.find(r => r.id === currentUserProfile.roleId);
    return role?.permissions.includes(permission) || false;
  }, [currentUserProfile, roles]);

  const formatMoney = (val: number, currencyCode?: string) => {
    const code = currencyCode || baseCurrency;
    const symbol = CURRENCY_LIST.find(c => c.code === code)?.symbol || 'OMR';
    return `${symbol} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const normalizeToBase = (val: number, fromCurrency: string, customRate?: number) => {
    if (fromCurrency === baseCurrency) return val;
    const rate = customRate || (exchangeRates[fromCurrency] / exchangeRates[baseCurrency]);
    return val / rate;
  };

  const normalizedInvoices = useMemo(() => filteredInvoices.map(i => ({
    ...i,
    totalAmount: normalizeToBase(i.totalAmount, i.currency, i.exchangeRate)
  })), [filteredInvoices, baseCurrency, exchangeRates]);

  const normalizedExpenses = useMemo(() => expenses.map(e => ({
    ...e,
    amount: normalizeToBase(e.amount, e.currency, e.exchangeRate)
  })), [expenses, baseCurrency, exchangeRates]);

  const normalizedQuotes = useMemo(() => filteredQuotes.map(q => ({
    ...q,
    totalAmount: normalizeToBase(q.totalAmount, q.currency, q.exchangeRate),
    costOfGoodsSold: normalizeToBase(q.costOfGoodsSold, q.currency, q.exchangeRate),
    netProfit: normalizeToBase(q.netProfit, q.currency, q.exchangeRate)
  })), [filteredQuotes, baseCurrency, exchangeRates]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
    { id: 'leads', label: 'Leads Registry', icon: MapPinned, permission: 'view_leads' },
    { id: 'team', label: 'Sales Matrix', icon: LayoutGrid, permission: 'view_team' },
    { id: 'clients', label: 'Clients', icon: Building2, permission: 'view_clients' },
    { id: 'quotes', label: 'Price Quotes', icon: FileText, permission: 'view_quotes' },
    { id: 'invoices', label: 'Invoices', icon: Receipt, permission: 'view_invoices' },
    { id: 'upcoming', label: 'Upcoming Invoices', icon: CalendarClock, permission: 'view_upcoming_invoices' },
    { id: 'catalog', label: 'Services Catalog', icon: Package, permission: 'view_catalog' },
    { id: 'expenses', label: 'Expenses', icon: CreditCard, permission: 'view_expenses' },
    { id: 'reports', label: 'Performance', icon: TrendingUp, permission: 'view_reports' },
    { id: 'ai', label: 'AI Business Analyst', icon: BrainCircuit, permission: 'view_ai' },
    { id: 'access', label: 'Access Control', icon: ShieldCheck, permission: 'manage_access' },
  ];

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission as Permission));

  const renderView = () => {
    if (currentUserProfile && currentUserProfile.status !== UserStatus.ACTIVE) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
          <ShieldAlert size={64} className="text-amber-500 mb-6" />
          <h2 className="text-3xl font-black">Account Restricted</h2>
          <p className="text-slate-500 mt-2">Your system access has been modified by the security gateway.</p>
          <button onClick={handleLogout} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold">End Session</button>
        </div>
      );
    }

    if (currentUserProfile?.roleId === 'role-new-user') {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 shadow-inner">
            <Clock size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Welcome to SmartQuote</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 leading-relaxed text-lg">
            Your account has been registered successfully. For security reasons, please <strong>wait for the manager to assign your role</strong> and authorize your specific workspace permissions.
          </p>
          <div className="mt-10 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-widest">Notice</p>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium">Administrative staff have been notified of your pending activation.</p>
          </div>
          <button onClick={handleLogout} className="mt-12 text-slate-400 dark:text-slate-600 font-black uppercase text-xs tracking-widest hover:text-slate-800 dark:hover:text-slate-300 transition-colors flex items-center gap-2">
            <LogOut size={16} /> End Session
          </button>
        </div>
      );
    }

    if (activeView === 'settings') {
      return (
        <SettingsView 
          profile={currentUserProfile} roles={roles} companyName={companyName} setCompanyName={setCompanyName}
          companyLetterhead={companyLetterhead} setCompanyLetterhead={setCompanyLetterhead}
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} currency={baseCurrency} setCurrency={setBaseCurrency}
          exchangeRates={exchangeRates} setExchangeRates={setExchangeRates}
          bankDetails={companyBankDetails} setBankDetails={setCompanyBankDetails}
          defaultTerms={defaultTerms} setDefaultTerms={setDefaultTerms}
          onLogout={handleLogout}
          defaultRoleId={defaultRoleId} setDefaultRoleId={setDefaultRoleId}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard 
          quotes={normalizedQuotes} 
          invoices={normalizedInvoices} 
          expenses={normalizedExpenses} 
          formatMoney={formatMoney} 
          onViewAllTransactions={() => setActiveView('invoices')}
          isSalesRole={isRestrictedRole}
          salesperson={currentSalesperson}
          leads={filteredLeads}
          userRoleId={currentUserProfile?.roleId}
        />;
      case 'leads':
        return <LeadsView 
          leads={filteredLeads} 
          setLeads={setLeads} 
          team={team} 
          hasPermission={hasPermission}
          isSalesRole={isRestrictedRole}
          currentSalesperson={currentSalesperson}
        />;
      case 'clients':
        return <ClientsView clients={clients} setClients={setClients} quotes={normalizedQuotes} invoices={normalizedInvoices} formatMoney={formatMoney} />;
      case 'quotes':
        return <QuotesView quotes={filteredQuotes} setQuotes={setQuotes} team={team} catalog={catalog} clients={clients} setClients={setClients} leads={leads} setLeads={setLeads} setInvoices={setInvoices} invoices={invoices} companyName={companyName} letterhead={companyLetterhead} formatMoney={formatMoney} baseCurrency={baseCurrency} exchangeRates={exchangeRates} bankDetails={companyBankDetails} defaultTerms={defaultTerms} />;
      case 'invoices':
        return <InvoicesView invoices={filteredInvoices} setInvoices={setInvoices} clients={clients} team={team} quotes={quotes} letterhead={companyLetterhead} formatMoney={formatMoney} bankDetails={companyBankDetails} />;
      case 'upcoming':
        return <UpcomingInvoicesView quotes={filteredQuotes} invoices={filteredInvoices} formatMoney={formatMoney} onSelectInvoice={(id) => { setActiveView('invoices'); }} />;
      case 'team':
        return <SalesTeamView 
          team={team} 
          setTeam={setTeam} 
          quotes={normalizedQuotes} 
          invoices={normalizedInvoices} 
          formatMoney={formatMoney} 
          leads={leads}
          isSalesRole={isRestrictedRole}
          currentSalesperson={currentSalesperson}
        />;
      case 'catalog':
        return <CatalogView catalog={catalog} setCatalog={setCatalog} formatMoney={formatMoney} />;
      case 'expenses':
        return <ExpensesView expenses={expenses} setExpenses={setExpenses} formatMoney={formatMoney} baseCurrency={baseCurrency} exchangeRates={exchangeRates} />;
      case 'reports':
        return <ReportsView quotes={normalizedQuotes} invoices={normalizedInvoices} expenses={normalizedExpenses} team={team} formatMoney={formatMoney} />;
      case 'ai':
        return <AIInsightsView quotes={filteredQuotes} invoices={filteredInvoices} expenses={expenses} team={team} />;
      case 'access':
        return <AccessManagementView roles={roles} setRoles={setRoles} users={userProfiles} setUsers={setUserProfiles} />;
      default:
        return <Dashboard quotes={normalizedQuotes} invoices={normalizedInvoices} expenses={normalizedExpenses} formatMoney={formatMoney} onViewAllTransactions={() => setActiveView('invoices')} isSalesRole={isRestrictedRole} salesperson={currentSalesperson} leads={filteredLeads} userRoleId={currentUserProfile?.roleId} />;
    }
  };

  if (authLoading || isLoggingOut) return <div className="min-h-screen bg-slate-950 flex items-center justify-center animate-pulse"><div className="w-16 h-16 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <AuthView roles={roles.filter(r => r.id !== 'role-super-admin')} defaultRoleId={defaultRoleId} />;

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-50`}>
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-indigo-400">{companyName.split(' ')[0]}</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 mt-4 px-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id as View)} 
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {item.id === 'access' && pendingUsersCount > 0 && (
                <span className={`absolute ${isSidebarOpen ? 'right-4' : 'top-1 right-1'} flex h-2 w-2`}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-slate-900"></span>
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={() => setActiveView('settings')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
             <Settings size={20} />
             {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
           </button>
        </div>
      </aside>
      <main className={`flex-1 overflow-y-auto relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-8 py-4 flex items-center justify-between ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black capitalize">{activeView === 'settings' ? 'Settings' : navItems.find(i => i.id === activeView)?.label}</h1>
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
               <Globe size={12} className="text-indigo-500" />
               <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest">{baseCurrency} Registry</span>
             </div>
             {pendingUsersCount > 0 && hasPermission('manage_access') && (
               <button 
                onClick={() => setActiveView('access')}
                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full border border-red-100 dark:border-red-900 animate-in fade-in zoom-in duration-300 ml-4 shadow-sm"
               >
                 <AlertTriangle size={12} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{pendingUsersCount} New User needs role assignment</span>
               </button>
             )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
               <div className="text-xs font-black">{session.user.email}</div>
               <div className="text-[10px] text-slate-400 font-bold uppercase">Base: {baseCurrency}</div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-indigo-100 text-indigo-600 border-indigo-200">{session.user.email?.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>
        <div className="p-8">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
