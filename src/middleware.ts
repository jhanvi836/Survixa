import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "survixa_auth_token";
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  "survixa-disaster-response-secure-jwt-auth-token-key-2026";

/**
 * Web Crypto HMAC-SHA256 signature verification (100% Edge & Node runtime compatible)
 */
async function verifyAuthTokenInMiddleware(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    // Convert secret string to CryptoKey
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert base64url signature to Uint8Array
    const base64Sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    const padSig = base64Sig.padEnd(base64Sig.length + ((4 - (base64Sig.length % 4)) % 4), "=");
    const binSig = Uint8Array.from(atob(padSig), (c) => c.charCodeAt(0));
    const data = enc.encode(`${header}.${payload}`);

    const isValid = await crypto.subtle.verify("HMAC", key, binSig, data);
    if (!isValid) return null;

    // Decode Payload
    const base64Payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padPayload = base64Payload.padEnd(base64Payload.length + ((4 - (base64Payload.length % 4)) % 4), "=");
    const decodedStr = atob(padPayload);
    const decoded = JSON.parse(decodedStr);

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return null; // Expired token
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isCommandRoute = pathname.startsWith("/command");
  const isLoginRoute = pathname === "/login";

  // Verify token if present
  const user = token ? await verifyAuthTokenInMiddleware(token) : null;

  // 1. Protect Command Center Routes (/command, /command/*)
  if (isCommandRoute) {
    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "session_required");
      return NextResponse.redirect(loginUrl);
    }

    // Role check: Only COMMANDER, DISPATCHER, and ADMIN can access Command Center
    const isAuthorizedRole =
      user.role === "COMMANDER" ||
      user.role === "DISPATCHER" ||
      user.role === "ADMIN";

    if (!isAuthorizedRole) {
      // Citizen trying to access Commander Cop
      const reportUrl = new URL("/report", req.url);
      reportUrl.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(reportUrl);
    }
  }

  // 2. Redirect logged-in users away from /login
  if (isLoginRoute && user) {
    const isCommander =
      user.role === "COMMANDER" ||
      user.role === "DISPATCHER" ||
      user.role === "ADMIN";

    const targetUrl = new URL(isCommander ? "/command" : "/report", req.url);
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/command/:path*",
    "/login",
  ],
};
