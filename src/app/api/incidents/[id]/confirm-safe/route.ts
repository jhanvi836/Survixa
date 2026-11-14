import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastStatusChange, getSocketServer } from "@/server/socket";
import { IncidentStatus, UpdateVisibility } from "@prisma/client";

/**
 * POST /api/incidents/:id/confirm-safe
 * Closed-Loop Citizen Confirmation:
 * Citizen clicks "Confirm I Am Safe" once responders mark the crisis RESOLVED.
 * Updates the incident status log and broadcasts real-time reassurance to Command Center.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing incident identifier" },
        { status: 400 }
      );
    }

    const identifier = id.trim();

    // Find incident by UUID or trackingCode
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
            rescueUnit: true,
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: `Incident not found: ${identifier}` },
        { status: 404 }
      );
    }

    // Ensure status is RESOLVED
    const updatedIncident = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: incident.resolvedAt || new Date(),
        updatedAt: new Date(),
      },
    });

    // Record citizen closed-loop confirmation log
    const confirmationLog = await prisma.statusUpdateLog.create({
      data: {
        incidentId: incident.id,
        status: IncidentStatus.RESOLVED,
        message: "Citizen confirmed: 'I am safe'. Closed-loop distress verification successfully completed.",
        internalNotes: "Citizen verified safety directly through citizen tracker portal. Multi-agency feedback loop closed.",
        visibility: UpdateVisibility.PUBLIC,
        operatorId: "CITIZEN_CONFIRMED",
      },
    });

    const assignedUnits = incident.dispatches
      .map((d: any) => d.rescueUnit)
      .filter(Boolean);

    // Broadcast status change & safe confirmation to incident room and command center
    broadcastStatusChange({
      incidentId: incident.id,
      trackingCode: incident.trackingCode,
      status: IncidentStatus.RESOLVED,
      updateLog: confirmationLog,
      assignedUnits,
      incident: updatedIncident,
    });

    const io = getSocketServer();
    if (io) {
      const payload = {
        incidentId: incident.id,
        trackingCode: incident.trackingCode,
        confirmedAt: new Date().toISOString(),
        message: "Citizen confirmed they are safe.",
      };
      io.to(`incident_${incident.id}`).emit("citizen:confirmed_safe" as any, payload);
      io.to(`incident_${incident.trackingCode}`).emit("citizen:confirmed_safe" as any, payload);
      io.to("command_center").emit("citizen:confirmed_safe" as any, payload);
    }

    return NextResponse.json({
      success: true,
      message: "Safety confirmed. Closed-loop distress verification complete.",
      incident: updatedIncident,
      statusLog: confirmationLog,
      confirmedAt: confirmationLog.createdAt,
    });
  } catch (error: any) {
    console.error("❌ [API /api/incidents/:id/confirm-safe POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm safety" },
      { status: 500 }
    );
  }
}
