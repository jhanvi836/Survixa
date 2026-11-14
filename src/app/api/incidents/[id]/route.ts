import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const incident = await prisma.incident.findFirst({
      where: {
        OR: [
          { id: id },
          { trackingCode: id.toUpperCase() },
        ],
      },
      include: {
        dispatches: {
          include: {
            rescueUnit: true,
          },
        },
        statusLogs: {
          orderBy: { createdAt: "asc" }, // chronological order for citizen timeline
          include: {
            rescueUnit: {
              select: {
                callsign: true,
                agencyType: true,
                department: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    console.error("API /api/incidents/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
