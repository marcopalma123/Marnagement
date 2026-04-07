// app/api/invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdf, defaultInvoiceData, InvoiceData } from "@/PdfExport/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = generateInvoicePdf(defaultInvoiceData);
  const uint8Array = new Uint8Array(buffer);
  
  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="invoice.pdf"',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const buffer = generateInvoicePdf(body);
  const uint8Array = new Uint8Array(buffer);
  
  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="invoice.pdf"',
    },
  });
}
