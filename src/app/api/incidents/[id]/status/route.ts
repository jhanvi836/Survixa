import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastStatusChange } from "@/server/socket";
import { IncidentStatus, UnitStatus, AgencyType, UpdateVisibility } from "@prisma/client";

/**
 * Handle incident status update & rescue unit team assignment
 */
async function handleStatusUpdate(req: NextRequest, id: string) {
  try {
    const body = await req.json();

    const {
      status, // Target IncidentStatus (RECEIVED, VERIFIED, ASSIGNED, EN_ROUTE, RESOLVED)
      message, // Citizen-facing progress message (powering the feedback loop)
      internalNotes, // Confidential tactical command intelligence
      rescueUnitIds = [], // Array of RescueUnit IDs to assign (breaking silos across Fire, EMS, Police, NGO)
      unitId, // single unit fallback
      assignedRoles = {}, // Optional role mapping: { [unitId]: "Lead Water Rescue" }
      sourceAgency, // Agency issuing the update
      operatorId = "COMMAND_DISPATCHER",
    } = body;

    // Collect all unit IDs to dispatch
    const unitsToDispatch: string[] = Array.isArray(rescueUnitIds) ? [...rescueUnitIds] : [];
    if (unitId && !unitsToDispatch.includes(unitId)) {
      unitsToDispatch.push(unitId);
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'status'" },
        { status: 400 }
      );
    }

    // Validate status value against Prisma enum
    if (!Object.values(IncidentStatus).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status '${status}'. Must be one of: ${Object.values(IncidentStatus).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 1. Verify Incident exists (by ID or trackingCode)
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
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: `Incident not found for identifier: ${id}` },
        { status: 404 }
      );
    }

    // Auto-generate citizen-friendly message if not provided
    const citizenMessage =
      message && message.trim()
        ? message.trim()
        : generateDefaultCitizenMessage(status, incident.category);

    // 2. Update Incident status and resolution timestamp
    const updatedIncident = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: status as IncidentStatus,
        resolvedAt: status === IncidentStatus.RESOLVED ? new Date() : incident.resolvedAt,
        updatedAt: new Date(),
      },
    });

    // 3. Handle Multi-Agency Rescue Unit Team Assignments (Breaking Silos)
    if (unitsToDispatch.length > 0) {
      for (const targetUnitId of unitsToDispatch) {
        const assignedRole = assignedRoles[targetUnitId] || "Joint Task Force Deployment";

        // Upsert assignment join record
        await prisma.unitDispatch.upsert({
          where: {
            uniq_incident_unit_assignment: {
              incidentId: incident.id,
              rescueUnitId: targetUnitId,
            },
          },
          update: {
            assignedRole,
            dispatchedAt: new Date(),
          },
          create: {
            incidentId: incident.id,
            rescueUnitId: targetUnitId,
            assignedRole,
            dispatchedAt: new Date(),
          },
        });

        // Update unit readiness status in database
        let newUnitStatus: UnitStatus = UnitStatus.DISPATCHED;
        if (status === IncidentStatus.EN_ROUTE) {
          newUnitStatus = UnitStatus.DISPATCHED;
        } else if (status === IncidentStatus.RESOLVED) {
          newUnitStatus = UnitStatus.AVAILABLE;
        } else if (status === IncidentStatus.ASSIGNED) {
          newUnitStatus = UnitStatus.DISPATCHED;
        }

        await prisma.rescueUnit.update({
          where: { id: targetUnitId },
          data: {
            availability: newUnitStatus,
          },
        });
      }
    }

    // 4. Create the Citizen Feedback Loop Audit Log Entry
    const primaryUnitId = unitsToDispatch.length > 0 ? unitsToDispatch[0] : null;

    const newStatusLog = await prisma.statusUpdateLog.create({
      data: {
        incidentId: incident.id,
        rescueUnitId: primaryUnitId,
        status: status as IncidentStatus,
        message: citizenMessage,
        internalNotes: internalNotes || null,
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: sourceAgency && Object.values(AgencyType).includes(sourceAgency) ? (sourceAgency as AgencyType) : null,
        operatorId,
      },
      include: {
        rescueUnit: {
          select: {
            callsign: true,
            agencyType: true,
            department: true,
          },
        },
      },
    });

    // 5. Query active assigned units for real-time telemetry stream
    const assignedUnits = await prisma.rescueUnit.findMany({
      where: {
        dispatches: {
          some: {
            incidentId: incident.id,
          },
        },
      },
      select: {
        id: true,
        callsign: true,
        agencyType: true,
        department: true,
        latitude: true,
        longitude: true,
        availability: true,
        capabilities: true,
      },
    });

    // 6. Broadcast immediately to specific 'incident_<id>' room and 'command_center'
    broadcastStatusChange({
      incidentId: incident.id,
      trackingCode: incident.trackingCode,
      status: status as IncidentStatus,
      updateLog: newStatusLog,
      assignedUnits,
      incident: updatedIncident,
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status} and broadcast to room 'incident_${incident.id}'.`,
      incidentId: incident.id,
      trackingCode: incident.trackingCode,
      status: updatedIncident.status,
      assignedUnits,
      statusLog: newStatusLog,
    });
  } catch (error: any) {
    console.error("❌ [API /api/incidents/:id/status] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update incident status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/incidents/:id/status
 * Core endpoint required for updating status and assigning teams.
 * Works seamlessly with both Next.js 14 and Next.js 15 route context param types.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleStatusUpdate(req, id);
}

/**
 * POST /api/incidents/:id/status
 * Provided for HTTP client compatibility
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleStatusUpdate(req, id);
}

function generateDefaultCitizenMessage(status: string, category: string): string {
  switch (status) {
    case "RECEIVED":
      return "Your emergency distress signal has been received and prioritized by Survixa AI.";
    case "VERIFIED":
      return `Emergency report confirmed by Joint Command. First responders in your sector are being assembled.`;
    case "ASSIGNED":
      return `Multi-agency response teams have been allocated to your location. Units are staging for deployment.`;
    case "EN_ROUTE":
      return `Emergency units are actively en route to your coordinates with live sirens. Please remain calm and in a secure position.`;
    case "RESOLVED":
      return `Emergency operation has been completed and verified safe by on-scene commanders.`;
    default:
      return "Status update received from Joint Disaster Command.";
  }
}
