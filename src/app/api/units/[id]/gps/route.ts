import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastUnitGps } from "@/server/socket";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { latitude, longitude, speed, heading, altitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing latitude or longitude" },
        { status: 400 }
      );
    }

    const updatedUnit = await prisma.rescueUnit.update({
      where: { id },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed !== undefined ? parseFloat(speed) : null,
        heading: heading !== undefined ? parseFloat(heading) : null,
        altitude: altitude !== undefined ? parseFloat(altitude) : null,
        lastGpsUpdate: new Date(),
      },
    });

    broadcastUnitGps({
      unitId: id,
      latitude: updatedUnit.latitude,
      longitude: updatedUnit.longitude,
      speed: updatedUnit.speed || undefined,
      heading: updatedUnit.heading || undefined,
    });

    return NextResponse.json({ success: true, unit: updatedUnit });
  } catch (error: any) {
    console.error("API /api/units/[id]/gps error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
