import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z
    .string({ message: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
  name: z
    .string({ message: "Nama lengkap wajib diisi" })
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .trim(),
  email: z
    .string({ message: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^[0-9+ -]+$/, "Nomor telepon hanya boleh berisi angka")
    .optional()
    .or(z.literal("")),
  password: z
    .string({ message: "Password wajib diisi" })
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus memiliki minimal 1 huruf besar")
    .regex(/[0-9]/, "Password harus memiliki minimal 1 angka"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
