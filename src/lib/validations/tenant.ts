import { z } from "zod";

export const tenantSchema = z.object({
  name: z
    .string({ message: "Nama penghuni wajib diisi" })
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .trim(),
  phone: z
    .string()
    .min(9, "Nomor telepon minimal 9 digit")
    .max(16, "Nomor telepon maksimal 16 digit")
    .regex(/^[0-9+ -]+$/, "Format nomor telepon tidak valid")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal("")),
  emergencyContact: z
    .string()
    .max(100, "Kontak darurat maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

export const occupancySchema = z.object({
  roomId: z.string({ message: "Kamar wajib dipilih" }),
  tenantId: z.string({ message: "Penghuni wajib dipilih" }),
  startDate: z.string({ message: "Tanggal mulai sewa wajib diisi" }),
  endDate: z.string().optional().or(z.literal("")),
  billingDueDay: z.number().int().min(1).max(31).default(1),
  depositAmount: z.number().min(0, "Deposit tidak boleh negatif").default(0),
  monthlyRent: z
    .number({ message: "Biaya sewa bulanan wajib diisi" })
    .positive("Biaya sewa bulanan harus lebih dari 0"),
});

export const leaseSchema = occupancySchema;

export type TenantInput = z.infer<typeof tenantSchema>;
export type OccupancyInput = z.infer<typeof occupancySchema>;
export type LeaseInput = OccupancyInput;

