import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthorizationError, NotFoundError, ConflictError } from "@/server/dal/properties";
import { DuplicateInvoiceError, PaymentExceedsBalanceError } from "@/server/dal/invoices";

export function handleApiError(error: unknown) {
  // Allow Next.js dynamic signal errors to bubble up for Partial Prerendering
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    if (digest === "HANGING_PROMISE_REJECTION" || digest.startsWith("NEXT_")) {
      throw error;
    }
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: error.issues[0]?.message || "Validasi gagal",
        details: error.flatten(),
      },
      { status: 400 }
    );
  }

  if (error instanceof PaymentExceedsBalanceError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof ConflictError || error instanceof DuplicateInvoiceError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 409 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 404 }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 403 }
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: "Terjadi kesalahan pada server" },
    { status: 500 }
  );
}
