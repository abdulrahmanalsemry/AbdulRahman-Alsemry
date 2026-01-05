
export enum AppRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export type Permission = 
  | 'view_dashboard' 
  | 'view_clients' 
  | 'manage_clients'
  | 'view_leads'
  | 'manage_leads'
  | 'delete_leads'
  | 'view_quotes' 
  | 'manage_quotes' 
  | 'view_invoices' 
  | 'manage_invoices' 
  | 'view_upcoming_invoices'
  | 'view_team' 
  | 'manage_team' 
  | 'view_catalog' 
  | 'manage_catalog' 
  | 'view_expenses' 
  | 'manage_expenses' 
  | 'view_reports' 
  | 'view_ai'
  | 'manage_access';

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem?: boolean;
}

export enum UserStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  DISABLED = 'Disabled'
}

export interface UserActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  roleId: string; // References a CustomRole id
  status: UserStatus;
  lastActive?: string;
  createdAt: string;
  activityLogs: UserActivityLog[];
}

export enum SalespersonType {
  FIXED_PLUS_COMMISSION = 'Fixed + Commission',
  BUDGET_PLUS_COMMISSION = 'Budget + Commission',
  COMMISSION_ONLY = 'Commission Only'
}

export interface CommissionTier {
  threshold: number;
  rate: number; // percentage
}

export interface CommissionDetails {
  tieredRates: CommissionTier[];
  performanceBonusThreshold?: number;
  performanceBonusAmount?: number;
}

export interface Salesperson {
  id: string;
  name: string;
  email: string; // Added email field for identity matching
  type: SalespersonType;
  baseSalary: number;
  commissionRate: number; // as percentage, base rate
  operationalBudget: number;
  commissionDetails?: CommissionDetails;
  monthlyLeadsTarget?: number; // Target for field visits
}

export type CommLogType = 'Call' | 'Email' | 'Meeting' | 'Note';

export interface CommunicationLog {
  id: string;
  date: string;
  type: CommLogType;
  summary: string;
  agentName: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  communicationLogs?: CommunicationLog[];
}

export interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  salespersonId: string;
  visitDate: string;
  visitDetails: string;
  status: 'Potential' | 'Converted';
  followUpDate?: string;
}

export type ServiceType = 'One-time' | 'Recurring';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseCost: number; // Total combined cost
  unitCost: number; // Raw material cost per unit
  programmingCost: number; // Processing/Programming cost per unit
  currency?: string;
  // Contract specific fields
  type: ServiceType;
  minContractMonths?: number;
}

export enum QuoteStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  FOLLOW_UP = 'Follow-up',
  NEGOTIATION = 'Negotiation',
  AWAITING_SIGNATURE = 'Awaiting Signature',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  REVISIONED = 'Revisioned'
}

export interface QuoteStatusChange {
  status: QuoteStatus;
  timestamp: string;
}

export type BillingFrequency = 'One-time' | 'Monthly' | 'Quarterly' | 'Annual';

export interface QuoteLineItem {
  serviceId: string;
  quantity: number;
  unitPrice: number;
  costOfGoodsSold: number;
  description: string;
  // Flexible Payment Fields
  billingFrequency: BillingFrequency;
  contractMonths: number;
  downpayment: number;
  downpaymentType: 'fixed' | 'percentage';
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'proposal' | 'specification' | 'contract' | 'other';
  addedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  parentQuoteId?: string;
  clientId: string;
  clientName: string;
  salespersonId: string;
  date: string;
  status: QuoteStatus;
  statusHistory: QuoteStatusChange[];
  items: QuoteLineItem[];
  subtotal: number;
  discount: number;
  discountType: 'fixed' | 'percentage';
  totalAmount: number;
  costOfGoodsSold: number;
  totalCost: number;
  commissionAmount: number;
  appliedCommissionRate: number;
  appliedCommissionDetails?: CommissionDetails;
  netProfit: number;
  notes: string;
  termsAndConditions?: string;
  lastStatusChange?: string;
  followUpDate?: string;
  attachments?: Attachment[];
  currency: string;
  exchangeRate: number;
  // Aggregated plan summary
  dueAtSigning: number;
  recurringAmount: number;
}

export enum InvoiceStatus {
  UNPAID = 'Unpaid',
  PARTIAL = 'Partial',
  PAID = 'Paid'
}

export interface PaymentProof {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  proofUrl?: string;
  proofFiles?: PaymentProof[];
}

export type RecurringFrequency = 'Monthly' | 'Quarterly' | 'Annual';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  totalAmount: number;
  recurringAmount?: number;
  paymentHistory: PaymentRecord[];
  paymentTerms: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  lastGeneratedDate?: string;
  parentInvoiceId?: string;
  currency: string;
  exchangeRate: number;
}

export type ExpenseFrequency = 'One-time' | '1 Hour' | 'Half Day' | 'Daily' | 'Monthly' | 'Quarterly' | 'Half Year' | 'Yearly';

export interface OperationalExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  frequency?: ExpenseFrequency;
  remainingCycles?: number;
  lastGeneratedDate?: string;
  currency: string;
  exchangeRate: number;
}
