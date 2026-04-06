import { WorkDay, Client, Meeting, Invoice, Settings, Template } from '@/types';

let db: any = null;
let dbChecked = false;

function getDb() {
  if (db) return db;
  if (dbChecked) return null;
  
  const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL;
  
  if (!databaseUrl) {
    dbChecked = true;
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require('@neondatabase/serverless');
  db = neon(databaseUrl);
  dbChecked = true;
  return db;
}

async function initializeTables() {
  const database = getDb();
  if (!database) return;
  
  await database`
    CREATE TABLE IF NOT EXISTS work_days (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      hours_worked REAL NOT NULL,
      notes TEXT,
      is_business_day BOOLEAN NOT NULL,
      client_id TEXT
    )
  `;
  
  await database`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      company TEXT,
      daily_rate REAL NOT NULL,
      currency TEXT NOT NULL
    )
  `;
  
  await database`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER,
      summary TEXT,
      raw_text TEXT,
      audio_file_name TEXT,
      text_file_name TEXT,
      created_at TEXT NOT NULL
    )
  `;
  
  await database`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_id TEXT,
      month TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      paid_at TEXT
    )
  `;
  
  await database`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      daily_rate REAL NOT NULL DEFAULT 0,
      default_currency TEXT NOT NULL DEFAULT 'EUR',
      invoice_deadline_days INTEGER NOT NULL DEFAULT 30,
      tax_rate REAL NOT NULL DEFAULT 0,
      business_name TEXT,
      business_email TEXT,
      business_address TEXT,
      currencies TEXT NOT NULL,
      openai_api_key TEXT
    )
  `;
  
  await database`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      fields TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
}

// Work Days
export async function getWorkDaysDb(): Promise<WorkDay[]> {
  const database = await getDb();
  if (!database) return [];
  
  await initializeTables();
  const rows = await database`SELECT * FROM work_days ORDER BY date DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    hoursWorked: row.hours_worked,
    notes: row.notes || '',
    isBusinessDay: row.is_business_day,
    clientId: row.client_id,
  }));
}

export async function saveWorkDayDb(day: WorkDay): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO work_days (id, date, hours_worked, notes, is_business_day, client_id)
    VALUES (${day.id}, ${day.date}, ${day.hoursWorked}, ${day.notes}, ${day.isBusinessDay}, ${day.clientId})
    ON CONFLICT (id) DO UPDATE SET
      date = ${day.date},
      hours_worked = ${day.hoursWorked},
      notes = ${day.notes},
      is_business_day = ${day.isBusinessDay},
      client_id = ${day.clientId}
  `;
}

export async function deleteWorkDayDb(id: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`DELETE FROM work_days WHERE id = ${id}`;
}

// Clients
export async function getClientsDb(): Promise<Client[]> {
  const database = await getDb();
  if (!database) return [];
  
  const rows = await database`SELECT * FROM clients ORDER BY name`;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    dailyRate: row.daily_rate,
    currency: row.currency,
  }));
}

export async function saveClientDb(client: Client): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO clients (id, name, email, company, daily_rate, currency)
    VALUES (${client.id}, ${client.name}, ${client.email}, ${client.company}, ${client.dailyRate}, ${client.currency})
    ON CONFLICT (id) DO UPDATE SET
      name = ${client.name},
      email = ${client.email},
      company = ${client.company},
      daily_rate = ${client.dailyRate},
      currency = ${client.currency}
  `;
}

export async function deleteClientDb(id: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`DELETE FROM clients WHERE id = ${id}`;
}

// Meetings
export async function getMeetingsDb(): Promise<Meeting[]> {
  const database = await getDb();
  if (!database) return [];
  
  const rows = await database`SELECT * FROM meetings ORDER BY date DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    duration: row.duration,
    summary: row.summary || '',
    rawText: row.raw_text,
    audioFileName: row.audio_file_name,
    textFileName: row.text_file_name,
    createdAt: row.created_at,
  }));
}

export async function saveMeetingDb(meeting: Meeting): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO meetings (id, title, date, duration, summary, raw_text, audio_file_name, text_file_name, created_at)
    VALUES (${meeting.id}, ${meeting.title}, ${meeting.date}, ${meeting.duration}, ${meeting.summary}, ${meeting.rawText}, ${meeting.audioFileName}, ${meeting.textFileName}, ${meeting.createdAt})
    ON CONFLICT (id) DO UPDATE SET
      title = ${meeting.title},
      date = ${meeting.date},
      duration = ${meeting.duration},
      summary = ${meeting.summary},
      raw_text = ${meeting.rawText},
      audio_file_name = ${meeting.audioFileName},
      text_file_name = ${meeting.textFileName},
      created_at = ${meeting.createdAt}
  `;
}

export async function deleteMeetingDb(id: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`DELETE FROM meetings WHERE id = ${id}`;
}

// Invoices
export async function getInvoicesDb(): Promise<Invoice[]> {
  const database = await getDb();
  if (!database) return [];
  
  const rows = await database`SELECT * FROM invoices ORDER BY created_at DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    month: row.month,
    items: JSON.parse(row.items),
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    currency: row.currency,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}

export async function saveInvoiceDb(invoice: Invoice): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO invoices (id, invoice_number, client_id, month, items, subtotal, tax, total, currency, status, due_date, created_at, paid_at)
    VALUES (${invoice.id}, ${invoice.invoiceNumber}, ${invoice.clientId}, ${invoice.month}, ${JSON.stringify(invoice.items)}, ${invoice.subtotal}, ${invoice.tax}, ${invoice.total}, ${invoice.currency}, ${invoice.status}, ${invoice.dueDate}, ${invoice.createdAt}, ${invoice.paidAt})
    ON CONFLICT (id) DO UPDATE SET
      invoice_number = ${invoice.invoiceNumber},
      client_id = ${invoice.clientId},
      month = ${invoice.month},
      items = ${JSON.stringify(invoice.items)},
      subtotal = ${invoice.subtotal},
      tax = ${invoice.tax},
      total = ${invoice.total},
      currency = ${invoice.currency},
      status = ${invoice.status},
      due_date = ${invoice.dueDate},
      created_at = ${invoice.createdAt},
      paid_at = ${invoice.paidAt}
  `;
}

export async function deleteInvoiceDb(id: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`DELETE FROM invoices WHERE id = ${id}`;
}

// Settings
export async function getSettingsDb(): Promise<Settings | null> {
  const database = await getDb();
  if (!database) return null;
  
  const rows = await database`SELECT * FROM settings WHERE id = 'default'`;
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    dailyRate: row.daily_rate,
    defaultCurrency: row.default_currency,
    invoiceDeadlineDays: row.invoice_deadline_days,
    taxRate: row.tax_rate,
    businessName: row.business_name || '',
    businessEmail: row.business_email || '',
    businessAddress: row.business_address || '',
    currencies: JSON.parse(row.currencies),
    openaiApiKey: row.openai_api_key,
  };
}

export async function saveSettingsDb(settings: Settings): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO settings (id, daily_rate, default_currency, invoice_deadline_days, tax_rate, business_name, business_email, business_address, currencies, openai_api_key)
    VALUES ('default', ${settings.dailyRate}, ${settings.defaultCurrency}, ${settings.invoiceDeadlineDays}, ${settings.taxRate}, ${settings.businessName}, ${settings.businessEmail}, ${settings.businessAddress}, ${JSON.stringify(settings.currencies)}, ${settings.openaiApiKey})
    ON CONFLICT (id) DO UPDATE SET
      daily_rate = ${settings.dailyRate},
      default_currency = ${settings.defaultCurrency},
      invoice_deadline_days = ${settings.invoiceDeadlineDays},
      tax_rate = ${settings.taxRate},
      business_name = ${settings.businessName},
      business_email = ${settings.businessEmail},
      business_address = ${settings.businessAddress},
      currencies = ${JSON.stringify(settings.currencies)},
      openai_api_key = ${settings.openaiApiKey}
  `;
}

// Templates
export async function getTemplatesDb(): Promise<Template[]> {
  const database = await getDb();
  if (!database) return [];
  
  const rows = await database`SELECT * FROM templates ORDER BY created_at DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    content: row.content,
    fields: JSON.parse(row.fields),
    createdAt: row.created_at,
  }));
}

export async function saveTemplateDb(template: Template): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`
    INSERT INTO templates (id, name, content, fields, created_at)
    VALUES (${template.id}, ${template.name}, ${template.content}, ${JSON.stringify(template.fields)}, ${template.createdAt})
    ON CONFLICT (id) DO UPDATE SET
      name = ${template.name},
      content = ${template.content},
      fields = ${JSON.stringify(template.fields)},
      created_at = ${template.createdAt}
  `;
}

export async function deleteTemplateDb(id: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database`DELETE FROM templates WHERE id = ${id}`;
}