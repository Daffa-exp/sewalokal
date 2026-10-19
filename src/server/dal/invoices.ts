import { db } from "@/server/db";
import {
  InvoiceInput,
  BulkInvoiceInput,
  RecordPaymentInput,
} from "@/lib/validations/invoice";
import { getOccupancyById } from "./occupancies";
import { AuthorizationError, NotFoundError } from "./properties";
import {
  InvoiceStatusType,
  FinancialSummary,
  MonthlyReportItem,
} from "@/features/billing/types";
import { InvoiceStatus } from "@prisma/client";

export class DuplicateInvoiceError extends Error {
  constructor(message = "Tagihan untuk periode bulan dan tahun ini sudah diterbitkan") {
    super(message);
    this.name = "DuplicateInvoiceError";
  }
}

export class PaymentExceedsBalanceError extends Error {
  constructor(message = "Nominal pembayaran melebihi sisa tagihan") {
    super(message);
    this.name = "PaymentExceedsBalanceError";
  }
}

export interface GetInvoicesOptions {
  propertyId?: string;
  status?: InvoiceStatus;
  periodMonth?: number;
  periodYear?: number;
  search?: string;
}

/**
 * Deterministically calculates total paid, remaining balance, and status.
 * Strictly ignores cancelled payments to ensure accounting integrity.
 */
export function calculateInvoiceFinancials(
  invoiceAmount: number,
  payments: { amount: number; isCancelled?: boolean }[],
  dueDate: Date | string
): {
  totalPaid: number;
  remainingBalance: number;
  status: InvoiceStatusType;
} {
  const validPayments = payments.filter((p) => !p.isCancelled);
  const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, invoiceAmount - totalPaid);

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let status: InvoiceStatusType;
  if (totalPaid >= invoiceAmount) {
    status = "PAID";
  } else if (totalPaid > 0) {
    status = "PARTIAL";
  } else if (due < today) {
    status = "OVERDUE";
  } else {
    status = "UNPAID";
  }

  return { totalPaid, remainingBalance, status };
}

/**
 * Helper to clamp day of month to avoid invalid dates (e.g. Feb 31 -> Feb 28/29).
 */
export function createSafeDueDate(year: number, month: number, dueDay: number): Date {
  // month is 1-indexed (1 = Jan, 12 = Dec)
  // Date(year, month, 0).getDate() gives the last day of the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDay), daysInMonth);
  return new Date(Date.UTC(year, month - 1, safeDay, 0, 0, 0));
}

/**
 * Retrieves invoices for an owner with extensive filtering and IDOR protection.
 */
export async function getInvoicesByOwner(ownerId: string, options: GetInvoicesOptions = {}) {
  const { propertyId, status, periodMonth, periodYear, search } = options;

  const invoices = await db.invoice.findMany({
    where: {
      occupancy: {
        room: {
          property: {
            ownerId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      ...(status ? { status } : {}),
      ...(periodMonth ? { periodMonth } : {}),
      ...(periodYear ? { periodYear } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" } },
              {
                occupancy: {
                  tenant: { name: { contains: search, mode: "insensitive" } },
                },
              },
              {
                occupancy: {
                  room: { roomNumber: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      occupancy: {
        include: {
          tenant: true,
          room: {
            include: { property: true },
          },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
  });

  return invoices.map((inv) => {
    const financials = calculateInvoiceFinancials(inv.amount, inv.payments, inv.dueDate);
    return {
      ...inv,
      ...financials,
    };
  });
}

/**
 * Retrieves a single invoice by ID, verifying property ownership.
 */
export async function getInvoiceById(invoiceId: string, ownerId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      occupancy: {
        include: {
          tenant: true,
          room: {
            include: { property: true },
          },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError("Tagihan tidak ditemukan");
  }

  if (invoice.occupancy.room.property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  const financials = calculateInvoiceFinancials(
    invoice.amount,
    invoice.payments,
    invoice.dueDate
  );

  return {
    ...invoice,
    ...financials,
  };
}

/**
 * Creates an individual invoice for an occupancy with snapshot pricing.
 * Prevents duplicate billing for the same period.
 */
export async function createInvoice(data: InvoiceInput, ownerId: string) {
  const occupancyId = data.occupancyId || data.leaseId;
  if (!occupancyId) {
    throw new Error("Masa sewa (occupancy) wajib dipilih");
  }

  const occupancy = await getOccupancyById(occupancyId, ownerId);

  // Check unique constraint
  const existing = await db.invoice.findUnique({
    where: {
      occupancyId_periodMonth_periodYear: {
        occupancyId,
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
      },
    },
  });

  if (existing) {
    throw new DuplicateInvoiceError();
  }

  const safeDueDate = new Date(data.dueDate);
  const prefix = `INV-${data.periodYear}${String(data.periodMonth).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `${prefix}-${occupancy.room.roomNumber}-${randomSuffix}`;

  const created = await db.invoice.create({
    data: {
      occupancyId,
      invoiceNumber,
      amount: data.amount,
      dueDate: safeDueDate,
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      status: safeDueDate < new Date() ? "OVERDUE" : "UNPAID",
    },
    include: {
      occupancy: {
        include: {
          tenant: true,
          room: {
            include: { property: true },
          },
        },
      },
      payments: true,
    },
  });

  return {
    ...created,
    ...calculateInvoiceFinancials(created.amount, created.payments, created.dueDate),
  };
}

/**
 * Idempotently generates invoices for all active occupancies for a specific period.
 * Does NOT duplicate existing invoices if run repeatedly.
 */
export async function createBulkInvoices(data: BulkInvoiceInput, ownerId: string) {
  const { periodMonth, periodYear, propertyId } = data;

  // Retrieve all active occupancies owned by this user
  const activeOccupancies = await db.occupancy.findMany({
    where: {
      status: "ACTIVE",
      room: {
        isArchived: false,
        property: {
          ownerId,
          isArchived: false,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
    },
    include: {
      room: true,
      tenant: true,
      invoices: {
        where: {
          periodMonth,
          periodYear,
        },
      },
    },
  });

  let generatedCount = 0;
  let skippedCount = 0;
  const createdInvoices = [];

  for (const occ of activeOccupancies) {
    // Idempotency: if invoice already exists for this occupancy and period, skip!
    if (occ.invoices.length > 0) {
      skippedCount++;
      continue;
    }

    const dueDate = createSafeDueDate(periodYear, periodMonth, occ.billingDueDay);
    const prefix = `INV-${periodYear}${String(periodMonth).padStart(2, "0")}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `${prefix}-${occ.room.roomNumber}-${randomSuffix}`;

    try {
      const inv = await db.invoice.create({
        data: {
          occupancyId: occ.id,
          invoiceNumber,
          amount: occ.monthlyRent, // Snapshot of current active lease rate
          dueDate,
          periodMonth,
          periodYear,
          status: dueDate < new Date() ? "OVERDUE" : "UNPAID",
        },
      });
      createdInvoices.push(inv);
      generatedCount++;
    } catch {
      // Handled gracefully in case of race-condition duplicate
      skippedCount++;
    }
  }

  return {
    totalEligible: activeOccupancies.length,
    generatedCount,
    skippedCount,
    invoices: createdInvoices,
  };
}

/**
 * Records a payment against an invoice inside an atomic database transaction.
 * Strictly prevents amount <= 0 and amount > remainingBalance.
 */
export async function recordPayment(
  data: RecordPaymentInput,
  ownerId: string,
  recordedById: string
) {
  if (data.amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih besar dari 0");
  }

  // Verify ownership and get current state
  const invoice = await getInvoiceById(data.invoiceId, ownerId);

  return db.$transaction(async (tx) => {
    // Fetch fresh non-cancelled payments inside the transaction
    const currentPayments = await tx.payment.findMany({
      where: {
        invoiceId: data.invoiceId,
        isCancelled: false,
      },
    });

    const currentTotalPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, invoice.amount - currentTotalPaid);

    if (data.amount > remainingBalance) {
      throw new PaymentExceedsBalanceError(
        `Nominal pembayaran (Rp ${data.amount.toLocaleString("id-ID")}) melebihi sisa tagihan (Rp ${remainingBalance.toLocaleString("id-ID")})`
      );
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        proofUrl: data.proofUrl || null,
        recordedById,
        isCancelled: false,
      },
    });

    const updatedPayments = [...currentPayments, payment];
    const financials = calculateInvoiceFinancials(
      invoice.amount,
      updatedPayments,
      invoice.dueDate
    );

    await tx.invoice.update({
      where: { id: data.invoiceId },
      data: { status: financials.status },
    });

    return {
      payment,
      financials,
    };
  });
}

/**
 * Cancels / reverses a recorded payment non-destructively.
 * Strictly preserves audit history while restoring invoice remaining balance.
 */
export async function cancelPayment(paymentId: string, reason: string, ownerId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          occupancy: {
            include: {
              room: {
                include: { property: true },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError("Data pembayaran tidak ditemukan");
  }

  if (payment.invoice.occupancy.room.property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  if (payment.isCancelled) {
    throw new Error("Pembayaran ini sudah pernah dibatalkan sebelumnya");
  }

  return db.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // Recompute invoice status from remaining active payments
    const activePayments = await tx.payment.findMany({
      where: {
        invoiceId: payment.invoiceId,
        isCancelled: false,
      },
    });

    const financials = calculateInvoiceFinancials(
      payment.invoice.amount,
      activePayments,
      payment.invoice.dueDate
    );

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: financials.status },
    });

    return {
      payment: updatedPayment,
      financials,
    };
  });
}

/**
 * Computes financial summary (actual income, receivables, overdue).
 * "Tagihan bukan pemasukan. Pemasukan adalah pembayaran riil yang tidak dibatalkan."
 */
export async function getOwnerFinancialSummary(
  ownerId: string,
  options: { propertyId?: string; periodMonth?: number; periodYear?: number } = {}
): Promise<FinancialSummary> {
  const { propertyId, periodMonth, periodYear } = options;

  const invoices = await db.invoice.findMany({
    where: {
      occupancy: {
        room: {
          property: {
            ownerId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      ...(periodMonth ? { periodMonth } : {}),
      ...(periodYear ? { periodYear } : {}),
    },
    include: {
      payments: {
        where: { isCancelled: false },
      },
    },
  });

  let totalBilled = 0;
  let totalPaid = 0;
  let remainingReceivable = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let unpaidCount = 0;
  let paidCount = 0;

  for (const inv of invoices) {
    totalBilled += inv.amount;
    const invPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    totalPaid += invPaid;

    const remaining = Math.max(0, inv.amount - invPaid);
    remainingReceivable += remaining;

    const financials = calculateInvoiceFinancials(inv.amount, inv.payments, inv.dueDate);

    if (financials.status === "PAID") {
      paidCount++;
    } else if (financials.status === "OVERDUE") {
      overdueCount++;
      overdueAmount += remaining;
    } else {
      unpaidCount++;
    }
  }

  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 0;

  return {
    totalBilled,
    totalPaid,
    remainingReceivable,
    overdueAmount,
    overdueCount,
    unpaidCount,
    paidCount,
    collectionRate,
  };
}

/**
 * Marks reminder timestamp when owner sends a WhatsApp notification.
 * Protected with owner IDOR check.
 */
export async function markReminderSent(invoiceId: string, ownerId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      occupancy: {
        include: {
          room: {
            include: { property: true },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError("Tagihan tidak ditemukan");
  }

  if (invoice.occupancy.room.property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { reminderSentAt: new Date() },
  });

  return updated;
}

/**
 * Retrieves detailed monthly report data for display and CSV export.
 */
export async function getMonthlyReportData(
  ownerId: string,
  options: { propertyId?: string; periodMonth?: number; periodYear?: number }
) {
  const { propertyId, periodMonth, periodYear } = options;

  const invoices = await db.invoice.findMany({
    where: {
      occupancy: {
        room: {
          property: {
            ownerId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      ...(periodMonth ? { periodMonth } : {}),
      ...(periodYear ? { periodYear } : {}),
    },
    include: {
      occupancy: {
        include: {
          tenant: true,
          room: {
            include: { property: true },
          },
        },
      },
      payments: {
        where: { isCancelled: false },
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: [
      { occupancy: { room: { property: { name: "asc" } } } },
      { occupancy: { room: { roomNumber: "asc" } } },
    ],
  });

  const summary = await getOwnerFinancialSummary(ownerId, options);

  const items: MonthlyReportItem[] = invoices.map((inv) => {
    const financials = calculateInvoiceFinancials(inv.amount, inv.payments, inv.dueDate);

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      propertyId: inv.occupancy.room.property.id,
      propertyName: inv.occupancy.room.property.name,
      roomNumber: inv.occupancy.room.roomNumber,
      tenantName: inv.occupancy.tenant.name,
      tenantPhone: inv.occupancy.tenant.phone,
      periodMonth: inv.periodMonth,
      periodYear: inv.periodYear,
      dueDate: inv.dueDate.toISOString(),
      amount: inv.amount,
      totalPaid: financials.totalPaid,
      remainingBalance: financials.remainingBalance,
      status: financials.status,
      reminderSentAt: inv.reminderSentAt ? inv.reminderSentAt.toISOString() : null,
    };
  });

  return {
    summary,
    items,
  };
}

/**
 * Retrieves recent non-cancelled payments for dashboard activity feed.
 */
export async function getRecentPayments(ownerId: string, limit = 5) {
  const payments = await db.payment.findMany({
    where: {
      isCancelled: false,
      invoice: {
        occupancy: {
          room: {
            property: {
              ownerId,
            },
          },
        },
      },
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          occupancy: {
            select: {
              tenant: { select: { id: true, name: true } },
              room: {
                select: {
                  roomNumber: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: limit,
  });

  return payments;
}

/**
 * Retrieves actionable invoices that need owner follow-up (overdue or unpaid/partial).
 */
export async function getActionableInvoices(ownerId: string, limit = 5) {
  const invoices = await db.invoice.findMany({
    where: {
      occupancy: {
        room: {
          property: {
            ownerId,
          },
        },
      },
      status: {
        in: ["OVERDUE", "PARTIAL", "UNPAID"],
      },
    },
    include: {
      occupancy: {
        include: {
          tenant: true,
          room: {
            include: { property: true },
          },
        },
      },
      payments: {
        where: { isCancelled: false },
      },
    },
    orderBy: [
      { dueDate: "asc" },
    ],
    take: limit,
  });

  return invoices.map((inv) => {
    const financials = calculateInvoiceFinancials(inv.amount, inv.payments, inv.dueDate);
    return {
      ...inv,
      ...financials,
    };
  });
}


