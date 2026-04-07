import { WorkDay, Client, Meeting, Invoice, Settings, Template, SpecialDay, Project } from '@/types';

let db: any = null;
let dbChecked = false;
let tablesInitialized = false;

function getDb() {
  if (db) return db;
  if (dbChecked) return null;
  
  const databaseUrl = process.env.DATABASE_URL;
  
  console.log('[DB] DATABASE_URL exists:', !!databaseUrl);
  
  if (!databaseUrl) {
    dbChecked = true;
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require('@neondatabase/serverless');
  console.log('[DB] Neon initialized');
  db = neon(databaseUrl);
  dbChecked = true;
  return db;
}

async function initializeTables() {
  if (tablesInitialized) return;
  
  const database = getDb();
  if (!database) {
    console.log('[DB] No database connection, skipping table initialization');
    return;
  }
  
  try {
    console.log('[DB] Initializing tables...');
    
    await database`
      CREATE TABLE IF NOT EXISTS work_days (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        hours_worked REAL NOT NULL,
        notes TEXT,
        task_name TEXT,
        project_id TEXT,
        is_business_day BOOLEAN NOT NULL,
        client_id TEXT
      )
    `;

    try {
      await database`ALTER TABLE work_days ADD COLUMN task_name TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE work_days ADD COLUMN project_id TEXT`;
    } catch {}
    
    await database`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        company TEXT,
        address TEXT,
        postal_code TEXT,
        country TEXT,
        daily_rate REAL NOT NULL,
        currency TEXT NOT NULL
      )
    `;

    try {
      await database`ALTER TABLE clients ADD COLUMN address TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE clients ADD COLUMN postal_code TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE clients ADD COLUMN country TEXT`;
    } catch {}
    
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
        conversion_rate REAL NOT NULL DEFAULT 1,
        received_value REAL,
        tax_authority_amount REAL,
        status TEXT NOT NULL,
        due_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        paid_at TEXT
      )
    `;

    try {
      await database`ALTER TABLE invoices ADD COLUMN conversion_rate REAL NOT NULL DEFAULT 1`;
    } catch {}
    try {
      await database`ALTER TABLE invoices ADD COLUMN received_value REAL`;
    } catch {}
    try {
      await database`ALTER TABLE invoices ADD COLUMN tax_authority_amount REAL`;
    } catch {}
    
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
        business_postal_code TEXT,
        business_country TEXT,
        business_phone TEXT,
        business_fiscal_number TEXT,
        currencies TEXT NOT NULL,
        openai_api_key TEXT
      )
    `;

    try {
      await database`ALTER TABLE settings ADD COLUMN business_postal_code TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE settings ADD COLUMN business_country TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE settings ADD COLUMN business_phone TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE settings ADD COLUMN business_fiscal_number TEXT`;
    } catch {}
    
    await database`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        fields TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    
    await database`
      CREATE TABLE IF NOT EXISTS special_days (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'holiday')),
        notes TEXT,
        created_at TEXT NOT NULL
      )
    `;
    
    await database`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        date_created TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'backlog',
        is_active BOOLEAN NOT NULL DEFAULT true,
        statuses TEXT NOT NULL DEFAULT '[]',
        tasks TEXT NOT NULL DEFAULT '[]'
      )
    `;

    try {
      await database`ALTER TABLE projects ADD COLUMN created_at TEXT NOT NULL DEFAULT NOW()`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'backlog'`;
    } catch {}
    
    // Add missing columns if table exists from previous schema
    try {
      await database`ALTER TABLE projects ADD COLUMN start_date TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN end_date TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN date_created TEXT`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN statuses TEXT DEFAULT '[]'`;
    } catch {}
    try {
      await database`ALTER TABLE projects ADD COLUMN tasks TEXT DEFAULT '[]'`;
    } catch {}
    
    tablesInitialized = true;
    console.log('[DB] Tables initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize tables:', error);
  }
}

// Work Days
export async function getWorkDaysDb(): Promise<WorkDay[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
  const rows = await database`SELECT * FROM work_days ORDER BY date DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    hoursWorked: row.hours_worked,
    notes: row.notes || '',
    taskName: row.task_name || '',
    projectId: row.project_id || '',
    isBusinessDay: row.is_business_day,
    clientId: row.client_id,
  }));
}

export async function saveWorkDayDb(day: WorkDay): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  await database`
    INSERT INTO work_days (id, date, hours_worked, notes, task_name, project_id, is_business_day, client_id)
    VALUES (${day.id}, ${day.date}, ${day.hoursWorked}, ${day.notes}, ${day.taskName || ''}, ${day.projectId || ''}, ${day.isBusinessDay}, ${day.clientId})
    ON CONFLICT (id) DO UPDATE SET
      date = ${day.date},
      hours_worked = ${day.hoursWorked},
      notes = ${day.notes},
      task_name = ${day.taskName || ''},
      project_id = ${day.projectId || ''},
      is_business_day = ${day.isBusinessDay},
      client_id = ${day.clientId}
  `;
}

export async function deleteWorkDayDb(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM work_days WHERE id = ${id}`;
}

// Clients
export async function getClientsDb(): Promise<Client[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
  const rows = await database`SELECT * FROM clients ORDER BY name`;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    address: row.address || '',
    postalCode: row.postal_code || '',
    country: row.country || '',
    dailyRate: row.daily_rate,
    currency: row.currency,
  }));
}

export async function saveClientDb(client: Client): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  await database`
    INSERT INTO clients (id, name, email, company, address, postal_code, country, daily_rate, currency)
    VALUES (${client.id}, ${client.name}, ${client.email}, ${client.company}, ${client.address || ''}, ${client.postalCode || ''}, ${client.country || ''}, ${client.dailyRate}, ${client.currency})
    ON CONFLICT (id) DO UPDATE SET
      name = ${client.name},
      email = ${client.email},
      company = ${client.company},
      address = ${client.address || ''},
      postal_code = ${client.postalCode || ''},
      country = ${client.country || ''},
      daily_rate = ${client.dailyRate},
      currency = ${client.currency}
  `;
}

export async function deleteClientDb(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM clients WHERE id = ${id}`;
}

// Meetings
export async function getMeetingsDb(): Promise<Meeting[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
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
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
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
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM meetings WHERE id = ${id}`;
}

// Invoices
export async function getInvoicesDb(): Promise<Invoice[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
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
    conversionRate: row.conversion_rate || 1,
    receivedValue: row.received_value || undefined,
    taxAuthorityAmount: row.tax_authority_amount || undefined,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}

export async function saveInvoiceDb(invoice: Invoice): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  const status = invoice.receivedValue && invoice.receivedValue > 0 ? 'paid' : invoice.status;
  const paidAt = invoice.receivedValue && invoice.receivedValue > 0 ? (invoice.paidAt || new Date().toISOString()) : invoice.paidAt;
  
  await database`
    INSERT INTO invoices (id, invoice_number, client_id, month, items, subtotal, tax, total, currency, conversion_rate, received_value, tax_authority_amount, status, due_date, created_at, paid_at)
    VALUES (${invoice.id}, ${invoice.invoiceNumber}, ${invoice.clientId}, ${invoice.month}, ${JSON.stringify(invoice.items)}, ${invoice.subtotal}, ${invoice.tax}, ${invoice.total}, ${invoice.currency}, ${invoice.conversionRate || 1}, ${invoice.receivedValue || null}, ${invoice.taxAuthorityAmount || null}, ${status}, ${invoice.dueDate}, ${invoice.createdAt}, ${paidAt})
    ON CONFLICT (id) DO UPDATE SET
      invoice_number = ${invoice.invoiceNumber},
      client_id = ${invoice.clientId},
      month = ${invoice.month},
      items = ${JSON.stringify(invoice.items)},
      subtotal = ${invoice.subtotal},
      tax = ${invoice.tax},
      total = ${invoice.total},
      currency = ${invoice.currency},
      conversion_rate = ${invoice.conversionRate || 1},
      received_value = ${invoice.receivedValue || null},
      tax_authority_amount = ${invoice.taxAuthorityAmount || null},
      status = ${status},
      due_date = ${invoice.dueDate},
      created_at = ${invoice.createdAt},
      paid_at = ${paidAt}
  `;
}

export async function deleteInvoiceDb(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM invoices WHERE id = ${id}`;
}

// Settings
export async function getSettingsDb(): Promise<Settings | null> {
  const database = getDb();
  if (!database) return null;
  
  await initializeTables();
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
    businessPostalCode: row.business_postal_code || '',
    businessCountry: row.business_country || '',
    businessPhone: row.business_phone || '',
    businessFiscalNumber: row.business_fiscal_number || '',
    currencies: JSON.parse(row.currencies),
    openaiApiKey: row.openai_api_key,
  };
}

export async function saveSettingsDb(settings: Settings): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  await database`
    INSERT INTO settings (id, daily_rate, default_currency, invoice_deadline_days, tax_rate, business_name, business_email, business_address, business_postal_code, business_country, business_phone, business_fiscal_number, currencies, openai_api_key)
    VALUES ('default', ${settings.dailyRate}, ${settings.defaultCurrency}, ${settings.invoiceDeadlineDays}, ${settings.taxRate}, ${settings.businessName}, ${settings.businessEmail}, ${settings.businessAddress}, ${settings.businessPostalCode || ''}, ${settings.businessCountry || ''}, ${settings.businessPhone || ''}, ${settings.businessFiscalNumber || ''}, ${JSON.stringify(settings.currencies)}, ${settings.openaiApiKey})
    ON CONFLICT (id) DO UPDATE SET
      daily_rate = ${settings.dailyRate},
      default_currency = ${settings.defaultCurrency},
      invoice_deadline_days = ${settings.invoiceDeadlineDays},
      tax_rate = ${settings.taxRate},
      business_name = ${settings.businessName},
      business_email = ${settings.businessEmail},
      business_address = ${settings.businessAddress},
      business_postal_code = ${settings.businessPostalCode || ''},
      business_country = ${settings.businessCountry || ''},
      business_phone = ${settings.businessPhone || ''},
      business_fiscal_number = ${settings.businessFiscalNumber || ''},
      currencies = ${JSON.stringify(settings.currencies)},
      openai_api_key = ${settings.openaiApiKey}
  `;
}

// Templates
export async function getTemplatesDb(): Promise<Template[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
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
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
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
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM templates WHERE id = ${id}`;
}

// Special Days
export async function getSpecialDaysDb(): Promise<SpecialDay[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
  const rows = await database`SELECT * FROM special_days ORDER BY date DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    notes: row.notes || '',
    createdAt: row.created_at,
  }));
}

export async function saveSpecialDayDb(day: SpecialDay): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  await database`
    INSERT INTO special_days (id, date, type, notes, created_at)
    VALUES (${day.id}, ${day.date}, ${day.type}, ${day.notes}, ${day.createdAt})
    ON CONFLICT (id) DO UPDATE SET
      date = ${day.date},
      type = ${day.type},
      notes = ${day.notes}
  `;
}

export async function deleteSpecialDayDb(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM special_days WHERE id = ${id}`;
}

// Projects
export async function getProjectsDb(): Promise<Project[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
  const rows = await database`SELECT * FROM projects ORDER BY date_created DESC`;
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    dateCreated: row.date_created,
    status: row.status || 'backlog',
    isActive: row.is_active !== false,
    statuses: JSON.parse(row.statuses || '[]'),
    tasks: JSON.parse(row.tasks || '[]'),
  }));
}

export async function saveProjectDb(project: Project): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  const createdAt = project.dateCreated || new Date().toISOString();
  await database`
    INSERT INTO projects (id, name, description, start_date, end_date, date_created, created_at, status, is_active, statuses, tasks)
    VALUES (${project.id}, ${project.name}, ${project.description}, ${project.startDate || null}, ${project.endDate || null}, ${createdAt}, ${createdAt}, ${project.status || 'backlog'}, ${project.isActive !== false}, ${JSON.stringify(project.statuses)}, ${JSON.stringify(project.tasks)})
    ON CONFLICT (id) DO UPDATE SET
      name = ${project.name},
      description = ${project.description},
      start_date = ${project.startDate || null},
      end_date = ${project.endDate || null},
      status = ${project.status || 'backlog'},
      is_active = ${project.isActive !== false},
      statuses = ${JSON.stringify(project.statuses)},
      tasks = ${JSON.stringify(project.tasks)}
  `;
}

export async function deleteProjectDb(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await database`DELETE FROM projects WHERE id = ${id}`;
}