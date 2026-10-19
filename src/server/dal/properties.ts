import { db } from "@/server/db";
import { PropertyInput } from "@/lib/validations/property";

export class AuthorizationError extends Error {
  constructor(message = "FORBIDDEN: Anda tidak memiliki akses ke properti ini") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Data tidak ditemukan") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Konflik data: Kamar sedang dihuni atau data bertabrakan") {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Retrieves all properties owned by a specific verified ownerId.
 */
export async function getPropertiesByOwner(ownerId: string, includeArchived = false) {
  return db.property.findMany({
    where: {
      ownerId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      rooms: {
        where: { isArchived: false },
        select: {
          id: true,
          status: true,
          monthlyRate: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single property by ID and strictly verifies ownership.
 * Throws AuthorizationError if property belongs to another user (anti-IDOR).
 */
export async function getPropertyById(propertyId: string, ownerId: string) {
  const property = await db.property.findUnique({
    where: { id: propertyId },
    include: {
      rooms: true,
    },
  });

  if (!property) {
    throw new NotFoundError("Properti tidak ditemukan");
  }

  if (property.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  return property;
}

/**
 * Creates a new property bound to the verified ownerId.
 */
export async function createProperty(data: PropertyInput, ownerId: string) {
  return db.property.create({
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      description: data.description || null,
      rules: data.rules || null,
      imageUrl: data.imageUrl || null,
      ownerId, // Always sourced from verified server session
    },
  });
}

/**
 * Updates a property after verifying ownership.
 */
export async function updateProperty(
  propertyId: string,
  data: Partial<PropertyInput>,
  ownerId: string
) {
  // Verify ownership first
  await getPropertyById(propertyId, ownerId);

  return db.property.update({
    where: { id: propertyId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address && { address: data.address }),
      ...(data.city && { city: data.city }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.rules !== undefined && { rules: data.rules }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
    },
  });
}

/**
 * Deletes a property after verifying ownership.
 */
export async function deleteProperty(propertyId: string, ownerId: string) {
  // Verify ownership first
  await getPropertyById(propertyId, ownerId);

  return db.property.delete({
    where: { id: propertyId },
  });
}

/**
 * Archives a property (soft delete) to preserve financial and occupancy history.
 */
export async function archiveProperty(propertyId: string, ownerId: string) {
  await getPropertyById(propertyId, ownerId);

  return db.property.update({
    where: { id: propertyId },
    data: { isArchived: true },
  });
}

