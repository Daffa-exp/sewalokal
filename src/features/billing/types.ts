export type InvoiceStatusType = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type PaymentMethodType = "BANK_TRANSFER" | "CASH" | "QRIS";

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  occupancyId: string;
  tenantName: string;
  roomNumber: string;
  amount: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string;
  periodMonth: number;
  periodYear: number;
  status: InvoiceStatusType;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  paymentMethod: PaymentMethodType;
  notes?: string | null;
  proofUrl?: string | null;
  recordedById: string;
  isCancelled: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

export interface FinancialSummary {
  totalBilled: number;
  totalPaid: number;
  remainingReceivable: number;
  overdueAmount: number;
  overdueCount: number;
  unpaidCount: number;
  paidCount: number;
  collectionRate?: number;
}

export interface MonthlyReportItem {
  id: string;
  invoiceNumber: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone: string | null;
  periodMonth: number;
  periodYear: number;
  dueDate: string;
  amount: number;
  totalPaid: number;
  remainingBalance: number;
  status: InvoiceStatusType;
  reminderSentAt?: string | null;
}


