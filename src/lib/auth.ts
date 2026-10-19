import { db } from "./db";
import { verifyPassword } from "./password";
import { setSessionCookie, deleteSessionCookie, getCurrentUser, requireAuth, SessionPayload } from "./session";
import { LoginInput, RegisterInput } from "./validations/auth";
import { hashPassword } from "./password";

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Authenticates user credentials and establishes server session cookie.
 */
export async function loginWithCredentials(input: LoginInput): Promise<AuthResult> {
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    return { success: false, message: "Email atau password tidak sesuai" };
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, message: "Email atau password tidak sesuai" };
  }

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  await setSessionCookie(payload);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Registers a new kos owner account and starts session.
 */
export async function registerOwner(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    return { success: false, message: "Email sudah terdaftar. Silakan login." };
  }

  const passwordHash = await hashPassword(input.password);

  const newUser = await db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      passwordHash,
      role: "OWNER",
    },
  });

  const payload: SessionPayload = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  };

  await setSessionCookie(payload);

  return {
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
  };
}

/**
 * Logs out the current user by deleting session cookie.
 */
export async function logoutUser(): Promise<void> {
  await deleteSessionCookie();
}

export { getCurrentUser, requireAuth };
