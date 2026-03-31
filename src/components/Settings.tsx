'use client';

import { useState, useEffect } from 'react';
import { Settings, Client } from '@/types';
import { getSettings, saveSettings, getClients, deleteClient, exportAllData, importAllData, generateId, saveClient } from '@/lib/store';
import { Settings as SettingsIcon, Download, Upload, Plus, Trash2, Save } from 'lucide-react';
import { useRef } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client form
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientRate, setClientRate] = useState(0);
  const [clientCurrency, setClientCurrency] = useState('EUR');

  useEffect(() => {
    setSettings(getSettings());
    setClients(getClients());
  }, []);

  const handleSave = () => {
    if (!settings) return;
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marnagement-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (importAllData(text)) {
      setSettings(getSettings());
      setClients(getClients());
      alert('Data imported successfully!');
    } else {
      alert('Failed to import data. Invalid format.');
    }
  };

  const handleAddClient = () => {
    if (!clientName.trim()) return;
    const client: Client = {
      id: generateId(),
      name: clientName,
      email: clientEmail,
      company: clientCompany,
      dailyRate: clientRate,
      currency: clientCurrency,
    };
    saveClient(client);
    setClients(getClients());
    setShowClientForm(false);
    setClientName('');
    setClientEmail('');
    setClientCompany('');
    setClientRate(0);
  };

  const handleDeleteClient = (id: string) => {
    deleteClient(id);
    setClients(getClients());
  };

  if (!settings) return null;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      <p className="text-sm text-gray-400 mt-1">Configure your business details and preferences</p>

      {/* Business Info */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Business Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Business Name</label>
            <input
              value={settings.businessName}
              onChange={(e) => updateSetting('businessName', e.target.value)}
              placeholder="Your business name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              value={settings.businessEmail}
              onChange={(e) => updateSetting('businessEmail', e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Address</label>
            <textarea
              value={settings.businessAddress}
              onChange={(e) => updateSetting('businessAddress', e.target.value)}
              rows={2}
              placeholder="Your business address"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 block mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={settings.openaiApiKey || ''}
              onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
              placeholder="sk-... (for Whisper transcription & AI summaries)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <p className="text-xs text-gray-300 mt-1">
              Free tier available at{' '}
              <a href="https://platform.openai.com/signup" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                platform.openai.com
              </a>
              . Used for audio transcription (Whisper) and meeting summaries.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Financial</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Default Daily Rate</label>
            <input
              type="number"
              value={settings.dailyRate || ''}
              onChange={(e) => updateSetting('dailyRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Default Currency</label>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => updateSetting('defaultCurrency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              {settings.currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={settings.taxRate || ''}
              onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Invoice Deadline (days)</label>
            <input
              type="number"
              value={settings.invoiceDeadlineDays || ''}
              onChange={(e) => updateSetting('invoiceDeadlineDays', parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Currency Rates */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Currency Exchange Rates</h3>
        <div className="space-y-2">
          {settings.currencies.map((c, idx) => (
            <div key={c.code} className="flex items-center gap-3">
              <span className="text-sm font-mono w-12">{c.symbol}</span>
              <span className="text-sm w-12">{c.code}</span>
              <input
                type="number"
                step={0.01}
                value={c.rate}
                onChange={(e) => {
                  const updated = [...settings.currencies];
                  updated[idx] = { ...updated[idx], rate: parseFloat(e.target.value) || 0 };
                  updateSetting('currencies', updated);
                }}
                className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-300 mt-2">Rates are relative to base currency (1 EUR = X)</p>
      </div>

      {/* Clients */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Clients</h3>
          <button
            onClick={() => setShowClientForm(!showClientForm)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Plus size={12} /> Add Client
          </button>
        </div>

        {showClientForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
              <input
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Email (optional)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
              <input
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Company (optional)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={clientRate || ''}
                  onChange={(e) => setClientRate(parseFloat(e.target.value) || 0)}
                  placeholder="Daily rate"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none"
                />
                <select
                  value={clientCurrency}
                  onChange={(e) => setClientCurrency(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  {settings.currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAddClient}
              disabled={!clientName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Save Client
            </button>
          </div>
        )}

        {clients.length > 0 ? (
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.company && `${c.company} · `}
                    {settings.currencies.find((cur) => cur.code === c.currency)?.symbol}{c.dailyRate}/day
                  </p>
                </div>
                <button onClick={() => handleDeleteClient(c.id)} className="p-1 text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300 text-center py-4">No clients yet</p>
        )}
      </div>

      {/* Data Management */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Data Management</h3>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download size={14} /> Export All Data (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <Upload size={14} /> Import Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Save size={14} /> Save Settings
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 animate-fade-in">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
