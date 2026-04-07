// app/api/invoice/route.ts
// GET  /api/invoice              → PDF with default data
// POST /api/invoice  { ...data } → PDF with custom InvoiceData

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import InvoicePDF, { defaultInvoiceData, InvoiceData } from "@/PdfExport/InvoicePDF";

export const dynamic = "force-dynamic";

async function buildPdf(data: Partial<InvoiceData>): Promise<Blob> {
  const element = React.createElement(InvoicePDF, { data });
  // @ts-expect-error renderToBuffer returns a Buffer in Node.js
  const buffer = await renderToBuffer(element);
  return new Blob([buffer as unknown as BlobPart], { type: "application/pdf" });
}

export async function GET() {
  const blob = await buildPdf(defaultInvoiceData);
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="invoice.pdf"',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const blob = await buildPdf(body);
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="invoice.pdf"',
    },
  });
}
