import { db } from "@/server/db";
import { OccupancyInput } from "@/lib/validations/tenant";
import { getRoomById } from "./rooms";
import { getTenantById } from "./tenants";
import { AuthorizationError, NotFoundError, ConflictError } from "./properties";

/**
 * Creates an occupancy (lease) linking room and tenant.
 * Strictly prevents overlapping/conflicting active occupancies on the same room.
 * Uses a database transaction to update room status to OCCUPIED atomically.
 */
export async function createOccupancy(data: OccupancyInput, ownerId: string) {
  // Verify that both room and tenant belong to the authenticated owner
  const room = await getRoomById(data.roomId, ownerId);
  await getTenantById(data.tenantId, ownerId);

  if (room.isArchived) {
    throw new ConflictError("Kamar yang diarsipkan tidak dapat disewakan.");
  }

  // Conflict check: ensure room does not have an active occupancy
  const activeOccupancy = await db.occupancy.findFirst({
    where: {
      roomId: data.roomId,
      status: "ACTIVE",
    },
  });

  if (activeOccupancy || room.status === "OCCUPIED") {
    throw new ConflictError("Kamar ini sudah terisi atau memiliki sewa aktif.");
  }

  return db.$transaction(async (tx) => {
    const occupancy = await tx.occupancy.create({
      data: {
        roomId: data.roomId,
        tenantId: data.tenantId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        billingDueDay: data.billingDueDay,
        depositAmount: data.depositAmount,
        monthlyRent: data.monthlyRent || room.monthlyRate,
        status: "ACTIVE",
      },
    });

    await tx.room.update({
      where: { id: data.roomId },
      data: { status: "OCCUPIED" },
    });

    return occupancy;
  });
}

/**
 * Retrieves an occupancy by ID and verifies owner through room's property.
 */
export async function getOccupancyById(occupancyId: string, ownerId: string) {
  const occupancy = await db.occupancy.findUnique({
    where: { id: occupancyId },
    include: {
      room: {
        include: { property: true },
      },
      tenant: true,
      invoices: {
        include: { payments: true },
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!occupancy) {
    throw new NotFoundError("Data sewa tidak ditemukan");
  }

  if (occupancy.room.property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  return occupancy;
}

/**
 * Terminates an occupancy (Checkout) and frees the room to VACANT atomically.
 * Strictly preserves all financial, invoice, and payment history.
 */
export async function terminateOccupancy(occupancyId: string, ownerId: string) {
  const occupancy = await getOccupancyById(occupancyId, ownerId);

  if (occupancy.status === "TERMINATED") {
    return occupancy;
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.occupancy.update({
      where: { id: occupancyId },
      data: {
        status: "TERMINATED",
        endDate: new Date(),
      },
    });

    // Check if any other active occupancy exists for this room before marking VACANT
    const remainingActive = await tx.occupancy.count({
      where: {
        roomId: occupancy.roomId,
        status: "ACTIVE",
        NOT: { id: occupancyId },
      },
    });

    if (remainingActive === 0) {
      await tx.room.update({
        where: { id: occupancy.roomId },
        data: { status: "VACANT" },
      });
    }

    return updated;
  });
}
