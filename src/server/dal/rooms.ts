import { db } from "@/server/db";
import { RoomInput } from "@/lib/validations/property";
import { getPropertyById, AuthorizationError, NotFoundError } from "./properties";
import { RoomStatus } from "@prisma/client";

export interface GetRoomsOptions {
  propertyId?: string;
  status?: RoomStatus;
  search?: string;
  includeArchived?: boolean;
}

/**
 * Retrieves all rooms for a verified owner, with optional filtering by property, status, and search query.
 */
export async function getRoomsByOwner(ownerId: string, options: GetRoomsOptions = {}) {
  const { propertyId, status, search, includeArchived = false } = options;

  return db.room.findMany({
    where: {
      property: {
        ownerId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status } : {}),
      ...(includeArchived ? {} : { isArchived: false }),
      ...(search
        ? {
            OR: [
              { roomNumber: { contains: search, mode: "insensitive" } },
              { type: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          city: true,
        },
      },
      occupancies: {
        where: { status: "ACTIVE" },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ property: { name: "asc" } }, { roomNumber: "asc" }],
  });
}

/**
 * Retrieves all rooms for a specific property after verifying ownership.
 */
export async function getRoomsByProperty(propertyId: string, ownerId: string, includeArchived = false) {
  await getPropertyById(propertyId, ownerId);

  return db.room.findMany({
    where: {
      propertyId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      occupancies: {
        where: { status: "ACTIVE" },
        include: { tenant: true },
      },
    },
    orderBy: { roomNumber: "asc" },
  });
}

/**
 * Creates a room within a verified property.
 */
export async function createRoom(
  propertyId: string,
  data: Omit<RoomInput, "propertyId">,
  ownerId: string
) {
  await getPropertyById(propertyId, ownerId);

  return db.room.create({
    data: {
      propertyId,
      roomNumber: data.roomNumber,
      type: data.type,
      monthlyRate: data.monthlyRate,
      status: data.status || "VACANT",
      facilities: data.facilities || [],
      notes: data.notes || null,
    },
  });
}

/**
 * Retrieves a room and verifies property ownership.
 */
export async function getRoomById(roomId: string, ownerId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      property: true,
      occupancies: {
        include: {
          tenant: true,
          invoices: {
            take: 5,
            orderBy: { dueDate: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!room) {
    throw new NotFoundError("Kamar tidak ditemukan");
  }

  if (room.property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  return room;
}

/**
 * Updates a room after verifying ownership.
 */
export async function updateRoom(
  roomId: string,
  data: Partial<RoomInput> & { isArchived?: boolean },
  ownerId: string
) {
  await getRoomById(roomId, ownerId);

  return db.room.update({
    where: { id: roomId },
    data: {
      ...(data.roomNumber && { roomNumber: data.roomNumber }),
      ...(data.type && { type: data.type }),
      ...(data.monthlyRate !== undefined && { monthlyRate: data.monthlyRate }),
      ...(data.status && { status: data.status }),
      ...(data.facilities && { facilities: data.facilities }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    },
  });
}

/**
 * Archives a room (soft delete) to preserve lease & billing history.
 */
export async function archiveRoom(roomId: string, ownerId: string) {
  await getRoomById(roomId, ownerId);

  return db.room.update({
    where: { id: roomId },
    data: { isArchived: true },
  });
}

/**
 * Deletes a room after verifying ownership.
 */
export async function deleteRoom(roomId: string, ownerId: string) {
  await getRoomById(roomId, ownerId);

  return db.room.delete({
    where: { id: roomId },
  });
}
