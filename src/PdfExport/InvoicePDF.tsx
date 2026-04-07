import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
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
  items: InvoiceItem[];

  // Footer
  paymentTerms: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  otherBankInfo: string;
  termsAndConditions: string;
}

// ─── Default data ─────────────────────────────────────────────────────────────

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
  termsAndConditions:
    "Total payment must be completed within 30 days.\nThank you for your business!",
};

// ─── Colours & constants ──────────────────────────────────────────────────────

const BLUE = "#6b85b5";
const BLUE_LIGHT = "#dde4f0";
const TEXT_DARK = "#333333";
const TEXT_MID = "#666666";
const TEXT_LIGHT = "#888888";
const WHITE = "#ffffff";
const BLACK = "#000000";

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: TEXT_DARK,
    paddingHorizontal: 48,
    paddingVertical: 48,
    backgroundColor: WHITE,
  },

  // Header row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  invoiceTitle: {
    fontSize: 36,
    color: BLUE,
    fontFamily: "Helvetica",
    letterSpacing: 1,
  },
  metaBlock: {
    alignItems: "flex-start",
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEXT_DARK,
    width: 70,
  },
  metaValue: {
    fontSize: 9,
    color: BLUE,
  },

  // Address section
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  addressBlock: {
    flex: 1,
  },
  addressBlockBillTo: {
    flex: 1,
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: BLUE,
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 9,
    color: TEXT_MID,
    marginBottom: 2,
  },
  billToLabel: {
    fontSize: 9,
    color: TEXT_MID,
    marginBottom: 3,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRowEven: {
    backgroundColor: BLUE_LIGHT,
  },
  tableRowOdd: {
    backgroundColor: WHITE,
  },

  colDescription: { flex: 3 },
  colQuantity: { flex: 1, textAlign: "center" },
  colUnitPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },

  cellText: {
    fontSize: 9,
    color: TEXT_MID,
  },

  // Footer totals row
  totalsRow: {
    flexDirection: "row",
    marginTop: 2,
    alignItems: "center",
  },
  paymentTermsBlock: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  paymentTermsLabel: {
    fontSize: 9,
    color: TEXT_LIGHT,
    fontFamily: "Helvetica-Bold",
  },
  paymentTermsValue: {
    fontSize: 9,
    color: TEXT_MID,
  },
  totalAmountBlock: {
    flex: 1.5,
    backgroundColor: BLUE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  totalAmountLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
  },
  totalAmountValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: WHITE,
  },

  // Bottom section
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  termsBlock: {
    flex: 1,
    paddingRight: 24,
  },
  termsTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 8,
    color: TEXT_MID,
    lineHeight: 1.5,
  },
  paymentBlock: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  paymentLine: {
    fontSize: 8,
    color: TEXT_MID,
    marginBottom: 2,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data?: Partial<InvoiceData>;
}

export default function InvoicePDF({ data = {} }: Props) {
  const inv: InvoiceData = { ...defaultInvoiceData, ...data };

  const subtotal = inv.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Pad items to at least 7 rows so the table never looks empty
  const MIN_ROWS = 7;
  const paddedItems = [
    ...inv.items,
    ...Array(Math.max(0, MIN_ROWS - inv.items.length)).fill(null),
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <Text style={s.invoiceTitle}>Invoice</Text>
          <View style={s.metaBlock}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date:</Text>
              <Text style={s.metaValue}>{inv.date}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice #:</Text>
              <Text style={s.metaValue}>{inv.invoiceNumber}</Text>
            </View>
          </View>
        </View>

        {/* ── Addresses ── */}
        <View style={s.addressRow}>
          {/* Seller */}
          <View style={s.addressBlock}>
            <Text style={s.companyName}>{inv.companyName}</Text>
            <Text style={s.addressLine}>{inv.addressLine1}</Text>
            <Text style={s.addressLine}>{inv.addressLine2}</Text>
            <Text style={s.addressLine}>{inv.cityStateZip}</Text>
            <Text style={s.addressLine}>{inv.phoneEmail}</Text>
          </View>



          {/* Buyer */}
          <View style={s.addressBlock}>
            <Text style={s.billToLabel}>Bill To:</Text>
            <Text style={s.addressLine}>{inv.clientName}</Text>
            <Text style={s.addressLine}>{inv.clientAddressLine1}</Text>
            <Text style={s.addressLine}>{inv.clientAddressLine2}</Text>
            <Text style={s.addressLine}>{inv.clientCityStateZip}</Text>
          </View>
        </View>

        {/* ── Table header ── */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDescription]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQuantity]}>Quantity</Text>
          <Text style={[s.tableHeaderText, s.colUnitPrice]}>Unit Price</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
        </View>

        {/* ── Table rows ── */}
        {paddedItems.map((item, i) => (
          <View
            key={i}
            style={[
              s.tableRow,
              i % 2 === 0 ? s.tableRowEven : s.tableRowOdd,
            ]}
          >
            <Text style={[s.cellText, s.colDescription]}>
              {item?.description ?? ""}
            </Text>
            <Text style={[s.cellText, s.colQuantity]}>
              {item ? item.quantity : ""}
            </Text>
            <Text style={[s.cellText, s.colUnitPrice]}>
              {item ? fmt(item.unitPrice) : ""}
            </Text>
            <Text style={[s.cellText, s.colTotal]}>
              {item ? fmt(item.quantity * item.unitPrice) : ""}
            </Text>
          </View>
        ))}

        {/* ── Totals row ── */}
        <View style={s.totalsRow}>
          <View style={s.paymentTermsBlock}>
            <Text style={s.paymentTermsLabel}>Payment Terms:</Text>
            <Text style={s.paymentTermsValue}>{inv.paymentTerms}</Text>
          </View>
          <View style={s.totalAmountBlock}>
            <Text style={s.totalAmountLabel}>Total Amount Due:</Text>
            <Text style={s.totalAmountValue}>{fmt(subtotal)}</Text>
          </View>
        </View>

        {/* ── Bottom ── */}
        <View style={s.bottomRow}>
          <View style={s.termsBlock}>
            <Text style={s.termsTitle}>Terms and Conditions</Text>
            <Text style={s.termsText}>{inv.termsAndConditions}</Text>
          </View>
          <View style={s.paymentBlock}>
            <Text style={s.paymentTitle}>Send Payment To:</Text>
            <Text style={s.paymentLine}>{inv.bankAccountName}</Text>
            <Text style={s.paymentLine}>{inv.bankName}</Text>
            <Text style={s.paymentLine}>{inv.bankAccountNumber}</Text>
            <Text style={s.paymentLine}>{inv.otherBankInfo}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
