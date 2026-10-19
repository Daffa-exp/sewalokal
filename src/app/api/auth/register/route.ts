import { NextResponse } from "next/server";
import { registerOwner } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data registrasi tidak valid",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await registerOwner(parsed.data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Auth register error:", errorMsg);

    const isDbConnectionError =
      errorMsg.includes("Can't reach database server") ||
      errorMsg.includes("P1001") ||
      errorMsg.includes("connect ECONNREFUSED");

    const message = isDbConnectionError
      ? "Gagal terhubung ke database PostgreSQL. Pastikan database aktif dan konfigurasi DATABASE_URL di .env sudah benar."
      : "Terjadi kesalahan saat memproses pendaftaran. Silakan coba kembali nanti.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
