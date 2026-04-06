// Data persistence layer using localStorage + optional Neon database

import { WorkDay, Client, Meeting, Invoice, Settings, Template } from '@/types';
import * as db from './db';

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

const isDbAvailable = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_DATABASE_URL;

// Work Days
export function getWorkDays(): WorkDay[] {
  return get(STORAGE_KEYS.workDays, []);
}

export async function getWorkDaysRemote(): Promise<WorkDay[]> {
  return db.getWorkDaysDb();
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
  
  if (isDbAvailable) {
    db.saveWorkDayDb(day).catch(console.error);
  }
}

export function deleteWorkDay(id: string): void {
  const days = getWorkDays().filter((d) => d.id !== id);
  set(STORAGE_KEYS.workDays, days);
  
  if (isDbAvailable) {
    db.deleteWorkDayDb(id).catch(console.error);
  }
}

// Clients
export function getClients(): Client[] {
  return get(STORAGE_KEYS.clients, []);
}

export async function getClientsRemote(): Promise<Client[]> {
  return db.getClientsDb();
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
  
  if (isDbAvailable) {
    db.saveClientDb(client).catch(console.error);
  }
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  set(STORAGE_KEYS.clients, clients);
  
  if (isDbAvailable) {
    db.deleteClientDb(id).catch(console.error);
  }
}

// Meetings
export function getMeetings(): Meeting[] {
  return get(STORAGE_KEYS.meetings, []);
}

export async function getMeetingsRemote(): Promise<Meeting[]> {
  return db.getMeetingsDb();
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
  
  if (isDbAvailable) {
    db.saveMeetingDb(meeting).catch(console.error);
  }
}

export function deleteMeeting(id: string): void {
  const meetings = getMeetings().filter((m) => m.id !== id);
  set(STORAGE_KEYS.meetings, meetings);
  
  if (isDbAvailable) {
    db.deleteMeetingDb(id).catch(console.error);
  }
}

// Invoices
export function getInvoices(): Invoice[] {
  return get(STORAGE_KEYS.invoices, []);
}

export async function getInvoicesRemote(): Promise<Invoice[]> {
  return db.getInvoicesDb();
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
  
  if (isDbAvailable) {
    db.saveInvoiceDb(invoice).catch(console.error);
  }
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter((i) => i.id !== id);
  set(STORAGE_KEYS.invoices, invoices);
  
  if (isDbAvailable) {
    db.deleteInvoiceDb(id).catch(console.error);
  }
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

export async function getSettingsRemote(): Promise<Settings | null> {
  return db.getSettingsDb();
}

export function saveSettings(settings: Settings): void {
  set(STORAGE_KEYS.settings, settings);
  
  if (isDbAvailable) {
    db.saveSettingsDb(settings).catch(console.error);
  }
}

// Templates
export function getTemplates(): Template[] {
  return get(STORAGE_KEYS.templates, []);
}

export async function getTemplatesRemote(): Promise<Template[]> {
  return db.getTemplatesDb();
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
  
  if (isDbAvailable) {
    db.saveTemplateDb(template).catch(console.error);
  }
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  set(STORAGE_KEYS.templates, templates);
  
  if (isDbAvailable) {
    db.deleteTemplateDb(id).catch(console.error);
  }
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