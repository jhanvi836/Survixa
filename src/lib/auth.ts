import crypto from "crypto";
import { AuthTokenPayload, UserRecord, UserRole } from "@/types";

export const AUTH_COOKIE_NAME = "survixa_auth_token";
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  "survixa-disaster-response-secure-jwt-auth-token-key-2026";

/**
 * Pre-configured verified accounts for high-availability demos and production initialization
 */
export const DEMO_ACCOUNTS: Array<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency?: any;
  badgeNumber?: string;
  phone?: string;
  plainPassword: string;
}> = [
  {
    id: "user-cmd-01",
    email: "commander@survixa.org",
    name: "Chief Controller Sarah Jenkins",
    role: "COMMANDER",
    agency: "FIRE",
    badgeNumber: "ICS-CMD-01",
    phone: "+1 (415) 555-0100",
    plainPassword: "Command@123",
  },
  {
    id: "user-disp-02",
    email: "dispatcher@survixa.org",
    name: "Tactical Dispatcher Marcus Vance",
    role: "DISPATCHER",
    agency: "MEDICAL",
    badgeNumber: "TAC-DISP-04",
    phone: "+1 (415) 555-0104",
    plainPassword: "Dispatch@123",
  },
  {
    id: "user-cit-03",
    email: "citizen@survixa.org",
    name: "Elena Rostova",
    role: "CITIZEN",
    phone: "+1 (415) 555-0255",
    plainPassword: "Citizen@123",
  },
];

/**
 * Hashes a plaintext password using salt + cryptographic scrypt (memory-hard, resistant to GPU attacks)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a password against an scrypt or demo hash with timing-safe comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !password) return false;

  // 1. Scrypt format: "scrypt:salt:hash"
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, salt, originalHex] = parts;

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        const originalBuf = Buffer.from(originalHex, "hex");
        // Timing-safe comparison to prevent side-channel timing attacks
        if (originalBuf.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(originalBuf, derivedKey));
      });
    });
  }

  // 2. Fallback check for plain demo password (during development or cold database bootstrap)
  return password === storedHash;
}

/**
 * Generates standard Base64URL-encoded HMAC-SHA256 JWT Token
 */
export function signAuthToken(payload: Omit<AuthTokenPayload, "iat" | "exp">, expiresInDays = 7): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Validates HMAC-SHA256 signature and expiration on an auth token
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, originalSignature] = parts;

  // 1. Verify HMAC-SHA256 Signature
  const expectedSignature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const origBuf = Buffer.from(originalSignature);
  const expBuf = Buffer.from(expectedSignature);

  if (origBuf.length !== expBuf.length || !crypto.timingSafeEqual(origBuf, expBuf)) {
    return null;
  }

  // 2. Decode and check expiration
  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload: AuthTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns cookie options for secure session persistence
 */
export function getAuthCookieOptions() {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}
