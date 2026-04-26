'use client';

import { useState, useEffect } from 'react';
import { WorkDay, Invoice, InvoiceItem, Settings, Client } from '@/types';
import {
  getWorkDays, getInvoices, saveInvoice, deleteInvoice,
  getSettings, getClients, generateId, saveClient, deleteClient,
  getWorkDaysRemote, getInvoicesRemote, getSettingsRemote, getClientsRemote,
  getProjectsRemote,
} from '@/lib/store';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, X, Trash2, Download, Receipt, Send, CheckCircle, AlertCircle, FileText, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import { Project } from '@/types';

export default function Invoices() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedClient, setSelectedClient] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRate, setNewClientRate] = useState(0);
  const [newClientCurrency, setNewClientCurrency] = useState('EUR');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [manualConversionRate, setManualConversionRate] = useState('1.0000');
  const [receivedValue, setReceivedValue] = useState<string>('');
  const [taxAuthorityAmount, setTaxAuthorityAmount] = useState<string>('');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    async function loadData() {
      console.log('[Invoices] Loading data...');
      const [wd, inv, s, c, proj] = await Promise.all([
        getWorkDaysRemote(),
        getInvoicesRemote(),
        getSettingsRemote(),
        getClientsRemote(),
        getProjectsRemote()
      ]);
      console.log('[Invoices] Loaded invoices:', inv);
      setWorkDays(wd);
      setInvoices(inv);
      setSettings(s || null);
      setClients(c);
      setProjects(proj);
    }
    loadData();
  }, []);

  const symbol = settings?.currencies?.find((c) => c.code === settings.defaultCurrency)?.symbol || '€';

  const handleCreateInvoice = async () => {
    if (!selectedMonth) return;

    const monthDays = workDays.filter(
      (d) => d.date.startsWith(selectedMonth) && d.isBusinessDay
    );

    if (monthDays.length === 0) return;

    const dailyRate = clients.find((c) => c.id === selectedClient)?.dailyRate || settings?.dailyRate || 0;
    const currency = clients.find((c) => c.id === selectedClient)?.currency || settings?.defaultCurrency || 'EUR';

    const getProjectName = (projectId?: string) => {
      if (!projectId) return '';
      const project = projects.find(p => p.id === projectId);
      return project?.name || '';
    };

    const items: InvoiceItem[] = monthDays.map((day) => ({
      description: getProjectName(day.projectId),
      taskName: '',
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
      invoiceNumber: manualInvoiceNumber || `INV-${format(new Date(), 'yyyy')}-${String(invoices.length + 1).padStart(3, '0')}`,
      clientId: selectedClient,
      month: selectedMonth,
      items,
      subtotal,
      tax,
      total,
      currency,
      conversionRate: parseFloat(manualConversionRate) || 1,
      taxAuthorityAmount: parseFloat(taxAuthorityAmount) || undefined,
      status: 'draft',
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };

    saveInvoice(invoice);
    // Update local state immediately for better UX
    setInvoices((prev) => [invoice, ...prev]);
    setShowCreate(false);
    setManualInvoiceNumber('');
    setManualConversionRate('1.0000');
    setTaxAuthorityAmount('');
  };

  const handleStatusChange = async (id: string, status: Invoice['status']) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const updated = { ...inv, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined };
    saveInvoice(updated);
    setInvoices(await getInvoicesRemote());
  };

  const handleDelete = async (id: string) => {
    deleteInvoice(id);
    setInvoices(await getInvoicesRemote());
  };

  const handleEditInvoice = async () => {
    if (!editingInvoice) return;
    
    const updated: Invoice = {
      ...editingInvoice,
      invoiceNumber: manualInvoiceNumber || editingInvoice.invoiceNumber,
      clientId: selectedClient,
      month: selectedMonth,
      conversionRate: parseFloat(manualConversionRate) || editingInvoice.conversionRate || 1,
      taxAuthorityAmount: parseFloat(taxAuthorityAmount) || undefined,
    };
    
    // Update local state immediately for better UX
    setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    
    saveInvoice(updated);
    await getInvoicesRemote();
    setShowCreate(false);
    setManualInvoiceNumber('');
    setManualConversionRate('1.0000');
    setTaxAuthorityAmount('');
    setEditingInvoice(null);
  };

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setManualInvoiceNumber(inv.invoiceNumber);
    setManualConversionRate(inv.conversionRate?.toString() || '1.0000');
    setTaxAuthorityAmount(inv.taxAuthorityAmount?.toString() || '');
    setSelectedMonth(inv.month);
    setSelectedClient(inv.clientId);
    setShowCreate(true);
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    const client: Client = {
      id: generateId(),
      name: newClientName,
      dailyRate: newClientRate,
      currency: newClientCurrency,
    };
    saveClient(client);
    setClients(await getClientsRemote());
    setShowClientForm(false);
    setNewClientName('');
    setNewClientRate(0);
    setSelectedClient(client.id);
  };

  const handleDeleteClient = async (id: string) => {
    deleteClient(id);
    setClients(await getClientsRemote());
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

  const exportInvoicePdf = async (inv: Invoice) => {
    const client = clients.find((c) => c.id === inv.clientId);
    const cSymbol = settings?.currencies.find((c) => c.code === inv.currency)?.symbol || inv.currency;
    
    const pdfData = {
      companyName: settings?.businessName || 'Your Company',
      addressLine1: settings?.businessAddress || 'Address Line 1',
      addressLine2: '',
      cityStateZip: settings?.businessPostalCode || '',
      phoneEmail: settings?.businessEmail || 'email@example.com',
      date: format(parseISO(inv.createdAt), 'MMMM d, yyyy'),
      invoiceNumber: inv.invoiceNumber,
      clientName: client?.name || 'Client Name',
      clientAddressLine1: client?.address || '',
      clientAddressLine2: '',
      clientCityStateZip: [client?.postalCode, client?.country].filter(Boolean).join(', '),
      items: inv.items.map((item) => ({
        description: `${item.description}${item.notes ? ` (${item.notes})` : ''}`,
        taskName: item.taskName || '',
        quantity: item.days,
        unitPrice: item.rate,
      })),
      paymentTerms: `Net ${settings?.invoiceDeadlineDays || 30}`,
      bankAccountName: '',
      bankName: '',
      bankAccountNumber: '',
      otherBankInfo: '',
      termsAndConditions: 'Payment is due within the specified terms. Thank you for your business.',
      currency: inv.currency,
      postalCode: settings?.businessPostalCode || '',
      country: settings?.businessCountry || '',
      phoneNumber: settings?.businessPhone || '',
      fiscalNumber: settings?.businessFiscalNumber || '',
    };

    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });
      const pdfBlob = await res.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const pdfA = document.createElement('a');
      pdfA.href = pdfUrl;
      pdfA.download = `${inv.invoiceNumber}.pdf`;
      pdfA.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
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
          onClick={() => { setShowCreate(true); setEditingInvoice(null); setManualInvoiceNumber(''); }}
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
            <div>
              <label className="text-xs text-gray-400 block mb-1">Invoice Number (optional)</label>
              <input
                type="text"
                value={manualInvoiceNumber}
                onChange={(e) => setManualInvoiceNumber(e.target.value)}
                placeholder="INV-2026-001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Conversion Rate</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={manualConversionRate}
                onChange={(e) => setManualConversionRate(e.target.value)}
                placeholder="1.0000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Invoice amount sent to Tax Authority (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxAuthorityAmount}
                onChange={(e) => setTaxAuthorityAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
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
            onClick={editingInvoice ? handleEditInvoice : handleCreateInvoice}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            {editingInvoice ? 'Update Invoice' : 'Generate Invoice'}
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
                      {inv.receivedValue !== undefined && inv.receivedValue > 0 && (
                        <p className="text-xs text-emerald-600 font-mono">Received: {cSymbol}{inv.receivedValue.toFixed(2)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{cSymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inv.receivedValue || ''}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              const updated = { ...inv, receivedValue: newValue };
                              if (newValue > 0) {
                                updated.status = 'paid';
                                updated.paidAt = new Date().toISOString();
                              }
                              setInvoices((prev) => prev.map((i) => i.id === inv.id ? updated : i));
                              saveInvoice(updated);
                            }}
                            className="w-20 text-xs border border-gray-200 rounded px-2 py-1 font-mono focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
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
                        <button onClick={() => exportInvoicePdf(inv)} className="p-1 text-gray-400 hover:text-red-600" title="Export as PDF">
                          <FileText size={14} />
                        </button>
                        <button onClick={() => openEditModal(inv)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit Invoice">
                          <Edit2 size={14} />
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
