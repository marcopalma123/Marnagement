// Data persistence layer using localStorage

import { WorkDay, Client, Meeting, Invoice, Settings, Template } from '@/types';

const STORAGE_KEYS = {
  workDays: 'marnagement_workDays',
  clients: 'marnagement_clients',
  meetings: 'marnagement_meetings',
  invoices: 'marnagement_invoices',
  settings: 'marnagement_settings',
  templates: 'marnagement_templates',
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Work Days
export function getWorkDays(): WorkDay[] {
  return get(STORAGE_KEYS.workDays, []);
}

export function saveWorkDay(day: WorkDay): void {
  const days = getWorkDays();
  const idx = days.findIndex((d) => d.id === day.id);
  if (idx >= 0) {
    days[idx] = day;
  } else {
    days.push(day);
  }
  set(STORAGE_KEYS.workDays, days);
}

export function deleteWorkDay(id: string): void {
  const days = getWorkDays().filter((d) => d.id !== id);
  set(STORAGE_KEYS.workDays, days);
}

// Clients
export function getClients(): Client[] {
  return get(STORAGE_KEYS.clients, []);
}

export function saveClient(client: Client): void {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    clients[idx] = client;
  } else {
    clients.push(client);
  }
  set(STORAGE_KEYS.clients, clients);
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  set(STORAGE_KEYS.clients, clients);
}

// Meetings
export function getMeetings(): Meeting[] {
  return get(STORAGE_KEYS.meetings, []);
}

export function saveMeeting(meeting: Meeting): void {
  const meetings = getMeetings();
  const idx = meetings.findIndex((m) => m.id === meeting.id);
  if (idx >= 0) {
    meetings[idx] = meeting;
  } else {
    meetings.push(meeting);
  }
  set(STORAGE_KEYS.meetings, meetings);
}

export function deleteMeeting(id: string): void {
  const meetings = getMeetings().filter((m) => m.id !== id);
  set(STORAGE_KEYS.meetings, meetings);
}

// Invoices
export function getInvoices(): Invoice[] {
  return get(STORAGE_KEYS.invoices, []);
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  const idx = invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    invoices[idx] = invoice;
  } else {
    invoices.push(invoice);
  }
  set(STORAGE_KEYS.invoices, invoices);
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter((i) => i.id !== id);
  set(STORAGE_KEYS.invoices, invoices);
}

// Settings
export function getSettings(): Settings {
  return get(STORAGE_KEYS.settings, {
    dailyRate: 0,
    defaultCurrency: 'EUR',
    invoiceDeadlineDays: 30,
    taxRate: 0,
    businessName: '',
    businessEmail: '',
    businessAddress: '',
    currencies: [
      { code: 'EUR', symbol: '€', rate: 1 },
      { code: 'USD', symbol: '$', rate: 1.08 },
      { code: 'GBP', symbol: '£', rate: 0.86 },
    ],
  });
}

export function saveSettings(settings: Settings): void {
  set(STORAGE_KEYS.settings, settings);
}

// Templates
export function getTemplates(): Template[] {
  return get(STORAGE_KEYS.templates, []);
}

export function saveTemplate(template: Template): void {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  set(STORAGE_KEYS.templates, templates);
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  set(STORAGE_KEYS.templates, templates);
}

// Export all data as JSON
export function exportAllData(): string {
  return JSON.stringify({
    workDays: getWorkDays(),
    clients: getClients(),
    meetings: getMeetings(),
    invoices: getInvoices(),
    settings: getSettings(),
    templates: getTemplates(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// Import data from JSON
export function importAllData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.workDays) set(STORAGE_KEYS.workDays, data.workDays);
    if (data.clients) set(STORAGE_KEYS.clients, data.clients);
    if (data.meetings) set(STORAGE_KEYS.meetings, data.meetings);
    if (data.invoices) set(STORAGE_KEYS.invoices, data.invoices);
    if (data.settings) set(STORAGE_KEYS.settings, data.settings);
    if (data.templates) set(STORAGE_KEYS.templates, data.templates);
    return true;
  } catch {
    return false;
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
