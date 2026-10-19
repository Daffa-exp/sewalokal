export {
  getCurrentUser,
  requireAuth,
  assertOwnerAccess,
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  deleteSessionCookie,
} from "@/lib/session";

export {
  loginWithCredentials,
  registerOwner,
  logoutUser,
  type AuthResult,
} from "@/lib/auth";
