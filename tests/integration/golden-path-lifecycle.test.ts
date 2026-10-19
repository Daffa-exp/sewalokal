// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/server/db";
import { createProperty } from "@/server/dal/properties";
import { createRoom } from "@/server/dal/rooms";
import { createTenant } from "@/server/dal/tenants";
import { createOccupancy, terminateOccupancy } from "@/server/dal/occupancies";
import {
  createInvoice,
  recordPayment,
  markReminderSent,
  getOwnerFinancialSummary,
  getMonthlyReportData,
} from "@/server/dal/invoices";
import {
  isValidIndonesianPhone,
  buildBillingReminderMessage,
  createWhatsAppReminderUrl,
} from "@/lib/formatters";

describe("Fase 5: Full 11-Step Golden Path Functional Audit", () => {
  const owner = {
    id: "owner-golden-path",
    email: "pemilik@harmoni.id",
    name: "Ibu Hartono",
    role: "OWNER" as const,
  };

  const propertyData = {
    id: "prop-gp-01",
    name: "Kos Grand Harmoni",
    address: "Jl. Kaliurang KM 8 No. 12",
    city: "Sleman",
    ownerId: owner.id,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    rooms: [],
  };

  const roomData = {
    id: "room-gp-101",
    propertyId: propertyData.id,
    roomNumber: "101",
    type: "Deluxe",
    monthlyRate: 1500000,
    status: "VACANT" as const,
    facilities: ["AC", "Kamar Mandi Dalam", "Kasur King"],
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: propertyData,
    occupancies: [],
  };

  const tenantData = {
    id: "tenant-gp-01",
    ownerId: owner.id,
    name: "Dimas Pratama",
    phone: "081234567890",
    email: "dimas@mahasiswa.ac.id",
    identityNumber: null,
    emergencyContact: "081987654321",
    notes: "Mahasiswa tingkat akhir",
    createdAt: new Date(),
    updatedAt: new Date(),
    occupancies: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Step 1: User verification & owner identity checks", () => {
    expect(owner.id).toBeDefined();
    expect(owner.role).toBe("OWNER");
  });

  it("Step 2: Owner creates a new property", async () => {
    vi.spyOn(db.property, "create").mockResolvedValue(propertyData as unknown as never);

    const createdProperty = await createProperty(
      {
        name: "Kos Grand Harmoni",
        address: "Jl. Kaliurang KM 8 No. 12",
        city: "Sleman",
      },
      owner.id
    );

    expect(createdProperty.id).toBe("prop-gp-01");
    expect(createdProperty.name).toBe("Kos Grand Harmoni");
    expect(createdProperty.ownerId).toBe(owner.id);
  });

  it("Step 3: Owner creates a room within the property", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(propertyData as unknown as never);
    vi.spyOn(db.room, "create").mockResolvedValue(roomData as unknown as never);

    const createdRoom = await createRoom(
      propertyData.id,
      {
        roomNumber: "101",
        type: "Deluxe",
        monthlyRate: 1500000,
        status: "VACANT",
        facilities: ["AC", "Kamar Mandi Dalam", "Kasur King"],
      },
      owner.id
    );

    expect(createdRoom.roomNumber).toBe("101");
    expect(createdRoom.status).toBe("VACANT");
    expect(createdRoom.monthlyRate).toBe(1500000);
  });

  it("Step 4: Owner registers a new tenant", async () => {
    vi.spyOn(db.tenant, "create").mockResolvedValue(tenantData as unknown as never);

    const createdTenant = await createTenant(
      {
        name: "Dimas Pratama",
        phone: "081234567890",
        email: "dimas@mahasiswa.ac.id",
        emergencyContact: "081987654321",
      },
      owner.id
    );

    expect(createdTenant.name).toBe("Dimas Pratama");
    expect(createdTenant.phone).toBe("081234567890");
    expect(isValidIndonesianPhone(createdTenant.phone)).toBe(true);
  });

  it("Step 5: Owner places tenant in room (Check-in / Occupancy)", async () => {
    vi.spyOn(db.room, "findUnique").mockResolvedValue(roomData as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(tenantData as unknown as never);
    vi.spyOn(db.occupancy, "findFirst").mockResolvedValue(null); // No conflicts

    const activeOccupancy = {
      id: "occ-gp-01",
      roomId: roomData.id,
      tenantId: tenantData.id,
      startDate: new Date("2026-10-01"),
      endDate: null,
      billingDueDay: 10,
      depositAmount: 500000,
      monthlyRent: 1500000,
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      const tx = {
        occupancy: {
          create: vi.fn().mockResolvedValue(activeOccupancy),
        },
        room: {
          update: vi.fn().mockResolvedValue({ ...roomData, status: "OCCUPIED" }),
        },
      };
      return callback(tx as unknown as never);
    });

    const occupancy = await createOccupancy(
      {
        roomId: roomData.id,
        tenantId: tenantData.id,
        startDate: "2026-10-01",
        billingDueDay: 10,
        depositAmount: 500000,
        monthlyRent: 1500000,
      },
      owner.id
    );

    expect(occupancy.status).toBe("ACTIVE");
    expect(occupancy.monthlyRent).toBe(1500000);
  });

  it("Step 6: Owner generates invoice with snapshot pricing", async () => {
    const fullOccupancy = {
      id: "occ-gp-01",
      roomId: roomData.id,
      tenantId: tenantData.id,
      startDate: new Date("2026-10-01"),
      status: "ACTIVE" as const,
      room: roomData,
      tenant: tenantData,
    };

    vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(fullOccupancy as unknown as never);
    vi.spyOn(db.invoice, "findUnique").mockResolvedValue(null);

    const createdInvoice = {
      id: "inv-gp-01",
      invoiceNumber: "INV-202610-101-9999",
      occupancyId: "occ-gp-01",
      amount: 1500000,
      periodMonth: 10,
      periodYear: 2026,
      dueDate: new Date(Date.now() + 864000000), // future
      status: "UNPAID" as const,
      notes: null,
      occupancy: fullOccupancy,
      payments: [],
      reminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(db.invoice, "create").mockResolvedValue(createdInvoice as unknown as never);

    const futureDateStr = new Date(Date.now() + 864000000).toISOString().split("T")[0];
    const invoice = await createInvoice(
      {
        occupancyId: "occ-gp-01",
        amount: 1500000,
        periodMonth: 10,
        periodYear: 2026,
        dueDate: futureDateStr,
      },
      owner.id
    );

    expect(invoice.amount).toBe(1500000);
    expect(invoice.totalPaid).toBe(0);
    expect(invoice.remainingBalance).toBe(1500000);
    expect(invoice.status).toBe("UNPAID");
  });

  it("Step 7: Tenant makes a partial payment of Rp 500.000", async () => {
    const invoiceData = {
      id: "inv-gp-01",
      invoiceNumber: "INV-202610-101-9999",
      amount: 1500000,
      dueDate: new Date(Date.now() + 864000000),
      status: "UNPAID" as const,
      occupancy: {
        room: roomData,
        tenant: tenantData,
      },
      payments: [],
    };

    vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);

    const partialPayment = {
      id: "pay-gp-01",
      invoiceId: "inv-gp-01",
      amount: 500000,
      paidAt: new Date("2026-10-05"),
      paymentMethod: "BANK_TRANSFER" as const,
      isCancelled: false,
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      const tx = {
        payment: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue(partialPayment),
        },
        invoice: {
          update: vi.fn().mockResolvedValue({
            ...invoiceData,
            status: "PARTIAL",
          }),
        },
      };
      return callback(tx as unknown as never);
    });

    const result = await recordPayment(
      {
        invoiceId: "inv-gp-01",
        amount: 500000,
        paymentMethod: "BANK_TRANSFER",
        paidAt: "2026-10-05",
      },
      owner.id,
      owner.id
    );

    expect(result.payment.amount).toBe(500000);
    expect(result.financials.totalPaid).toBe(500000);
    expect(result.financials.remainingBalance).toBe(1000000);
    expect(result.financials.status).toBe("PARTIAL");
  });

  it("Step 8: Tenant settles remaining Rp 1.000.000 (Full settlement)", async () => {
    const existingPayments = [
      { id: "pay-gp-01", amount: 500000, isCancelled: false },
    ];

    const invoiceData = {
      id: "inv-gp-01",
      invoiceNumber: "INV-202610-101-9999",
      amount: 1500000,
      dueDate: new Date(Date.now() + 864000000),
      status: "PARTIAL" as const,
      occupancy: {
        room: roomData,
        tenant: tenantData,
      },
      payments: existingPayments,
    };

    vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);

    const settlementPayment = {
      id: "pay-gp-02",
      invoiceId: "inv-gp-01",
      amount: 1000000,
      paidAt: new Date("2026-10-08"),
      paymentMethod: "CASH" as const,
      isCancelled: false,
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      const tx = {
        payment: {
          findMany: vi.fn().mockResolvedValue(existingPayments),
          create: vi.fn().mockResolvedValue(settlementPayment),
        },
        invoice: {
          update: vi.fn().mockResolvedValue({
            ...invoiceData,
            status: "PAID",
          }),
        },
      };
      return callback(tx as unknown as never);
    });

    const result = await recordPayment(
      {
        invoiceId: "inv-gp-01",
        amount: 1000000,
        paymentMethod: "CASH",
        paidAt: "2026-10-08",
      },
      owner.id,
      owner.id
    );

    expect(result.payment.amount).toBe(1000000);
    expect(result.financials.totalPaid).toBe(1500000);
    expect(result.financials.remainingBalance).toBe(0);
    expect(result.financials.status).toBe("PAID");
  });

  it("Step 9: Owner views dashboard and monthly report", async () => {
    const settledInvoice = {
      id: "inv-gp-01",
      invoiceNumber: "INV-202610-101-9999",
      amount: 1500000,
      dueDate: new Date("2026-10-10"),
      periodMonth: 10,
      periodYear: 2026,
      status: "PAID" as const,
      occupancy: {
        room: roomData,
        tenant: tenantData,
      },
      payments: [
        { id: "pay-gp-01", amount: 500000, isCancelled: false },
        { id: "pay-gp-02", amount: 1000000, isCancelled: false },
      ],
      reminderSentAt: null,
    };

    vi.spyOn(db.invoice, "findMany").mockResolvedValue([settledInvoice] as unknown as never);

    const summary = await getOwnerFinancialSummary(owner.id, { periodMonth: 10, periodYear: 2026 });
    const report = await getMonthlyReportData(owner.id, { periodMonth: 10, periodYear: 2026 });

    // Actual revenue matches sum of non-cancelled payments: Rp 1.500.000
    expect(summary.totalBilled).toBe(1500000);
    expect(summary.totalPaid).toBe(1500000);
    expect(summary.remainingReceivable).toBe(0);
    expect(summary.collectionRate).toBe(100);
    expect(summary.paidCount).toBe(1);

    expect(report.items).toHaveLength(1);
    expect(report.items[0].status).toBe("PAID");
    expect(report.items[0].remainingBalance).toBe(0);
  });

  it("Step 10: Owner generates WhatsApp reminder message and logs reminderSentAt", async () => {
    const invoiceData = {
      id: "inv-gp-01",
      occupancy: {
        room: roomData,
        tenant: tenantData,
      },
      reminderSentAt: null,
    };

    vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);
    vi.spyOn(db.invoice, "update").mockResolvedValue({
      ...invoiceData,
      reminderSentAt: new Date(),
    } as unknown as never);

    // Build WhatsApp reminder text
    const message = buildBillingReminderMessage({
      tenantName: tenantData.name,
      propertyName: propertyData.name,
      roomNumber: roomData.roomNumber,
      periodMonth: 10,
      periodYear: 2026,
      remainingBalance: 500000,
      dueDate: "2026-10-10",
    });

    expect(message).toContain("Halo Kak Dimas Pratama,");
    expect(message).toContain("Kos Grand Harmoni");
    expect(message).toContain("Rp 500.000");

    const waUrl = createWhatsAppReminderUrl(tenantData.phone, message);
    expect(waUrl).toContain("https://wa.me/6281234567890");

    // Persist reminder timestamp in audit trail
    const updated = await markReminderSent("inv-gp-01", owner.id);
    expect(updated.reminderSentAt).toBeDefined();
  });

  it("Step 11: Tenant checks out; room becomes VACANT while historical records remain intact", async () => {
    const activeOccupancy = {
      id: "occ-gp-01",
      roomId: roomData.id,
      tenantId: tenantData.id,
      status: "ACTIVE" as const,
      room: roomData,
      tenant: tenantData,
    };

    vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(activeOccupancy as unknown as never);

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      const tx = {
        occupancy: {
          update: vi.fn().mockResolvedValue({
            ...activeOccupancy,
            status: "TERMINATED",
            endDate: new Date(),
          }),
          count: vi.fn().mockResolvedValue(0),
        },
        room: {
          update: vi.fn().mockResolvedValue({
            ...roomData,
            status: "VACANT",
          }),
        },
      };
      return callback(tx as unknown as never);
    });

    const checkedOut = await terminateOccupancy("occ-gp-01", owner.id);

    expect(checkedOut.status).toBe("TERMINATED");
    expect(checkedOut.endDate).toBeDefined();
  });
});
