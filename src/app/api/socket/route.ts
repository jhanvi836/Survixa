import { NextResponse } from "next/server";

export async function GET() {
  const isSocketActive = typeof (global as any).survixaSocket !== "undefined";
  return NextResponse.json({
    status: "online",
    gateway: "Survixa Unified Disaster Engine",
    socketActive: isSocketActive,
    timestamp: new Date().toISOString(),
  });
}
