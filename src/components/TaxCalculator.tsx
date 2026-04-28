'use client';

import { useEffect, useMemo, useState } from 'react';
import { Invoice, Settings } from '@/types';
import { getInvoicesRemote, getSettings, getSettingsRemote } from '@/lib/store';
import { calculateTotalObligations } from '@/lib/tax-calculator';

export default function TaxCalculator() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    async function loadData() {
      const [invoiceList, loadedSettings] = await Promise.all([
        getInvoicesRemote(),
        getSettingsRemote(),
      ]);

      setInvoices(invoiceList);
      setSettings(loadedSettings || getSettings());
    }

    loadData();
  }, []);

  const includedInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.excludeFromTaxCalculation !== true),
    [invoices]
  );

  const totalInvoiceListValue = useMemo(
    () => includedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    [includedInvoices]
  );

  const invoicesWithPreview = useMemo(
    () =>
      includedInvoices
        .map((invoice) => {
          const calculationValue = invoice.taxAuthorityAmount || 0;
          const obligations = calculateTotalObligations(
            calculationValue,
            settings?.anualEstimate || 0,
            settings?.yearOfActivity || 1
          );
          return {
            ...invoice,
            calculationValue,
            taxPreviewValue: obligations.totalObligations,
            obligations,
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [includedInvoices, settings?.anualEstimate, settings?.yearOfActivity]
  );

  const totalTaxPreview = useMemo(
    () => invoicesWithPreview.reduce((sum, invoice) => sum + invoice.taxPreviewValue, 0),
    [invoicesWithPreview]
  );

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold tracking-tight">Tax Calculator</h2>
      <p className="mt-1 text-sm text-gray-400">
        Preview tax per invoice using Tax Authority amount (only invoices not excluded).
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-medium text-gray-500">Tax Settings Snapshot</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p className="text-gray-600">
            AnualEstimate:{' '}
            <span className="font-mono text-gray-900">{(settings?.anualEstimate || 0).toFixed(2)} EUR</span>
          </p>
          <p className="text-gray-600">
            Year of activity:{' '}
            <span className="font-mono text-gray-900">{settings?.yearOfActivity || 1}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Invoice Tax Preview</h3>
          <p className="text-xs text-gray-400">
            {includedInvoices.length} invoice{includedInvoices.length === 1 ? '' : 's'} included
          </p>
        </div>

        {invoicesWithPreview.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-300">No invoices included in tax calculation.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {invoicesWithPreview.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-1 gap-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm sm:grid-cols-4"
                >
                  <p className="font-mono text-gray-700">{invoice.invoiceNumber}</p>
                  <p className="text-gray-600">
                    Invoice total (list):{' '}
                    <span className="font-mono text-gray-900">{invoice.total.toFixed(2)} {invoice.currency}</span>
                  </p>
                  <p className="text-gray-600">
                    Tax Authority Amount:{' '}
                    <span className="font-mono text-gray-900">{invoice.calculationValue.toFixed(2)} EUR</span>
                  </p>
                  <p className="text-gray-600 sm:text-right">
                    Tax preview (via function):{' '}
                    <span className="font-mono text-gray-900">{invoice.taxPreviewValue.toFixed(2)} EUR</span>
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className="mt-4 border-t border-gray-200 pt-3">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p className="text-gray-600">
              Total invoice list value:{' '}
              <span className="font-mono text-gray-900">{totalInvoiceListValue.toFixed(2)}</span>
            </p>
            <p className="text-gray-600 sm:text-right">
              Total tax preview (via function):{' '}
              <span className="font-mono text-base font-semibold text-gray-900">{totalTaxPreview.toFixed(2)} EUR</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
