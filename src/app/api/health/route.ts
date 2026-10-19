import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Lightweight database ping
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp,
        service: "sewalokal-api",
        database: "connected",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    // Log failure without exposing sensitive data to client
    console.error("Healthcheck database connection failure:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json(
      {
        status: "error",
        timestamp,
        service: "sewalokal-api",
        database: "disconnected",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
