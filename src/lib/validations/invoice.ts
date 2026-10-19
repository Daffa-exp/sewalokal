import { z } from "zod";

export const invoiceSchema = z.object({
  occupancyId: z.string({ message: "Masa sewa (occupancy) wajib dipilih" }).optional(),
  leaseId: z.string().optional(),
  amount: z
    .number({ message: "Jumlah tagihan wajib diisi" })
    .positive("Jumlah tagihan harus lebih dari 0"),
  dueDate: z.string({ message: "Jatuh tempo wajib diisi" }),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
}).refine((data) => data.occupancyId || data.leaseId, {
  message: "Masa sewa/kontrak wajib dipilih",
  path: ["occupancyId"],
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string({ message: "Tagihan wajib dipilih" }),
  amount: z
    .number({ message: "Jumlah pembayaran wajib diisi" })
    .positive("Jumlah pembayaran harus lebih dari 0"),
  paidAt: z.string().optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "CASH", "QRIS"], {
    message: "Metode pembayaran wajib dipilih",
  }),
  notes: z.string().max(255).optional().or(z.literal("")),
  proofUrl: z.string().url("URL bukti pembayaran tidak valid").optional().or(z.literal("")),
});

export const bulkInvoiceSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  propertyId: z.string().optional(),
});

export const cancelPaymentSchema = z.object({
  paymentId: z.string({ message: "ID pembayaran wajib diisi" }),
  reason: z
    .string({ message: "Alasan pembatalan wajib diisi" })
    .min(3, "Alasan pembatalan minimal 3 karakter")
    .max(255, "Alasan pembatalan maksimal 255 karakter")
    .trim(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type BulkInvoiceInput = z.infer<typeof bulkInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;

