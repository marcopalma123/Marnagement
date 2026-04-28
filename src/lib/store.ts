// Data persistence layer using localStorage + server API for database

import { WorkDay, Client, Meeting, Invoice, Settings, Template, SpecialDay, Project } from '@/types';

const STORAGE_KEYS = {
  workDays: 'marnagement_workDays',
  clients: 'marnagement_clients',
  meetings: 'marnagement_meetings',
  invoices: 'marnagement_invoices',
  settings: 'marnagement_settings',
  templates: 'marnagement_templates',
  specialDays: 'marnagement_specialDays',
  projects: 'marnagement_projects',
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

async function callDbApi<T>(action: string, data?: unknown): Promise<T | null> {
  try {
    const response = await fetch('/api/db?type=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    });
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return null;
    }
    if (!response.ok) return null;
    const result = await response.json();
    return result as T;
  } catch {
    return null;
  }
}

async function fetchFromDb<T>(type: string): Promise<T | null> {
  try {
    console.log('[fetchFromDb] fetching type:', type);
    const response = await fetch('/api/db?type=' + type);
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return null;
    }
    if (!response.ok) {
      console.log('[fetchFromDb] response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('[fetchFromDb] received data for', type, ':', data);
    return data;
  } catch (e) {
    console.log('[fetchFromDb] error:', e);
    return null;
  }
}

// Work Days
export function getWorkDays(): WorkDay[] {
  return get(STORAGE_KEYS.workDays, []);
}

export async function getWorkDaysRemote(): Promise<WorkDay[]> {
  const data = await fetchFromDb<WorkDay[]>('workdays');
  console.log('[getWorkDaysRemote] data from DB:', data);
  if (data) {
    set(STORAGE_KEYS.workDays, data);
    return data;
  }
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
  callDbApi('saveWorkDay', day);
}

export function deleteWorkDay(id: string): void {
  const days = getWorkDays().filter((d) => d.id !== id);
  set(STORAGE_KEYS.workDays, days);
  callDbApi('deleteWorkDay', { id });
}

// Clients
export function getClients(): Client[] {
  return get(STORAGE_KEYS.clients, []);
}

export async function getClientsRemote(): Promise<Client[]> {
  const data = await fetchFromDb<Client[]>('clients');
  if (data && data.length > 0) {
    set(STORAGE_KEYS.clients, data);
    return data;
  }
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
  callDbApi('saveClient', client);
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  set(STORAGE_KEYS.clients, clients);
  callDbApi('deleteClient', { id });
}

// Meetings
export function getMeetings(): Meeting[] {
  return get(STORAGE_KEYS.meetings, []);
}

export async function getMeetingsRemote(): Promise<Meeting[]> {
  const data = await fetchFromDb<Meeting[]>('meetings');
  if (data && data.length > 0) {
    set(STORAGE_KEYS.meetings, data);
    return data;
  }
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
  callDbApi('saveMeeting', meeting);
}

export function deleteMeeting(id: string): void {
  const meetings = getMeetings().filter((m) => m.id !== id);
  set(STORAGE_KEYS.meetings, meetings);
  callDbApi('deleteMeeting', { id });
}

// Invoices
export function getInvoices(): Invoice[] {
  return get(STORAGE_KEYS.invoices, []);
}

export async function getInvoicesRemote(): Promise<Invoice[]> {
  const data = await fetchFromDb<Invoice[]>('invoices');
  console.log('[getInvoicesRemote] data from DB:', data);
  if (data) {
    set(STORAGE_KEYS.invoices, data);
    return data;
  }
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
  callDbApi('saveInvoice', invoice);
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter((i) => i.id !== id);
  set(STORAGE_KEYS.invoices, invoices);
  callDbApi('deleteInvoice', { id });
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
    anualEstimate: 0,
    yearOfActivity: 1,
    currencies: [
      { code: 'EUR', symbol: '€', rate: 1 },
      { code: 'USD', symbol: '$', rate: 1.08 },
      { code: 'GBP', symbol: '£', rate: 0.86 },
    ],
  });
}

export async function getSettingsRemote(): Promise<Settings | null> {
  const data = await fetchFromDb<Settings>('settings');
  if (data) {
    const normalized: Settings = {
      ...data,
      anualEstimate: data.anualEstimate ?? 0,
      yearOfActivity: data.yearOfActivity ?? 1,
    };
    set(STORAGE_KEYS.settings, normalized);
    return normalized;
  }
  return getSettings();
}

export function saveSettings(settings: Settings): void {
  set(STORAGE_KEYS.settings, settings);
  callDbApi('saveSettings', settings);
}

// Templates
export function getTemplates(): Template[] {
  return get(STORAGE_KEYS.templates, []);
}

export async function getTemplatesRemote(): Promise<Template[]> {
  const data = await fetchFromDb<Template[]>('templates');
  if (data && data.length > 0) {
    set(STORAGE_KEYS.templates, data);
    return data;
  }
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
  callDbApi('saveTemplate', template);
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  set(STORAGE_KEYS.templates, templates);
  callDbApi('deleteTemplate', { id });
}

// Special Days
export function getSpecialDays(): SpecialDay[] {
  return get(STORAGE_KEYS.specialDays, []);
}

export async function getSpecialDaysRemote(): Promise<SpecialDay[]> {
  const data = await fetchFromDb<SpecialDay[]>('specialdays');
  console.log('[getSpecialDaysRemote] data from DB:', data);
  if (data) {
    set(STORAGE_KEYS.specialDays, data);
    return data;
  }
  return get(STORAGE_KEYS.specialDays, []);
}

export function saveSpecialDay(day: SpecialDay): void {
  const days = getSpecialDays();
  const idx = days.findIndex((d) => d.id === day.id);
  if (idx >= 0) {
    days[idx] = day;
  } else {
    days.push(day);
  }
  set(STORAGE_KEYS.specialDays, days);
  callDbApi('saveSpecialDay', day);
}

export function deleteSpecialDay(id: string): void {
  const days = getSpecialDays().filter((d) => d.id !== id);
  set(STORAGE_KEYS.specialDays, days);
  callDbApi('deleteSpecialDay', { id });
}

// Projects
export function getProjects(): Project[] {
  return get(STORAGE_KEYS.projects, []);
}

export async function getProjectsRemote(): Promise<Project[]> {
  const data = await fetchFromDb<Project[]>('projects');
  if (data && data.length > 0) {
    set(STORAGE_KEYS.projects, data);
    return data;
  }
  return get(STORAGE_KEYS.projects, []);
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  set(STORAGE_KEYS.projects, projects);
  callDbApi('saveProject', project);
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  set(STORAGE_KEYS.projects, projects);
  callDbApi('deleteProject', { id });
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
