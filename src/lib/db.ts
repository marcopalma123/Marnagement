import { WorkDay, Client, Meeting, Invoice, Settings, Template, SpecialDay, Project } from '@/types';

let db: any = null;
let dbChecked = false;
let tablesInitialized = false;

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

function getDb() {
  if (db) return db;
  if (dbChecked) return null;
  
  const databaseUrl = process.env.DATABASE_URL;
  
  console.log('[DB] DATABASE_URL exists:', !!databaseUrl, 'length:', databaseUrl?.length);
  
  if (!databaseUrl) {
    dbChecked = true;
    return null;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require('@neondatabase/serverless');
    console.log('[DB] Neon initialized');
    db = neon(databaseUrl);
    dbChecked = true;
    return db;
  } catch (err) {
    console.error('[DB] Neon init error:', err);
    dbChecked = true;
    return null;
  }
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
        project_id TEXT,
        hours_worked REAL NOT NULL,
        notes TEXT,
        is_business_day BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    try {
      await database`ALTER TABLE work_days ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`;
    } catch {}
    try {
      await database`ALTER TABLE work_days ADD COLUMN is_business_day BOOLEAN DEFAULT true`;
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

    await database`
      CREATE TABLE IF NOT EXISTS timer_state (
        id TEXT PRIMARY KEY,
        running BOOLEAN NOT NULL DEFAULT false,
        started_at TEXT,
        name TEXT
      )
    `;

    await database`
      CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await database`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    try {
      await database`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`;
    } catch {}
    try {
      await database`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)`;
    } catch {}

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
  const rows = await database`SELECT * FROM work_days ORDER BY date DESC, created_at ASC`;
  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    projectId: row.project_id || '',
    hoursWorked: row.hours_worked || 0,
    notes: row.notes || '',
    isBusinessDay: row.is_business_day ?? true,
  }));
}

export async function saveWorkDayDb(day: WorkDay): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  await database`
    INSERT INTO work_days (id, date, project_id, hours_worked, notes, is_business_day)
    VALUES (${day.id}, ${day.date}, ${day.projectId}, ${day.hoursWorked}, ${day.notes || ''}, true)
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

// Timer State
export interface TimerState {
  id: string;
  running: boolean;
  startedAt: string | null;
  name: string;
}

export async function getTimerStatesDb(): Promise<TimerState[]> {
  const database = getDb();
  if (!database) return [];
  
  await initializeTables();
  
  try {
    await database`DELETE FROM timer_state WHERE id = 'default'`;
  } catch {}
  
  try {
    const rows = await database`SELECT * FROM timer_state ORDER BY started_at DESC`;
    return rows.map((row: any) => ({
      id: row.id,
      running: row.running || false,
      startedAt: row.started_at || null,
      name: row.name || '',
    }));
  } catch (err) {
    console.error('[DB] Failed to get timer states:', err);
    return [];
  }
}

export async function getTimerStateDb(id: string): Promise<TimerState | null> {
  const database = getDb();
  if (!database) return null;
  
  await initializeTables();
  const rows = await database`SELECT * FROM timer_state WHERE id = ${id}`;
  if (rows.length === 0) return null;
  
  return {
    id: rows[0].id,
    running: rows[0].running || false,
    startedAt: rows[0].started_at || null,
    name: rows[0].name || '',
  };
}

export async function setTimerStateDb(id: string, running: boolean, startedAt: string | null, name: string = ''): Promise<void> {
  const database = getDb();
  if (!database) return;
  
  await initializeTables();
  
  try {
    if (!running && startedAt === null) {
      await database`DELETE FROM timer_state WHERE id = ${id}`;
    } else {
      await database`DELETE FROM timer_state WHERE id = ${id}`;
      await database`
        INSERT INTO timer_state (id, running, started_at, name)
        VALUES (${id}, ${running}, ${startedAt}, ${name})
      `;
    }
  } catch (err) {
    console.error('[DB] Timer state error:', err);
  }
}

// Auth
export async function hasAuthUsersDb(): Promise<boolean> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  const rows = await database`SELECT COUNT(*)::int AS count FROM auth_users`;
  return (rows[0]?.count || 0) > 0;
}

export async function getAuthUserByEmailDb(email: string): Promise<AuthUserRecord | null> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  const rows = await database`SELECT * FROM auth_users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name || '',
    role: row.role || 'user',
    createdAt: row.created_at,
  };
}

export async function getAuthUserByIdDb(id: string): Promise<AuthUserRecord | null> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  const rows = await database`SELECT * FROM auth_users WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name || '',
    role: row.role || 'user',
    createdAt: row.created_at,
  };
}

export async function createAuthUserDb(user: {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  role?: string;
}): Promise<void> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  await database`
    INSERT INTO auth_users (id, email, password_hash, name, role)
    VALUES (${user.id}, ${user.email.toLowerCase()}, ${user.passwordHash}, ${user.name || ''}, ${user.role || 'user'})
  `;
}

export async function createAuthSessionDb(session: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<void> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  await database`
    INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
    VALUES (${session.id}, ${session.userId}, ${session.tokenHash}, ${session.expiresAt})
  `;
}

export async function getAuthSessionWithUserByTokenHashDb(tokenHash: string): Promise<{
  session: AuthSessionRecord;
  user: AuthUserRecord;
} | null> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  const rows = await database`
    SELECT
      s.id AS session_id,
      s.user_id AS session_user_id,
      s.token_hash AS session_token_hash,
      s.expires_at AS session_expires_at,
      s.created_at AS session_created_at,
      u.id AS user_id,
      u.email AS user_email,
      u.password_hash AS user_password_hash,
      u.name AS user_name,
      u.role AS user_role,
      u.created_at AS user_created_at
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    session: {
      id: row.session_id,
      userId: row.session_user_id,
      tokenHash: row.session_token_hash,
      expiresAt: row.session_expires_at,
      createdAt: row.session_created_at,
    },
    user: {
      id: row.user_id,
      email: row.user_email,
      passwordHash: row.user_password_hash,
      name: row.user_name || '',
      role: row.user_role || 'user',
      createdAt: row.user_created_at,
    },
  };
}

export async function deleteAuthSessionByTokenHashDb(tokenHash: string): Promise<void> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  await database`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`;
}

export async function deleteExpiredAuthSessionsDb(): Promise<void> {
  const database = getDb();
  if (!database) throw new Error('Database connection unavailable');

  await initializeTables();
  await database`DELETE FROM auth_sessions WHERE expires_at <= NOW()`;
}
