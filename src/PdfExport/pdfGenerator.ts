import jsPDF from 'jspdf';

export interface InvoiceItem {
  description: string;
  taskName?: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  phoneEmail: string;
  date: string;
  invoiceNumber: string;
  clientName: string;
  clientAddressLine1: string;
  clientAddressLine2: string;
  clientCityStateZip: string;
  items: InvoiceItem[];
  paymentTerms: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  otherBankInfo: string;
  termsAndConditions: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  fiscalNumber?: string;
  currency?: string;
}

export const defaultInvoiceData: InvoiceData = {
  companyName: "Your Company Name",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  cityStateZip: "City, State, Zip Code",
  phoneEmail: "Phone / Email",
  date: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  invoiceNumber: "INV-001",
  clientName: "Client's Name or Company Name",
  clientAddressLine1: "Address Line 1",
  clientAddressLine2: "Address Line 2",
  clientCityStateZip: "City, State, Zip Code",
  items: [
    { description: "Service or Product", quantity: 1, unitPrice: 100 },
    { description: "Service or Product", quantity: 2, unitPrice: 50 },
    { description: "Service or Product", quantity: 3, unitPrice: 75 },
  ],
  paymentTerms: "Net 30",
  bankAccountName: "Name",
  bankName: "Bank Name",
  bankAccountNumber: "Bank Account Number",
  otherBankInfo: "Other Bank Info",
  termsAndConditions: "Total payment must be completed within 30 days.\nThank you for your business!",
};

const BLUE = "#6b85b5";
const BLUE_LIGHT = "#dde4f0";
const TEXT_DARK = "#333333";
const TEXT_MID = "#666666";

function fmt(n: number, currency: string = "GBP") {
  return n.toLocaleString("en-US", { style: "currency", currency });
}

export function generateInvoicePdf(data: Partial<InvoiceData>): Buffer {
  const inv = { ...defaultInvoiceData, ...data };
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  doc.setFontSize(28);
  doc.setTextColor(BLUE);
  doc.text("Invoice", margin, y);

  doc.setFontSize(10);
  doc.setTextColor(TEXT_MID);
  doc.text(`Date: ${inv.date}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.text(`Invoice #: ${inv.invoiceNumber}`, pageWidth - margin, y, { align: "right" });

  y += 15;

  doc.setFontSize(10);
  doc.setTextColor(BLUE);
  doc.text(inv.companyName, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MID);
  doc.text(inv.addressLine1, margin, y);
  y += 4;
  if (inv.addressLine2) {
    doc.text(inv.addressLine2, margin, y);
    y += 4;
  }
  if (inv.postalCode || inv.country) {
    doc.text([inv.postalCode, inv.country].filter(Boolean).join(", "), margin, y);
    y += 4;
  } else {
    doc.text(inv.cityStateZip, margin, y);
    y += 4;
  }
  if (inv.phoneNumber) {
    doc.text(inv.phoneNumber, margin, y);
    y += 4;
  }
  if (inv.fiscalNumber) {
    doc.text(`Fiscal ID: ${inv.fiscalNumber}`, margin, y);
    y += 4;
  }
  doc.text(inv.phoneEmail, margin, y);

  const billToY = 25;
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MID);
  doc.text("Bill To:", pageWidth / 2, billToY);
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK);
  doc.text(inv.clientName, pageWidth / 2, billToY + 6);
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MID);
  let clientY = billToY + 12;
  doc.text(inv.clientAddressLine1, pageWidth / 2, clientY);
  clientY += 4;
  if (inv.clientAddressLine2) {
    doc.text(inv.clientAddressLine2, pageWidth / 2, clientY);
    clientY += 4;
  }
  doc.text(inv.clientCityStateZip, pageWidth / 2, clientY);

  y = Math.max(y + 20, clientY + 15);

  doc.setFillColor(BLUE);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(255);
  const colWidths = {
    description: contentWidth * 0.45,
    quantity: contentWidth * 0.15,
    unitPrice: contentWidth * 0.2,
    total: contentWidth * 0.2,
  };
  let x = margin + 3;
  doc.text("Description", x, y + 5);
  x += colWidths.description;
  doc.text("Qty", x + colWidths.quantity / 2, y + 5, { align: "center" });
  x += colWidths.quantity;
  doc.text("Unit Price", x + colWidths.unitPrice / 2, y + 5, { align: "center" });
  x += colWidths.unitPrice;
  doc.text("Total", x + colWidths.total / 2, y + 5, { align: "center" });

  y += 12;

  const groupedItems = inv.items.reduce((acc, item) => {
    const key = item.taskName || item.description;
    if (!acc[key]) {
      acc[key] = { ...item, quantity: 0, totalAmount: 0 };
    }
    acc[key].quantity += item.quantity;
    acc[key].totalAmount += item.quantity * item.unitPrice;
    return acc;
  }, {} as Record<string, { description: string; taskName?: string; quantity: number; unitPrice: number; totalAmount: number }>);

  const groupedList = Object.values(groupedItems);
  const subtotal = groupedList.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalDays = groupedList.reduce((sum, item) => sum + item.quantity, 0);

  groupedList.forEach((item, i) => {
    const rowHeight = 8;
    if (i % 2 === 0) {
      doc.setFillColor(BLUE_LIGHT);
      doc.rect(margin, y - 3, contentWidth, rowHeight, "F");
    }

    doc.setFontSize(9);
    doc.setTextColor(TEXT_MID);
    x = margin + 3;
    const projectHeader = item.taskName ? `${item.taskName} ` : '';
    const displayText = projectHeader + item.description;
    const descText = doc.splitTextToSize(displayText, colWidths.description - 5);
    doc.text(descText[0], x, y + 3);
    x += colWidths.description;
    doc.text(String(item.quantity), x + colWidths.quantity / 2, y + 3, { align: "center" });
    x += colWidths.quantity;
    doc.text(fmt(item.unitPrice, inv.currency), x + colWidths.unitPrice / 2, y + 3, { align: "center" });
    x += colWidths.unitPrice;
    doc.text(fmt(item.totalAmount, inv.currency), x + colWidths.total / 2, y + 3, { align: "center" });

    y += rowHeight;
  });

  y += 5;

  doc.setFillColor(BLUE);
  doc.rect(pageWidth - margin - 60, y, 60, 18, "F");
  doc.setFontSize(9);
  doc.setTextColor(255);
  doc.text(`Total days: ${totalDays}`, pageWidth - margin - 3, y + 7, { align: "right" });
  doc.setFontSize(10);
  doc.text(`Total: ${fmt(subtotal, inv.currency)}`, pageWidth - margin - 3, y + 15, { align: "right" });

  y += 20;



  y += 15;

  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK);
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MID);
  let paymentY = y;
  if (inv.bankAccountName) {
    doc.text(inv.bankAccountName, pageWidth / 2 + 10, paymentY);
    paymentY += 4;
  }
  if (inv.bankName) {
    doc.text(inv.bankName, pageWidth / 2 + 10, paymentY);
    paymentY += 4;
  }
  if (inv.bankAccountNumber) {
    doc.text(inv.bankAccountNumber, pageWidth / 2 + 10, paymentY);
    paymentY += 4;
  }
  if (inv.otherBankInfo) {
    doc.text(inv.otherBankInfo, pageWidth / 2 + 10, paymentY);
  }

  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
