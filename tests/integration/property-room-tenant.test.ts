// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import * as sessionModule from "@/lib/session";
import { GET as getProperties, POST as postProperty } from "@/app/api/properties/route";
import { GET as getPropertyDetail, PUT as putProperty, DELETE as deleteProperty } from "@/app/api/properties/[id]/route";
import { GET as getRooms, POST as postRoom } from "@/app/api/rooms/route";
import { GET as getTenants, POST as postTenant } from "@/app/api/tenants/route";
import { POST as postOccupancy } from "@/app/api/occupancies/route";
import { POST as postCheckout } from "@/app/api/occupancies/[id]/checkout/route";

describe("Property, Room, Tenant & Occupancy API Integration", () => {
  const mockUser = {
    userId: "owner-usr-01",
    email: "owner@sewalokal.id",
    name: "Pak Budi",
    role: "OWNER" as const,
  };

  const mockProperty = {
    id: "prop-01",
    ownerId: mockUser.userId,
    name: "Kos Melati Harmoni",
    address: "Jl. Kaliurang KM 5 No. 10",
    city: "Sleman",
    description: "Kos dekat kampus",
    rules: "Batas bertamu jam 22.00",
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    rooms: [],
  };

  const mockRoom = {
    id: "room-01",
    propertyId: mockProperty.id,
    roomNumber: "101",
    type: "Standard",
    monthlyRate: 1200000,
    status: "VACANT",
    facilities: ["Kasur", "Meja"],
    notes: "Lantai 1",
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    occupancies: [],
  };

  const mockTenant = {
    id: "tenant-01",
    ownerId: mockUser.userId,
    name: "Andi Pratama",
    phone: "081234567890",
    email: "andi@student.ac.id",
    identityNumber: null,
    emergencyContact: "081987654321",
    notes: "Mahasiswa baru",
    createdAt: new Date(),
    updatedAt: new Date(),
    occupancies: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);
  });

  it("GET /api/properties should return properties for authenticated owner", async () => {
    vi.spyOn(db.property, "findMany").mockResolvedValue([mockProperty] as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/properties");
    const response = await getProperties(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe("Kos Melati Harmoni");
  });

  it("POST /api/properties should create a new property for authenticated owner", async () => {
    vi.spyOn(db.property, "create").mockResolvedValue({
      ...mockProperty,
      id: "prop-new",
      name: "Kos Mawar Indah",
    } as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({
        name: "Kos Mawar Indah",
        address: "Jl. Gejayan No. 25",
        city: "Sleman",
      }),
    });

    const response = await postProperty(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Kos Mawar Indah");
  });

  it("DELETE /api/properties/[id] should soft-archive property by default", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(mockProperty as unknown as never);
    vi.spyOn(db.property, "update").mockResolvedValue({
      ...mockProperty,
      isArchived: true,
    } as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/properties/prop-01", {
      method: "DELETE",
    });

    const response = await deleteProperty(request, {
      params: Promise.resolve({ id: "prop-01" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("diarsipkan");
  });

  it("POST /api/rooms should create a room bound to verified property", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(mockProperty as unknown as never);
    vi.spyOn(db.room, "create").mockResolvedValue(mockRoom as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        propertyId: mockProperty.id,
        roomNumber: "101",
        type: "Standard",
        monthlyRate: 1200000,
      }),
    });

    const response = await postRoom(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.roomNumber).toBe("101");
  });

  it("POST /api/tenants should create tenant with minimal non-sensitive data", async () => {
    vi.spyOn(db.tenant, "create").mockResolvedValue(mockTenant as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        name: "Andi Pratama",
        phone: "081234567890",
        email: "andi@student.ac.id",
      }),
    });

    const response = await postTenant(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Andi Pratama");
  });

  it("POST /api/occupancies should return 409 Conflict if room is already occupied", async () => {
    vi.spyOn(db.room, "findUnique").mockResolvedValue({
      ...mockRoom,
      status: "OCCUPIED",
    } as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenant as unknown as never);
    vi.spyOn(db.occupancy, "findFirst").mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/occupancies", {
      method: "POST",
      body: JSON.stringify({
        roomId: mockRoom.id,
        tenantId: mockTenant.id,
        startDate: "2026-10-15",
        billingDueDay: 1,
        depositAmount: 0,
        monthlyRent: 1200000,
      }),
    });

    const response = await postOccupancy(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.error).toContain("sudah terisi atau memiliki sewa aktif");
  });

  it("GET /api/properties/[id] should return property detail", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(mockProperty as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/properties/prop-01");
    const response = await getPropertyDetail(request, {
      params: Promise.resolve({ id: "prop-01" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Kos Melati Harmoni");
  });

  it("PUT /api/properties/[id] should update property", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(mockProperty as unknown as never);
    vi.spyOn(db.property, "update").mockResolvedValue({
      ...mockProperty,
      name: "Kos Melati Harmoni Baru",
    } as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/properties/prop-01", {
      method: "PUT",
      body: JSON.stringify({ name: "Kos Melati Harmoni Baru" }),
    });
    const response = await putProperty(request, {
      params: Promise.resolve({ id: "prop-01" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Kos Melati Harmoni Baru");
  });

  it("GET /api/rooms should return filtered rooms", async () => {
    vi.spyOn(db.room, "findMany").mockResolvedValue([mockRoom] as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/rooms?status=VACANT");
    const response = await getRooms(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].roomNumber).toBe("101");
  });

  it("GET /api/tenants should return list of tenants", async () => {
    vi.spyOn(db.tenant, "findMany").mockResolvedValue([mockTenant] as unknown as never);

    const request = new NextRequest("http://localhost:3000/api/tenants?search=Andi");
    const response = await getTenants(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe("Andi Pratama");
  });

  it("POST /api/occupancies/[id]/checkout should terminate occupancy and reset room status", async () => {
    const activeOccupancy = {
      id: "occ-01",
      roomId: mockRoom.id,
      tenantId: mockTenant.id,
      startDate: new Date("2026-01-01"),
      endDate: null,
      billingDueDay: 1,
      depositAmount: 0,
      monthlyRent: 1200000,
      status: "ACTIVE",
      room: { ...mockRoom, status: "OCCUPIED" },
      tenant: mockTenant,
      invoices: [],
    };

    vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(activeOccupancy as unknown as never);

    const txMock = {
      occupancy: {
        update: vi.fn().mockResolvedValue({ ...activeOccupancy, status: "TERMINATED" }),
        count: vi.fn().mockResolvedValue(0),
      },
      room: {
        update: vi.fn().mockResolvedValue({ ...mockRoom, status: "VACANT" }),
      },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      return callback(txMock as unknown as never);
    });

    const request = new NextRequest("http://localhost:3000/api/occupancies/occ-01/checkout", {
      method: "POST",
    });

    const response = await postCheckout(request, {
      params: Promise.resolve({ id: "occ-01" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Check-out berhasil");
  });
});
