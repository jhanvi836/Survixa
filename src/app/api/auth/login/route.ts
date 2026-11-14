import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signAuthToken,
  verifyPassword,
  getAuthCookieOptions,
  DEMO_ACCOUNTS,
} from "@/lib/auth";
import { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, expectedRole } = body;

    // 1. Validate Input
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Query User from Database or Demo Store
    let userRecord: any = null;
    let storedPasswordHash = "";

    try {
      if (prisma && prisma.user) {
        userRecord = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });
        if (userRecord) {
          storedPasswordHash = userRecord.passwordHash;
        }
      }
    } catch (dbErr) {
      console.warn("⚠️ [Auth API] Database user query fell back to demo accounts store:", dbErr);
    }

    // Fallback to built-in verified demo accounts if user not found in DB
    if (!userRecord) {
      const demoMatch = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === cleanEmail
      );
      if (demoMatch) {
        userRecord = {
          id: demoMatch.id,
          email: demoMatch.email,
          name: demoMatch.name,
          role: demoMatch.role,
          agency: demoMatch.agency,
          badgeNumber: demoMatch.badgeNumber,
          phone: demoMatch.phone,
        };
        storedPasswordHash = demoMatch.plainPassword;
      }
    }

    if (!userRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials. Account not found." },
        { status: 401 }
      );
    }

    // 3. Verify Password
    const passwordValid = await verifyPassword(password, storedPasswordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials. Password incorrect." },
        { status: 401 }
      );
    }

    // 4. Role Authorization Check (if role selection tab is active)
    if (expectedRole) {
      const isCommanderTier =
        userRecord.role === "COMMANDER" ||
        userRecord.role === "DISPATCHER" ||
        userRecord.role === "ADMIN";

      if (expectedRole === "COMMANDER" && !isCommanderTier) {
        return NextResponse.json(
          {
            success: false,
            error: "Access Denied: This account does not possess Emergency Commander or First Responder credentials.",
          },
          { status: 403 }
        );
      }

      if (expectedRole === "CITIZEN" && isCommanderTier) {
        // Commanders can log in under citizen tab, but we'll guide them appropriately
      }
    }

    // 5. Generate Secure Signed Token
    const token = signAuthToken({
      userId: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role as UserRole,
      agency: userRecord.agency,
      badgeNumber: userRecord.badgeNumber,
    });

    // Determine Role-Based Destination
    const isCommander =
      userRecord.role === "COMMANDER" ||
      userRecord.role === "DISPATCHER" ||
      userRecord.role === "ADMIN";

    const redirectTo = isCommander ? "/command" : "/report";

    // 6. Set Secure HTTP-Only Cookie
    const cookieOpts = getAuthCookieOptions();
    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${userRecord.name}. Authentication successful.`,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        agency: userRecord.agency,
        badgeNumber: userRecord.badgeNumber,
      },
      redirectTo,
    });

    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (error: any) {
    console.error("❌ [API /api/auth/login] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: "Internal authentication error: " + error.message },
      { status: 500 }
    );
  }
}
