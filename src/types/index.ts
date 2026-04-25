// Core data types for marnagement

export interface WorkDay {
  id: string;
  date: string; // YYYY-MM-DD
  projectId: string;
  hoursWorked: number;
  notes?: string;
  isBusinessDay?: boolean;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  dailyRate: number;
  currency: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration?: number; // minutes
  summary: string;
  rawText?: string;
  audioFileName?: string;
  textFileName?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  taskName?: string;
  days: number;
  rate: number;
  amount: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  month: string; // YYYY-MM
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  conversionRate: number; // exchange rate to base currency (4 decimal places)
  receivedValue?: number; // amount received, when set marks invoice as paid
  taxAuthorityAmount?: number; // amount sent to tax authority in EUR
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
}

export interface Settings {
  dailyRate: number;
  defaultCurrency: string;
  invoiceDeadlineDays: number;
  taxRate: number;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPostalCode?: string;
  businessCountry?: string;
  businessPhone?: string;
  businessFiscalNumber?: string;
  currencies: CurrencyConfig[];
  openaiApiKey?: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // rate relative to base currency
}

export interface Template {
  id: string;
  name: string;
  content: string; // JSON stringified template with placeholders
  fields: TemplateField[];
  createdAt: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date';
  defaultValue?: string;
}

export type NavigationItem = 'dashboard' | 'calendar' | 'projects' | 'meetings' | 'editor' | 'invoices' | 'telegram' | 'triggers' | 'settings';

export interface SpecialDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'vacation' | 'sick' | 'holiday';
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  dateCreated: string;
  status: 'backlog' | 'doing' | 'done';
  isActive?: boolean;
  statuses: ProjectStatus[];
  tasks: Task[];
}

export interface ProjectStatus {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  statusId: string;
  createdAt: string;
}
