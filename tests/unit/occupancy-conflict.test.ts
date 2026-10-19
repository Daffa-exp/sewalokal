// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/server/db";
import { createOccupancy, terminateOccupancy } from "@/server/dal/occupancies";
import { archiveProperty, ConflictError } from "@/server/dal/properties";
import { archiveRoom } from "@/server/dal/rooms";

describe("Occupancy Conflict & Lifecycle Tests", () => {
  const ownerId = "owner-123";

  const mockProperty = {
    id: "prop-1",
    name: "Kos Nyaman",
    address: "Jl. Nyaman No. 1",
    city: "Bandung",
    description: null,
    rules: null,
    isArchived: false,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    rooms: [],
  };

  const mockRoom = {
    id: "room-1",
    propertyId: mockProperty.id,
    roomNumber: "101",
    type: "Standard",
    monthlyRate: 1500000,
    status: "VACANT",
    facilities: [],
    notes: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    occupancies: [],
  };

  const mockTenant = {
    id: "tenant-1",
    ownerId,
    name: "Ahmad Dahlan",
    phone: "081234567890",
    email: "ahmad@example.com",
    identityNumber: null,
    emergencyContact: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    occupancies: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully create occupancy and update room to OCCUPIED when vacant", async () => {
    vi.spyOn(db.room, "findUnique").mockResolvedValue(mockRoom as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenant as unknown as never);
    vi.spyOn(db.occupancy, "findFirst").mockResolvedValue(null);

    const createdOccupancy = {
      id: "occ-new-1",
      roomId: mockRoom.id,
      tenantId: mockTenant.id,
      startDate: new Date("2026-10-01"),
      endDate: null,
      billingDueDay: 1,
      depositAmount: 500000,
      monthlyRent: 1500000,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const txMock = {
      occupancy: {
        create: vi.fn().mockResolvedValue(createdOccupancy),
      },
      room: {
        update: vi.fn().mockResolvedValue({ ...mockRoom, status: "OCCUPIED" }),
      },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      return callback(txMock as unknown as never);
    });

    const result = await createOccupancy(
      {
        roomId: mockRoom.id,
        tenantId: mockTenant.id,
        startDate: "2026-10-01",
        billingDueDay: 1,
        depositAmount: 500000,
        monthlyRent: 1500000,
      },
      ownerId
    );

    expect(result).toBeDefined();
    expect(result.id).toBe("occ-new-1");
    expect(txMock.room.update).toHaveBeenCalledWith({
      where: { id: mockRoom.id },
      data: { status: "OCCUPIED" },
    });
  });

  it("should throw ConflictError if room already has an active occupancy", async () => {
    vi.spyOn(db.room, "findUnique").mockResolvedValue(mockRoom as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenant as unknown as never);

    // Mock existing active occupancy
    vi.spyOn(db.occupancy, "findFirst").mockResolvedValue({
      id: "occ-existing",
      roomId: mockRoom.id,
      status: "ACTIVE",
    } as unknown as never);

    await expect(
      createOccupancy(
        {
          roomId: mockRoom.id,
          tenantId: mockTenant.id,
          startDate: "2026-10-01",
          billingDueDay: 1,
          depositAmount: 0,
          monthlyRent: 1500000,
        },
        ownerId
      )
    ).rejects.toThrow(ConflictError);
  });

  it("should throw ConflictError if room status is already OCCUPIED", async () => {
    const occupiedRoom = { ...mockRoom, status: "OCCUPIED" };
    vi.spyOn(db.room, "findUnique").mockResolvedValue(occupiedRoom as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenant as unknown as never);
    vi.spyOn(db.occupancy, "findFirst").mockResolvedValue(null);

    await expect(
      createOccupancy(
        {
          roomId: mockRoom.id,
          tenantId: mockTenant.id,
          startDate: "2026-10-01",
          billingDueDay: 1,
          depositAmount: 0,
          monthlyRent: 1500000,
        },
        ownerId
      )
    ).rejects.toThrow(ConflictError);
  });

  it("should throw ConflictError if room is archived", async () => {
    const archivedRoom = { ...mockRoom, isArchived: true };
    vi.spyOn(db.room, "findUnique").mockResolvedValue(archivedRoom as unknown as never);
    vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenant as unknown as never);

    await expect(
      createOccupancy(
        {
          roomId: mockRoom.id,
          tenantId: mockTenant.id,
          startDate: "2026-10-01",
          billingDueDay: 1,
          depositAmount: 0,
          monthlyRent: 1500000,
        },
        ownerId
      )
    ).rejects.toThrow(ConflictError);
  });

  it("should terminate occupancy and restore room status to VACANT on checkout", async () => {
    const activeOccupancy = {
      id: "occ-active-1",
      roomId: mockRoom.id,
      tenantId: mockTenant.id,
      startDate: new Date("2026-01-01"),
      endDate: null,
      billingDueDay: 1,
      depositAmount: 0,
      monthlyRent: 1500000,
      status: "ACTIVE",
      room: { ...mockRoom, status: "OCCUPIED" },
      tenant: mockTenant,
      invoices: [],
    };

    vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(activeOccupancy as unknown as never);

    const txMock = {
      occupancy: {
        update: vi.fn().mockResolvedValue({ ...activeOccupancy, status: "TERMINATED" }),
        count: vi.fn().mockResolvedValue(0), // No remaining active occupancies
      },
      room: {
        update: vi.fn().mockResolvedValue({ ...mockRoom, status: "VACANT" }),
      },
    };

    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      return callback(txMock as unknown as never);
    });

    const result = await terminateOccupancy("occ-active-1", ownerId);
    expect(result.status).toBe("TERMINATED");
    expect(txMock.room.update).toHaveBeenCalledWith({
      where: { id: mockRoom.id },
      data: { status: "VACANT" },
    });
  });

  it("should soft-archive property without deleting underlying records", async () => {
    vi.spyOn(db.property, "findUnique").mockResolvedValue(mockProperty as unknown as never);
    const updateSpy = vi.spyOn(db.property, "update").mockResolvedValue({
      ...mockProperty,
      isArchived: true,
    } as unknown as never);

    const result = await archiveProperty(mockProperty.id, ownerId);
    expect(result.isArchived).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockProperty.id },
      data: { isArchived: true },
    });
  });

  it("should soft-archive room without deleting underlying records", async () => {
    vi.spyOn(db.room, "findUnique").mockResolvedValue(mockRoom as unknown as never);
    const updateSpy = vi.spyOn(db.room, "update").mockResolvedValue({
      ...mockRoom,
      isArchived: true,
    } as unknown as never);

    const result = await archiveRoom(mockRoom.id, ownerId);
    expect(result.isArchived).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockRoom.id },
      data: { isArchived: true },
    });
  });
});
