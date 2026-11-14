import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgencyType, UnitStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agency = searchParams.get("agency");
    const availability = searchParams.get("availability");

    const where: any = {};
    if (agency) where.agencyType = agency as AgencyType;
    if (availability) where.availability = availability as UnitStatus;

    const units = await prisma.rescueUnit.findMany({
      where,
      include: {
        dispatches: {
          include: {
            incident: {
              select: {
                id: true,
                trackingCode: true,
                category: true,
                severityScore: true,
                locationName: true,
              },
            },
          },
        },
      },
      orderBy: { callsign: "asc" },
    });

    return NextResponse.json({ success: true, count: units.length, units });
  } catch (error: any) {
    console.error("API /api/units error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callsign,
      agencyType,
      department,
      latitude,
      longitude,
      capabilities = [],
      contactChannel,
    } = body;

    const newUnit = await prisma.rescueUnit.create({
      data: {
        callsign,
        agencyType: agencyType as AgencyType,
        department,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        capabilities,
        contactChannel,
      },
    });

    return NextResponse.json({ success: true, unit: newUnit });
  } catch (error: any) {
    console.error("API /api/units POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
