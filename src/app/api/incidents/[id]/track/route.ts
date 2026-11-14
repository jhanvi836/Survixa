import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateVisibility } from "@prisma/client";

/**
 * GET /api/incidents/:id/track
 * Public citizen tracking endpoint.
 *
 * Resolves by incident UUID or trackingCode (e.g. 'SVX-FL-9021').
 * Returns public-safe real-time status, chronological feedback audit log,
 * assigned multi-agency responder assets, and the Socket.io room identifier.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing incident identifier or tracking code" },
        { status: 400 }
      );
    }

    const identifier = id.trim();

    // Query incident by UUID or by unique trackingCode (case-insensitive for user ease)
    const incident = await prisma.incident.findFirst({
      where: {
        OR: [
          { id: identifier },
          { trackingCode: identifier.toUpperCase() },
        ],
      },
      include: {
        dispatches: {
          include: {
            rescueUnit: {
              select: {
                id: true,
                callsign: true,
                agencyType: true,
                department: true,
                latitude: true,
                longitude: true,
                availability: true,
                capabilities: true,
                lastGpsUpdate: true,
              },
            },
          },
        },
        statusLogs: {
          where: {
            visibility: UpdateVisibility.PUBLIC, // Privacy: filter out internal command notes
          },
          orderBy: { createdAt: "asc" }, // Chronological timeline for citizen view
          include: {
            rescueUnit: {
              select: {
                callsign: true,
                agencyType: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        {
          success: false,
          error: `No emergency incident found with code or ID: '${identifier}'`,
        },
        { status: 404 }
      );
    }

    // Compute progress percentage across the 5 lifecycle stages
    const progressMap: Record<string, number> = {
      RECEIVED: 20,
      VERIFIED: 40,
      ASSIGNED: 60,
      EN_ROUTE: 80,
      RESOLVED: 100,
    };
    const progressPercentage = progressMap[incident.status] || 20;

    // Collect public assigned unit telemetry
    const assignedUnits = incident.dispatches
      .map((d: any) => d.rescueUnit)
      .filter(Boolean)
      .map((unit: any) => ({
        callsign: unit.callsign,
        agencyType: unit.agencyType,
        department: unit.department,
        latitude: unit.latitude,
        longitude: unit.longitude,
        availability: unit.availability,
        capabilities: unit.capabilities,
        lastGpsUpdate: unit.lastGpsUpdate,
      }));

    // Public-sanitized incident record (omits reporter phone / internal metrics)
    const publicIncident = {
      id: incident.id,
      trackingCode: incident.trackingCode,
      status: incident.status,
      category: incident.category,
      originalLanguage: incident.originalLanguage,
      rawContent: incident.rawContent,
      translatedText: incident.translatedText,
      locationName: incident.locationName,
      latitude: incident.latitude,
      longitude: incident.longitude,
      city: incident.city,
      severityScore: incident.severityScore,
      credibilityScore: incident.credibilityScore,
      duplicateCount: incident.duplicateCount,
      aiSummary: incident.aiSummary,
      hazardsIdentified: incident.hazardsIdentified,
      mediaUrls: incident.mediaUrls,
      progressPercentage,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt,
    };

    return NextResponse.json({
      success: true,
      incident: publicIncident,
      statusLogs: incident.statusLogs.map((log: any) => ({
        id: log.id,
        status: log.status,
        message: log.message,
        sourceAgency: log.sourceAgency,
        responderCallsign: log.rescueUnit?.callsign || null,
        createdAt: log.createdAt,
      })),
      assignedUnits,
      realtime: {
        socketPath: "/socket.io",
        socketRoom: `incident_${incident.id}`,
        trackingRoom: `incident_${incident.trackingCode}`,
        instructions: `Connect to Socket.io and emit 'join:incident' with '${incident.id}' or 'join:citizen_tracker' with '${incident.trackingCode}'. Listen on event 'status_change'.`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [API /api/incidents/:id/track GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve tracking data" },
      { status: 500 }
    );
  }
}
