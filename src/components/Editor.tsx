'use client';

import { useState, useEffect } from 'react';
import { Template, TemplateField, Settings } from '@/types';
import { getTemplates, saveTemplate, deleteTemplate, getSettings, generateId, getTemplatesRemote, getSettingsRemote } from '@/lib/store';
import { PenTool, Plus, X, Trash2, Download } from 'lucide-react';

export default function Editor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newFields, setNewFields] = useState<TemplateField[]>([
    { key: 'title', label: 'Document Title', type: 'text', defaultValue: '' },
  ]);

  useEffect(() => {
    async function loadData() {
      const [t, s] = await Promise.all([
        getTemplatesRemote(),
        getSettingsRemote()
      ]);
      setTemplates(t);
      setSettings(s || getSettings());
    }
    loadData();
  }, []);

  const openTemplate = (t: Template) => {
    setActiveTemplate(t);
    const defaults: Record<string, string> = {};
    t.fields.forEach((f) => {
      defaults[f.key] = f.defaultValue || '';
    });
    setFieldValues(defaults);
  };

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const convertCurrency = (value: string, fromCurrency: string, toCurrency: string): string => {
    if (!settings) return value;
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const fromRate = settings.currencies.find((c) => c.code === fromCurrency)?.rate || 1;
    const toRate = settings.currencies.find((c) => c.code === toCurrency)?.rate || 1;
    const converted = (num / fromRate) * toRate;
    return converted.toFixed(2);
  };

  const handleAddField = () => {
    setNewFields((prev) => [
      ...prev,
      { key: `field_${prev.length}`, label: '', type: 'text', defaultValue: '' },
    ]);
  };

  const handleRemoveField = (idx: number) => {
    setNewFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const template: Template = {
      id: generateId(),
      name: newTemplateName,
      content: '',
      fields: newFields.filter((f) => f.label.trim()),
      createdAt: new Date().toISOString(),
    };
    saveTemplate(template);
    setTemplates(getTemplates());
    setShowNewTemplate(false);
    setNewTemplateName('');
    setNewFields([{ key: 'title', label: 'Document Title', type: 'text', defaultValue: '' }]);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setTemplates(getTemplates());
    if (activeTemplate?.id === id) setActiveTemplate(null);
  };

  const exportDocument = () => {
    if (!activeTemplate) return;
    const lines = [`# ${activeTemplate.name}`, ''];
    activeTemplate.fields.forEach((f) => {
      const val = fieldValues[f.key] || '';
      lines.push(`**${f.label}:** ${val}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTemplate.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allCurrencies = settings?.currencies || [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editor</h2>
          <p className="text-sm text-gray-400 mt-1">Template-based documents with currency conversion</p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* New template form */}
      {showNewTemplate && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Create Template</h3>
            <button onClick={() => setShowNewTemplate(false)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Template Name</label>
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Invoice, Contract, Report"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">Fields</label>
              <div className="space-y-2">
                {newFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={field.label}
                      onChange={(e) => {
                        const updated = [...newFields];
                        updated[idx] = { ...updated[idx], label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                        setNewFields(updated);
                      }}
                      placeholder="Field label"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const updated = [...newFields];
                        updated[idx] = { ...updated[idx], type: e.target.value as TemplateField['type'] };
                        setNewFields(updated);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="date">Date</option>
                    </select>
                    {newFields.length > 1 && (
                      <button onClick={() => handleRemoveField(idx)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleAddField} className="text-xs text-blue-600 mt-2 hover:underline">
                + Add field
              </button>
            </div>

            <button
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Save Template
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Templates list */}
        <div className="space-y-2">
          {templates.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <PenTool size={24} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No templates</p>
              <p className="text-xs text-gray-300 mt-1">Create one to get started</p>
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className={`bg-white border rounded-xl p-4 cursor-pointer card-hover ${
                  activeTemplate?.id === t.id ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-gray-200'
                }`}
                onClick={() => openTemplate(t)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                    className="p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.fields.length} field{t.fields.length !== 1 ? 's' : ''}</p>
              </div>
            ))
          )}
        </div>

        {/* Editor area */}
        <div className="col-span-2">
          {activeTemplate ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium">{activeTemplate.name}</h3>
                <button
                  onClick={exportDocument}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Download size={12} /> Export .md
                </button>
              </div>

              <div className="space-y-4">
                {activeTemplate.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-400 block mb-1">{field.label}</label>
                    {field.type === 'currency' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={fieldValues[`${field.key}_currency`] || settings?.defaultCurrency || 'EUR'}
                          onChange={(e) => updateField(`${field.key}_currency`, e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        >
                          {allCurrencies.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={fieldValues[field.key] || ''}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        {/* Show converted values */}
                        {fieldValues[field.key] && allCurrencies.length > 1 && (
                          <div className="text-xs text-gray-400 space-x-2">
                            {allCurrencies
                              .filter((c) => c.code !== (fieldValues[`${field.key}_currency`] || settings?.defaultCurrency))
                              .map((c) => (
                                <span key={c.code} className="font-mono">
                                  {c.symbol}{convertCurrency(
                                    fieldValues[field.key],
                                    fieldValues[`${field.key}_currency`] || settings?.defaultCurrency || 'EUR',
                                    c.code
                                  )}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={fieldValues[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={fieldValues[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    ) : (
                      <input
                        value={fieldValues[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <PenTool size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Select a template to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
