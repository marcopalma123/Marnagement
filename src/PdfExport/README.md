# Invoice PDF Template — Next.js

A Next.js app that renders an invoice as a live PDF preview and lets you download it.  
Built with [`@react-pdf/renderer`](https://react-pdf.org/).

---

## Project structure

```
├── app/
│   ├── api/
│   │   └── invoice/
│   │       └── route.ts        # GET / POST → returns PDF buffer
│   └── invoice/
│       └── page.tsx            # Live-editor + PDF preview page
├── components/
│   └── InvoicePDF.tsx          # The PDF document component + types
└── package.json
```

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000/invoice** to see the editor and live preview.

---

## Download via API

### GET — default invoice
```
GET /api/invoice
```
Returns a PDF with the default placeholder data (inline, for browser preview).

### POST — custom invoice
```
POST /api/invoice
Content-Type: application/json

{
  "companyName": "Acme Corp",
  "invoiceNumber": "INV-042",
  "date": "April 6, 2026",
  "items": [
    { "description": "Web design", "quantity": 1, "unitPrice": 2500 },
    { "description": "Hosting (annual)", "quantity": 1, "unitPrice": 120 }
  ],
  ...
}
```
Returns the PDF as an attachment download.

---

## InvoiceData shape

```ts
interface InvoiceData {
  // Seller
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  phoneEmail: string;

  // Meta
  date: string;
  invoiceNumber: string;

  // Buyer
  clientName: string;
  clientAddressLine1: string;
  clientAddressLine2: string;
  clientCityStateZip: string;

  // Line items
  items: { description: string; quantity: number; unitPrice: number }[];

  // Footer
  paymentTerms: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  otherBankInfo: string;
  termsAndConditions: string;
}
```

All fields are optional when calling the API — missing fields fall back to defaults.

---

## Customising the design

Open `components/InvoicePDF.tsx` and edit the `BLUE`, `BLUE_LIGHT` colour constants at the top, or tweak the `StyleSheet.create({})` block below them. All layout is done with react-pdf's Flexbox-based system.
