// Core data types for marnagement

export interface WorkDay {
  id: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
  notes: string;
  isBusinessDay: boolean;
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
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
  days: number;
  rate: number;
  amount: number;
  notes: string;
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

export type NavigationItem = 'dashboard' | 'calendar' | 'meetings' | 'editor' | 'invoices' | 'settings';
