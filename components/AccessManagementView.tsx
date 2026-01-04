
import React, { useState } from 'react';
import { CustomRole, UserProfile, Permission, UserStatus } from '../types';
import { 
  ShieldCheck, UserCog, Lock, Users, Plus, X, Check, Search, 
  AlertCircle, Info, ShieldAlert, Key, Trash2, Ban, Play, 
  History, Mail, Calendar, Eye, Power, AlertTriangle, UserMinus,
  UserPlus, Shield
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  roles: CustomRole[];
  setRoles: React.Dispatch<React.SetStateAction<CustomRole[]>>;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}

const ALL_PERMISSIONS: { id: Permission; label: string; group: string }[] = [
  { id: 'view_dashboard', label: 'View Dashboard', group: 'Analytics' },
  { id: 'view_reports', label: 'View Financial Reports', group: 'Analytics' },
  { id: 'view_ai', label: 'Use AI Business Analyst', group: 'Analytics' },
  { id: 'view_clients', label: 'View Client List', group: 'Clients' },
  { id: 'manage_clients', label: 'Manage Clients (Create/Edit)', group: 'Clients' },
  { id: 'view_leads', label: 'View Lead List', group: 'Leads' },
  { id: 'manage_leads', label: 'Manage Leads (Create/Edit)', group: 'Leads' },
  { id: 'delete_leads', label: 'Delete Leads', group: 'Leads' },
  { id: 'view_quotes', label: 'View Price Quotes', group: 'Sales' },
  { id: 'manage_quotes', label: 'Manage Quotes (Create/Revise)', group: 'Sales' },
  { id: 'view_invoices', label: 'View Invoices', group: 'Finance' },
  { id: 'manage_invoices', label: 'Manage Invoices (Record Payments)', group: 'Finance' },
  { id: 'view_upcoming_invoices', label: 'View Upcoming Invoices', group: 'Finance' },
  { id: 'view_team', label: 'View Sales Team', group: 'Administration' },
  { id: 'manage_team', label: 'Manage Sales Team Members', group: 'Administration' },
  { id: 'view_catalog', label: 'View Services Catalog', group: 'Administration' },
  { id: 'manage_catalog', label: 'Manage Catalog Items', group: 'Administration' },
  { id: 'view_expenses', label: 'View Expenses', group: 'Finance' },
  { id: 'manage_expenses', label: 'Log/Modify Expenses', group: 'Finance' },
  { id: 'manage_access', label: 'Manage System Access Control', group: 'Security' },
];

const AccessManagementView: React.FC<Props> = ({ roles, setRoles, users, setUsers }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<UserProfile | null>(null);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [newRole, setNewRole] = useState<Partial<CustomRole>>({
    name: '',
    description: '',
    permissions: []
  });

  const [provisionUser, setProvisionUser] = useState({
    email: '',
    roleId: roles[roles.length - 1]?.id || ''
  });

  const handleTogglePermission = (p: Permission) => {
    setNewRole(prev => {
      const current = prev.permissions || [];
      const updated = current.includes(p) ? current.filter(item => item !== p) : [...current, p];
      return { ...prev, permissions: updated };
    });
  };

  const handleSaveRole = () => {
    if (!newRole.name) return;
    if (editingRole) {
      setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...editingRole, ...newRole as CustomRole } : r));
    } else {
      const role: CustomRole = {
        ...newRole as CustomRole,
        id: `role-${Math.random().toString(36).substr(2, 9)}`,
        isSystem: false
      };
      setRoles(prev => [...prev, role]);
    }
    setShowRoleModal(false);
    resetNewRole();
  };

  const handleProvisionUser = () => {
    if (!provisionUser.email || !provisionUser.roleId) return;
    if (users.some(u => u.email.toLowerCase() === provisionUser.email.toLowerCase())) {
      alert("Identity already exists in registry.");
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Math.random().toString(36).substr(2, 6)}`,
      email: provisionUser.email,
      roleId: provisionUser.roleId,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      lastActive: undefined,
      activityLogs: [{
        id: Math.random().toString(36).substr(2, 9),
        action: 'Account Provisioned',
        timestamp: new Date().toISOString(),
        details: `Identity created and authorized as ${roles.find(r => r.id === provisionUser.roleId)?.name} by Super Admin.`
      }]
    };

    setUsers(prev => [newUser, ...prev]);
    setShowUserModal(false);
    setProvisionUser({ email: '', roleId: roles[roles.length - 1]?.id || '' });
  };

  const logAction = (user: UserProfile, action: string, details: string) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      timestamp: new Date().toISOString(),
      details
    };
    return [newLog, ...(user.activityLogs || [])];
  };

  const handleUpdateUserRole = (userId: string, roleId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const oldRole = roles.find(r => r.id === u.roleId)?.name;
        const newRoleName = roles.find(r => r.id === roleId)?.name;
        return { 
          ...u, 
          roleId, 
          activityLogs: logAction(u, 'Role Modified', `Identity transitioned from ${oldRole} to ${newRoleName} by Super Admin.`) 
        };
      }
      return u;
    }));
  };

  const handleUpdateUserStatus = (userId: string, status: UserStatus) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { 
          ...u, 
          status, 
          activityLogs: logAction(u, 'Status Changed', `Account state set to ${status} by Super Admin governance module.`) 
        };
      }
      return u;
    }));
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setUsers(prev => prev.filter(u => u.id !== userToDelete));
    setUserToDelete(null);
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800';
      case UserStatus.SUSPENDED: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800';
      case UserStatus.DISABLED: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const resetNewRole = () => {
    setNewRole({ name: '', description: '', permissions: [] });
    setEditingRole(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-12">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-5 rounded-3xl shadow-xl shadow-indigo-500/20">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter mb-2">Access Control Center</h2>
              <p className="text-indigo-200 font-medium max-md:max-w-md">Enterprise governance: Manage user lifecycles, role permissions, and audit system activity.</p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Users size={16} /> User Registry
            </button>
            <button 
              onClick={() => setActiveTab('roles')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'roles' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Key size={16} /> Permissions Matrix
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Find users by email or identity..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
               <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-2 rounded-xl">
                 {users.length} Identities Managed
               </div>
               <button 
                 onClick={() => setShowUserModal(true)}
                 className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
               >
                 <UserPlus size={16} /> Provision User
               </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5">User Profile</th>
                  <th className="px-8 py-5">Access Tier</th>
                  <th className="px-8 py-5">System State</th>
                  <th className="px-8 py-5">Activity Pulse</th>
                  <th className="px-8 py-5 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(user => {
                  const currentRole = roles.find(r => r.id === user.roleId);
                  const isSuperAdmin = user.roleId === 'role-super-admin';
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black uppercase text-sm border ${isSuperAdmin ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                            {user.email.substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-slate-100">{user.email}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">UID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <select 
                          disabled={isSuperAdmin}
                          className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          value={user.roleId}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusBadge(user.status)}`}>
                            {user.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                          <History size={14} className="text-slate-400 dark:text-slate-500" />
                          <span className="truncate max-w-[120px]">
                            {user.lastActive ? new Date(user.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending Activation'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setSelectedUserForAudit(user)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                            title="Governance Audit"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {!isSuperAdmin && (
                            <>
                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 border border-slate-200 dark:border-slate-700">
                                {user.status !== UserStatus.ACTIVE && (
                                  <button 
                                    onClick={() => handleUpdateUserStatus(user.id, UserStatus.ACTIVE)}
                                    className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-lg transition-all"
                                    title="Enable Account"
                                  >
                                    <Power size={14} />
                                  </button>
                                )}
                                {user.status === UserStatus.ACTIVE && (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateUserStatus(user.id, UserStatus.SUSPENDED)}
                                      className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-lg transition-all"
                                      title="Suspend Account"
                                    >
                                      <Ban size={14} />
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateUserStatus(user.id, UserStatus.DISABLED)}
                                      className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-all"
                                      title="Disable Account"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                              
                              <button 
                                onClick={() => {
                                  setUserToDelete(user.id);
                                  setShowDeleteUserConfirm(true);
                                }}
                                className="ml-2 p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 dark:text-slate-600 italic font-medium">
                      No identities found in the active registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.map(role => (
            <div key={role.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col group hover:border-indigo-400 dark:hover:border-indigo-600 transition-all relative overflow-hidden rounded-[2rem]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-xl"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`p-4 rounded-2xl ${role.id === 'role-super-admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'} transition-all`}>
                  <Lock size={24} />
                </div>
                {role.isSystem && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">System Core</span>
                )}
              </div>
              
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{role.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6 line-clamp-2">{role.description}</p>
              
              <div className="flex-1 space-y-2 mb-8">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Privilege Scope</div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 4).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-tighter border border-slate-200 dark:border-slate-700">
                      {p.replace('_', ' ')}
                    </span>
                  ))}
                  {role.permissions.length > 4 && (
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-black uppercase border border-indigo-100 dark:border-indigo-800">
                      +{role.permissions.length - 4} Others
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                <button 
                  onClick={() => { setEditingRole(role); setNewRole(role); setShowRoleModal(true); }}
                  className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Configure Matrix
                </button>
                {!role.isSystem && (
                  <button 
                    onClick={() => setRoles(prev => prev.filter(r => r.id !== role.id))}
                    className="p-3 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button 
            onClick={() => { resetNewRole(); setShowRoleModal(true); }}
            className="rounded-[2.5rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-600 hover:border-indigo-200 dark:hover:border-indigo-500 hover:text-indigo-400 dark:hover:border-indigo-500 transition-all group bg-transparent"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all">
              <Plus size={32} />
            </div>
            <span className="font-black uppercase tracking-widest text-xs">Architect Custom Tier</span>
          </button>
        </div>
      )}

      {/* Provision User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
                  <UserPlus size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Provision Identity</h3>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-6 bg-slate-50/20 dark:bg-slate-950/20">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={18} />
                  <input 
                    type="email"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold dark:text-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:placeholder-slate-600"
                    placeholder="name@company.io"
                    value={provisionUser.email}
                    onChange={e => setProvisionUser({...provisionUser, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Access Authorization Tier</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={18} />
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold dark:text-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                    value={provisionUser.roleId}
                    onChange={e => setProvisionUser({...provisionUser, roleId: e.target.value})}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  Provisioning a new identity will authorize immediate system access. Users should be instructed to set up MFA upon first authentication.
                </p>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0 z-10 shadow-2xl">
              <button onClick={() => setShowUserModal(false)} className="px-8 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Discard</button>
              <button 
                onClick={handleProvisionUser}
                disabled={!provisionUser.email}
                className="bg-indigo-600 text-white px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Confirm Identity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Audit Modal */}
      {selectedUserForAudit && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-2xl shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Identity Governance Audit</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{selectedUserForAudit.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserForAudit(null)} className="text-slate-400 hover:text-slate-600 transition-all p-2"><X size={28} /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                        <Key size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Access Tier</span>
                     </div>
                     <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase">{roles.find(r => r.id === selectedUserForAudit.roleId)?.name}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                        <Calendar size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Provisioned</span>
                     </div>
                     <div className="text-xs font-black text-slate-800 dark:text-slate-100">{new Date(selectedUserForAudit.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                        <Power size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Current State</span>
                     </div>
                     <div className="text-xs font-black text-slate-800 dark:text-slate-100">{selectedUserForAudit.status}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                        <History size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Pulse</span>
                     </div>
                     <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                       {selectedUserForAudit.lastActive ? new Date(selectedUserForAudit.lastActive).toLocaleDateString() : 'N/A'}
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-indigo-500 dark:text-indigo-400" /> Administrative Ledger & Activity Timeline
                  </h4>
                  <div className="space-y-3">
                    {(selectedUserForAudit.activityLogs || []).length > 0 ? (
                      selectedUserForAudit.activityLogs.map((log) => (
                        <div key={log.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-start gap-4 shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900 transition-all">
                           <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0 shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
                           <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{log.action}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">{log.details || 'Standard transactional operation recorded by the core engine.'}</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 italic text-slate-400 dark:text-slate-600 text-sm">
                        <AlertTriangle size={32} className="mx-auto mb-3 opacity-20" />
                        No auditable records found for this identity cycle.
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900 sticky bottom-0 z-10 shadow-2xl">
              <button 
                onClick={() => setSelectedUserForAudit(null)}
                className="bg-slate-900 dark:bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
              >
                Close Audit Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Matrix Architect Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Capability Architect</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tier Logic & Permission Matrix</p>
                </div>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600 transition-all p-2"><X size={28} /></button>
            </div>

            <div className="p-8 space-y-10 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Role Name</label>
                    <input 
                      type="text"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold dark:text-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      value={newRole.name}
                      onChange={e => setNewRole({...newRole, name: e.target.value})}
                      placeholder="e.g. Regional Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Description</label>
                    <textarea 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-medium h-24 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      value={newRole.description}
                      onChange={e => setNewRole({...newRole, description: e.target.value})}
                      placeholder="Summarize access scope..."
                    />
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={16} className="text-indigo-500 dark:text-indigo-400" /> Permission Matrix Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ALL_PERMISSIONS.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => handleTogglePermission(p.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          (newRole.permissions || []).includes(p.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-100'
                        }`}
                      >
                        <div className="text-left">
                           <div className="text-[10px] font-black uppercase tracking-tight">{p.group}</div>
                           <div className="text-xs font-bold">{p.label}</div>
                        </div>
                        {(newRole.permissions || []).includes(p.id) && <Check size={16} />}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0 z-10 shadow-2xl">
              <button onClick={() => setShowRoleModal(false)} className="px-8 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Discard</button>
              <button 
                onClick={handleSaveRole}
                disabled={!newRole.name}
                className="bg-indigo-600 text-white px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {editingRole ? 'Update Capability' : 'Forge Capability'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showDeleteUserConfirm}
        onClose={() => setShowDeleteUserConfirm(false)}
        onConfirm={handleDeleteUser}
        title="Revoke Identity"
        message="This operation permanently purges the user from the central registry. All associated activity logs will be archived but the account will be rendered inactive."
        confirmText="Confirm Purge"
        type="danger"
      />
    </div>
  );
};

export default AccessManagementView;
