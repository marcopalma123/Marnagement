"use client";

// app/invoice/page.tsx  – live preview + download

import dynamic from "next/dynamic";
import { useState } from "react";
import { defaultInvoiceData, InvoiceData, InvoiceItem } from "@/PdfExport/InvoicePDF";

// PDFViewer must be client-side only (it uses browser canvas)
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false }
);

const InvoicePDF = dynamic(() => import("@/PdfExport/InvoicePDF"), {
  ssr: false,
});

// ─── tiny form helpers ────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <input
        className="border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const [inv, setInv] = useState<InvoiceData>(defaultInvoiceData);

  const set = (key: keyof InvoiceData) => (value: string) =>
    setInv((prev) => ({ ...prev, [key]: value }));

  const setItem =
    (i: number, key: keyof InvoiceItem) => (value: string) => {
      const items = [...inv.items];
      items[i] = {
        ...items[i],
        [key]: key === "description" ? value : Number(value),
      };
      setInv((prev) => ({ ...prev, items }));
    };

  const addItem = () =>
    setInv((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, unitPrice: 0 }],
    }));

  const removeItem = (i: number) =>
    setInv((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== i),
    }));

  const subtotal = inv.items.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );

  const downloadPdf = async () => {
    const res = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inv),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Left panel: form ── */}
      <aside className="w-96 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Invoice Builder</h1>
          <button
            onClick={downloadPdf}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            ↓ Download PDF
          </button>
        </div>

        {/* Invoice meta */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Invoice Details
          </h2>
          <Field label="Date" value={inv.date} onChange={set("date")} />
          <Field
            label="Invoice #"
            value={inv.invoiceNumber}
            onChange={set("invoiceNumber")}
          />
          <Field
            label="Payment Terms"
            value={inv.paymentTerms}
            onChange={set("paymentTerms")}
          />
        </section>

        {/* Seller */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Your Company
          </h2>
          <Field
            label="Company Name"
            value={inv.companyName}
            onChange={set("companyName")}
          />
          <Field
            label="Address Line 1"
            value={inv.addressLine1}
            onChange={set("addressLine1")}
          />
          <Field
            label="Address Line 2"
            value={inv.addressLine2}
            onChange={set("addressLine2")}
          />
          <Field
            label="City / State / Zip"
            value={inv.cityStateZip}
            onChange={set("cityStateZip")}
          />
          <Field
            label="Phone / Email"
            value={inv.phoneEmail}
            onChange={set("phoneEmail")}
          />
        </section>

        {/* Buyer */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Bill To
          </h2>
          <Field
            label="Client Name"
            value={inv.clientName}
            onChange={set("clientName")}
          />
          <Field
            label="Address Line 1"
            value={inv.clientAddressLine1}
            onChange={set("clientAddressLine1")}
          />
          <Field
            label="Address Line 2"
            value={inv.clientAddressLine2}
            onChange={set("clientAddressLine2")}
          />
          <Field
            label="City / State / Zip"
            value={inv.clientCityStateZip}
            onChange={set("clientCityStateZip")}
          />
        </section>

        {/* Line items */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Line Items
          </h2>
          {inv.items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2 relative"
            >
              <button
                onClick={() => removeItem(i)}
                className="absolute top-2 right-2 text-slate-300 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
              <Field
                label="Description"
                value={item.description}
                onChange={setItem(i, "description")}
              />
              <div className="flex gap-2">
                <Field
                  label="Qty"
                  value={String(item.quantity)}
                  onChange={setItem(i, "quantity")}
                />
                <Field
                  label="Unit Price ($)"
                  value={String(item.unitPrice)}
                  onChange={setItem(i, "unitPrice")}
                />
              </div>
              <p className="text-xs text-slate-400 text-right">
                Total: ${(item.quantity * item.unitPrice).toFixed(2)}
              </p>
            </div>
          ))}
          <button
            onClick={addItem}
            className="rounded-lg border-2 border-dashed border-slate-200 py-2 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + Add Item
          </button>
          <p className="text-right text-sm font-semibold text-slate-600">
            Subtotal: ${subtotal.toFixed(2)}
          </p>
        </section>

        {/* Payment / bank */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Send Payment To
          </h2>
          <Field
            label="Name"
            value={inv.bankAccountName}
            onChange={set("bankAccountName")}
          />
          <Field
            label="Bank Name"
            value={inv.bankName}
            onChange={set("bankName")}
          />
          <Field
            label="Account Number"
            value={inv.bankAccountNumber}
            onChange={set("bankAccountNumber")}
          />
          <Field
            label="Other Bank Info"
            value={inv.otherBankInfo}
            onChange={set("otherBankInfo")}
          />
        </section>

        {/* Terms */}
        <section className="flex flex-col gap-3 pb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Terms &amp; Conditions
          </h2>
          <textarea
            className="border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows={3}
            value={inv.termsAndConditions}
            onChange={(e) => set("termsAndConditions")(e.target.value)}
          />
        </section>
      </aside>

      {/* ── Right panel: live PDF preview ── */}
      <main className="flex-1 overflow-hidden">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <InvoicePDF data={inv} />
        </PDFViewer>
      </main>
    </div>
  );
}
