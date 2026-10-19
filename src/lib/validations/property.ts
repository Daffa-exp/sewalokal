import { z } from "zod";

export const propertySchema = z.object({
  name: z
    .string({ message: "Nama kos wajib diisi" })
    .min(3, "Nama kos minimal 3 karakter")
    .max(100, "Nama kos maksimal 100 karakter")
    .trim(),
  address: z
    .string({ message: "Alamat kos wajib diisi" })
    .min(5, "Alamat minimal 5 karakter")
    .max(255, "Alamat maksimal 255 karakter")
    .trim(),
  city: z
    .string({ message: "Kota/Kabupaten wajib diisi" })
    .min(2, "Kota minimal 2 karakter")
    .max(100, "Kota maksimal 100 karakter")
    .trim(),
  description: z.string().max(1000, "Deskripsi maksimal 1000 karakter").optional(),
  rules: z.string().max(1000, "Peraturan kos maksimal 1000 karakter").optional(),
});

export const roomSchema = z.object({
  propertyId: z.string({ message: "Properti kos harus dipilih" }),
  roomNumber: z
    .string({ message: "Nomor/Nama kamar wajib diisi" })
    .min(1, "Nomor kamar minimal 1 karakter")
    .max(20, "Nomor kamar maksimal 20 karakter")
    .trim(),
  type: z.string().min(2, "Tipe kamar minimal 2 karakter").default("Standard"),
  monthlyRate: z
    .number({ message: "Harga sewa bulanan wajib diisi" })
    .positive("Harga sewa bulanan harus lebih besar dari 0"),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE"]).default("VACANT"),
  facilities: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type RoomInput = z.infer<typeof roomSchema>;
