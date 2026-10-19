import { db } from "@/server/db";
import { TenantInput } from "@/lib/validations/tenant";
import { AuthorizationError, NotFoundError } from "./properties";

export interface GetTenantsOptions {
  search?: string;
}

/**
 * Retrieves all tenants owned by a verified ownerId, with optional search filter.
 */
export async function getTenantsByOwner(ownerId: string, options: GetTenantsOptions = {}) {
  const { search } = options;

  return db.tenant.findMany({
    where: {
      ownerId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      occupancies: {
        where: { status: "ACTIVE" },
        include: {
          room: {
            include: { property: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a tenant by ID and verifies ownerId.
 * Includes complete occupancy history with rooms and properties.
 */
export async function getTenantById(tenantId: string, ownerId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      occupancies: {
        include: {
          room: {
            include: { property: true },
          },
          invoices: {
            take: 5,
            orderBy: { dueDate: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundError("Penghuni tidak ditemukan");
  }

  if (tenant.ownerId !== ownerId) {
    throw new AuthorizationError();
  }

  return tenant;
}

/**
 * Creates a tenant bound to the verified ownerId.
 */
export async function createTenant(data: TenantInput, ownerId: string) {
  return db.tenant.create({
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      emergencyContact: data.emergencyContact || null,
      notes: data.notes || null,
      ownerId, // Always verified from session
    },
  });
}

/**
 * Updates a tenant after verifying ownership.
 */
export async function updateTenant(
  tenantId: string,
  data: Partial<TenantInput>,
  ownerId: string
) {
  await getTenantById(tenantId, ownerId);

  return db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });
}

/**
 * Deletes a tenant after verifying ownership.
 */
export async function deleteTenant(tenantId: string, ownerId: string) {
  await getTenantById(tenantId, ownerId);

  return db.tenant.delete({
    where: { id: tenantId },
  });
}

