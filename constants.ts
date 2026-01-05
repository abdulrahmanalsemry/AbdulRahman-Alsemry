
import { Salesperson, SalespersonType, ServiceItem, Quote, QuoteStatus, Invoice, InvoiceStatus, OperationalExpense, Client, CustomRole, UserProfile, UserStatus } from './types';

export const SYSTEM_ROLES: CustomRole[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Full system access including security and access control management.',
    permissions: [
      'view_dashboard', 'view_clients', 'manage_clients', 'view_leads', 'manage_leads', 'delete_leads', 'view_quotes', 'manage_quotes', 
      'view_invoices', 'manage_invoices', 'view_upcoming_invoices', 'view_team', 'manage_team', 
      'view_catalog', 'manage_catalog', 'view_expenses', 'manage_expenses', 'view_reports', 
      'view_ai', 'manage_access'
    ],
    isSystem: true
  },
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'High-level access to all business modules but no security configuration.',
    permissions: [
      'view_dashboard', 'view_clients', 'manage_clients', 'view_leads', 'manage_leads', 'delete_leads', 'view_quotes', 'manage_quotes', 
      'view_invoices', 'manage_invoices', 'view_upcoming_invoices', 'view_team', 'manage_team', 
      'view_catalog', 'manage_catalog', 'view_expenses', 'manage_expenses', 'view_reports', 'view_ai'
    ],
    isSystem: true
  },
  {
    id: 'role-accountant',
    name: 'Accountant',
    description: 'Specialized financial access to manage invoices, record payments, and monitor company expenses.',
    permissions: [
      'view_dashboard', 'view_clients', 'view_invoices', 'manage_invoices', 'view_upcoming_invoices',
      'view_expenses', 'manage_expenses', 'view_reports'
    ],
    isSystem: true
  },
  {
    id: 'role-sales-manager',
    name: 'Sales Manager',
    description: 'Strategic access to quotes, invoices, and clients. Oversees lead generation and pipeline health.',
    permissions: [
      'view_dashboard', 'view_clients', 'manage_clients', 'view_leads', 'manage_leads', 'view_quotes', 'manage_quotes', 'view_invoices', 'view_upcoming_invoices'
    ],
    isSystem: true
  },
  {
    id: 'role-secretary',
    name: 'Secretary',
    description: 'Administrative core focusing on client coordination and lead logging.',
    permissions: [
      'view_dashboard', 'view_clients', 'manage_clients', 'view_leads', 'manage_leads'
    ],
    isSystem: true
  },
  {
    id: 'role-sales-team-leads',
    name: 'Sales Team (Leads Focus)',
    description: 'Restricted role with access to leads only (view, create, edit). No delete permissions.',
    permissions: [
      'view_dashboard', 'view_leads', 'manage_leads'
    ],
    isSystem: true
  },
  {
    id: 'role-new-user',
    name: 'New User',
    description: 'Default role for new registrations. Awaits administrative assignment.',
    permissions: [],
    isSystem: true
  }
];

export const INITIAL_USER_PROFILES: UserProfile[] = [
  {
    id: 'user-001',
    email: 'abdulrahmanalsemry@gmail.com',
    roleId: 'role-super-admin',
    status: UserStatus.ACTIVE,
    createdAt: '2023-01-01T10:00:00Z',
    lastActive: new Date().toISOString(),
    activityLogs: [
      { id: 'l1', action: 'System Initialization', timestamp: '2023-10-20T08:00:00Z', details: 'Primary Super Admin account provisioned.' }
    ]
  },
  {
    id: 'user-002',
    email: 'accountant@gmail.com',
    roleId: 'role-accountant',
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    activityLogs: [
      { id: 'l2', action: 'System Provisioning', timestamp: new Date().toISOString(), details: 'Accountant profile initialized.' }
    ]
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    companyName: 'Oman Tech Solutions',
    contactPerson: 'Ahmed Al-Said',
    email: 'ahmed@omantech.om',
    phone: '+968 2450 0000',
    address: 'Mutrah Business District, Muscat, Oman',
  }
];

export const INITIAL_SALES_TEAM: Salesperson[] = [
  {
    id: 'sp1',
    name: 'Salim Al-Abri',
    email: 'abdulrahmanalsemry@gmail.com',
    type: SalespersonType.FIXED_PLUS_COMMISSION,
    baseSalary: 800,
    commissionRate: 3,
    operationalBudget: 0,
    commissionDetails: { tieredRates: [] },
    monthlyLeadsTarget: 10
  }
];

export const INITIAL_CATALOG: ServiceItem[] = [
  {
    id: 's1',
    name: 'Social Media Management',
    description: 'Monthly content creation, scheduling, and community management.',
    basePrice: 450,
    baseCost: 150,
    unitCost: 100,
    programmingCost: 50,
    type: 'Recurring',
    minContractMonths: 3,
    currency: 'OMR'
  }
];

export const INITIAL_QUOTES: Quote[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_EXPENSES: OperationalExpense[] = [];
