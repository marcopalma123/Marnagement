'use client';

import { useState, useEffect } from 'react';
import { WorkDay, Invoice, InvoiceItem, Settings, Client } from '@/types';
import {
  getWorkDays, getInvoices, saveInvoice, deleteInvoice,
  getSettings, getClients, generateId, saveClient, deleteClient,
} from '@/lib/store';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, X, Trash2, Download, Receipt, Send, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Invoices() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedClient, setSelectedClient] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState(0);
  const [newClientCurrency, setNewClientCurrency] = useState('EUR');

  useEffect(() => {
    setWorkDays(getWorkDays());
    setInvoices(getInvoices());
    setSettings(getSettings());
    setClients(getClients());
  }, []);

  const symbol = settings?.currencies?.find((c) => c.code === settings.defaultCurrency)?.symbol || '€';

  const handleCreateInvoice = () => {
    if (!selectedMonth) return;

    const monthDays = workDays.filter(
      (d) => d.date.startsWith(selectedMonth) && d.isBusinessDay
    );

    if (monthDays.length === 0) return;

    const dailyRate = clients.find((c) => c.id === selectedClient)?.dailyRate || settings?.dailyRate || 0;
    const currency = clients.find((c) => c.id === selectedClient)?.currency || settings?.defaultCurrency || 'EUR';

    const items: InvoiceItem[] = monthDays.map((day) => ({
      description: `${format(parseISO(day.date), 'EEE, MMM d')} — ${day.notes || 'Work'}`,
      days: 1,
      rate: dailyRate,
      amount: dailyRate * (day.hoursWorked / 8),
      notes: day.notes,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const tax = subtotal * ((settings?.taxRate || 0) / 100);
    const total = subtotal + tax;

    const deadlineDays = settings?.invoiceDeadlineDays || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + deadlineDays);

    const invoice: Invoice = {
      id: generateId(),
      invoiceNumber: `INV-${format(new Date(), 'yyyy')}-${String(invoices.length + 1).padStart(3, '0')}`,
      clientId: selectedClient,
      month: selectedMonth,
      items,
      subtotal,
      tax,
      total,
      currency,
      status: 'draft',
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };

    saveInvoice(invoice);
    setInvoices(getInvoices());
    setShowCreate(false);
  };

  const handleStatusChange = (id: string, status: Invoice['status']) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const updated = { ...inv, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined };
    saveInvoice(updated);
    setInvoices(getInvoices());
  };

  const handleDelete = (id: string) => {
    deleteInvoice(id);
    setInvoices(getInvoices());
  };

  const handleAddClient = () => {
    if (!newClientName.trim()) return;
    const client: Client = {
      id: generateId(),
      name: newClientName,
      dailyRate: newClientRate,
      currency: newClientCurrency,
    };
    saveClient(client);
    setClients(getClients());
    setShowClientForm(false);
    setNewClientName('');
    setNewClientRate(0);
    setSelectedClient(client.id);
  };

  const handleDeleteClient = (id: string) => {
    deleteClient(id);
    setClients(getClients());
    if (selectedClient === id) setSelectedClient('');
  };

  const exportInvoice = (inv: Invoice) => {
    const client = clients.find((c) => c.id === inv.clientId);
    const lines = [
      `# ${inv.invoiceNumber}`,
      '',
      `**Client:** ${client?.name || 'N/A'}`,
      `**Date:** ${format(parseISO(inv.createdAt), 'MMMM d, yyyy')}`,
      `**Due:** ${format(parseISO(inv.dueDate), 'MMMM d, yyyy')}`,
      `**Status:** ${inv.status.toUpperCase()}`,
      '',
      '---',
      '',
      '| Date | Description | Rate | Amount |',
      '|------|-------------|------|--------|',
    ];

    inv.items.forEach((item) => {
      const cSymbol = settings?.currencies.find((c) => c.code === inv.currency)?.symbol || inv.currency;
      lines.push(`| ${item.description} | ${item.notes || '-'} | ${cSymbol}${item.rate.toFixed(2)} | ${cSymbol}${item.amount.toFixed(2)} |`);
    });

    const cSymbol = settings?.currencies.find((c) => c.code === inv.currency)?.symbol || inv.currency;
    lines.push('', `**Subtotal:** ${cSymbol}${inv.subtotal.toFixed(2)}`);
    if (inv.tax > 0) lines.push(`**Tax:** ${cSymbol}${inv.tax.toFixed(2)}`);
    lines.push(`**Total:** ${cSymbol}${inv.total.toFixed(2)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoiceNumber}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    draft: { icon: <Receipt size={14} />, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Draft' },
    sent: { icon: <Send size={14} />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Sent' },
    paid: { icon: <CheckCircle size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Paid' },
    overdue: { icon: <AlertCircle size={14} />, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Invoices</h2>
          <p className="text-sm text-gray-400 mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · {symbol}{invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0).toLocaleString()} collected
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* Create invoice modal */}
      {showCreate && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Generate Monthly Invoice</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Client</label>
              <div className="flex gap-2">
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">No client (use default rate)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowClientForm(!showClientForm)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* New client mini-form */}
          {showClientForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newClientRate || ''}
                  onChange={(e) => setNewClientRate(parseFloat(e.target.value) || 0)}
                  placeholder="Daily rate"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none"
                />
                <select
                  value={newClientCurrency}
                  onChange={(e) => setNewClientCurrency(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  {settings?.currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddClient}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedMonth && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">
                {workDays.filter((d) => d.date.startsWith(selectedMonth) && d.isBusinessDay).length} business days in {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </p>
              {workDays
                .filter((d) => d.date.startsWith(selectedMonth) && d.isBusinessDay)
                .map((d) => (
                  <div key={d.id} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                    <span>{format(parseISO(d.date), 'EEE, MMM d')}</span>
                    <span className="font-mono text-gray-400">{d.hoursWorked}h</span>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={handleCreateInvoice}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Generate Invoice
          </button>
        </div>
      )}

      {/* Invoices list */}
      <div className="mt-6 space-y-2">
        {invoices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Receipt size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No invoices yet</p>
            <p className="text-xs text-gray-300 mt-1">Generate one from your calendar work days</p>
          </div>
        ) : (
          invoices
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((inv) => {
              const st = statusConfig[inv.status];
              const cSymbol = settings?.currencies.find((c) => c.code === inv.currency)?.symbol || inv.currency;
              const client = clients.find((c) => c.id === inv.clientId);

              return (
                <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full flex items-center gap-1', st.bg, st.color)}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {client?.name || 'No client'} · {format(parseISO(`${inv.month}-01`), 'MMM yyyy')} · Due {format(parseISO(inv.dueDate), 'MMM d')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold font-mono tabular-nums">{cSymbol}{inv.total.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as Invoice['status'])}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                        <button onClick={() => exportInvoice(inv)} className="p-1 text-gray-400 hover:text-blue-600">
                          <Download size={14} />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
