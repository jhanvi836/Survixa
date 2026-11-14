import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triageEmergencyReport } from "@/services/aiTriage";
import { broadcastVerifiedIncident, broadcastStatusChange } from "@/server/socket";
import { IncidentStatus, IncidentCategory } from "@prisma/client";

/**
 * GET /api/incidents
 * Fetch sorted active emergency incidents for command center common operating picture.
 * Automatically excludes quarantined spam/noise so dispatchers never see noise.
 *
 * Query Params:
 * - status: 'ACTIVE' (default: RECEIVED, VERIFIED, ASSIGNED, EN_ROUTE), 'ALL', or specific IncidentStatus
 * - category: filter by IncidentCategory (e.g. FIRE, FLOOD, STRUCTURAL_COLLAPSE)
 * - agency: filter by assigned agency (FIRE, MEDICAL, POLICE, NGO)
 * - minSeverity: filter by minimum severity score (1-10)
 * - includeQuarantined: 'true' to include flagged spam/noise
 *
 * Sorting:
 * 1. severityScore: DESC (urgency 10 to 1)
 * 2. credibilityScore: DESC
 * 3. createdAt: DESC
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ACTIVE";
    const categoryParam = searchParams.get("category");
    const agencyParam = searchParams.get("agency");
    const minSeverityParam = searchParams.get("minSeverity");
    const includeQuarantined = searchParams.get("includeQuarantined") === "true";

    const where: any = {};

    // 1. Fake & Spam Quarantine: Filter out quarantined reports by default
    if (!includeQuarantined) {
      where.NOT = {
        hazardsIdentified: {
          has: "QUARANTINED_NOISE",
        },
      };
      where.credibilityScore = {
        gte: 25, // Credibility threshold (0 to 100)
      };
    }

    // 2. Filter by lifecycle state: default to active crisis pipeline
    if (statusParam === "ACTIVE") {
      where.status = {
        in: [
          IncidentStatus.RECEIVED,
          IncidentStatus.VERIFIED,
          IncidentStatus.ASSIGNED,
          IncidentStatus.EN_ROUTE,
        ],
      };
      // Only display master tickets (merged duplicates are nested under master)
      where.parentIncidentId = null;
    } else if (statusParam !== "ALL") {
      where.status = statusParam as IncidentStatus;
    }

    // 3. Filter by incident classification
    if (categoryParam && categoryParam !== "ALL") {
      where.category = categoryParam as IncidentCategory;
    }

    // 4. Filter by minimum severity threshold
    if (minSeverityParam) {
      const minSev = parseInt(minSeverityParam, 10);
      if (!isNaN(minSev)) {
        where.severityScore = { gte: minSev };
      }
    }

    // 5. Filter by assigned agency type
    if (agencyParam && agencyParam !== "ALL") {
      where.dispatches = {
        some: {
          rescueUnit: {
            agencyType: agencyParam as any,
          },
        },
      };
    }

    const incidents = await prisma.incident.findMany({
      where,
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
                contactChannel: true,
              },
            },
          },
        },
        statusLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        clusteredReports: {
          select: {
            id: true,
            trackingCode: true,
            originalLanguage: true,
            rawContent: true,
            translatedText: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { severityScore: "desc" },     // 1. Urgency: Life threats prioritized over submission time
        { credibilityScore: "desc" }, // 2. High credibility corroborated reports
        { createdAt: "desc" },        // 3. Chronological recency
      ],
    });

    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [API /api/incidents GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incidents
 * Ingest new citizen emergency report, automatically trigger AI Triage Engine:
 * 1. Translate & Structure (Language detection, English translation, hazard extraction)
 * 2. Fake & Spam Filter (Score credibility 0-100, quarantine noise from command room)
 * 3. Geospatial Deduplication (Haversine 250m check, merge into Master Incident)
 * 4. Urgency Ranking (severityScore 1-10 life-threat prioritization)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      rawContent,
      description,
      latitude,
      longitude,
      locationName,
      city,
      district,
      reporterName,
      reporterPhone,
      mediaUrls = [],
    } = body;

    const reportText = rawContent || description;

    if (!reportText || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: 'rawContent' (or 'description'), 'latitude', and 'longitude'",
        },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: "Latitude and Longitude must be valid numbers" },
        { status: 400 }
      );
    }

    // 1. Fetch active master incidents in the crisis pipeline for 250m geospatial check
    const activeIncidents = await prisma.incident.findMany({
      where: {
        status: {
          in: [
            IncidentStatus.RECEIVED,
            IncidentStatus.VERIFIED,
            IncidentStatus.ASSIGNED,
            IncidentStatus.EN_ROUTE,
          ],
        },
        parentIncidentId: null, // Only compare against master incidents
      },
      select: {
        id: true,
        trackingCode: true,
        latitude: true,
        longitude: true,
        category: true,
        severityScore: true,
        duplicateCount: true,
        credibilityScore: true,
        hazardsIdentified: true,
        estimatedVictims: true,
        createdAt: true,
      },
      take: 100,
    });

    // 2. Trigger AI Triage Engine (LLM API with rule-based fallback)
    const triage = await triageEmergencyReport({
      rawContent: reportText,
      latitude: lat,
      longitude: lng,
      existingActiveIncidents: activeIncidents as any,
    });

    // Generate unique citizen tracking code: e.g. SVX-7B2F
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const trackingCode = `SVX-${randomHex}`;

    // =========================================================================
    // SCENARIO A: FAKE & SPAM FILTER -> QUARANTINE
    // Dispatchers never see noise (no broadcast to command_center room)
    // =========================================================================
    if (triage.quarantined || triage.isSpam) {
      console.warn(`🛡️ [AI Triage] Quarantined report (${trackingCode}) - Credibility: ${triage.credibilityScore}/100: ${triage.quarantineReason}`);

      const quarantinedIncident = await prisma.incident.create({
        data: {
          trackingCode,
          originalLanguage: triage.originalLanguage,
          rawContent: reportText,
          translatedText: triage.translatedText,
          latitude: lat,
          longitude: lng,
          locationName: locationName || "Unverified Location",
          city: city || null,
          district: district || null,
          severityScore: 1, // lowest priority
          credibilityScore: triage.credibilityScore, // 0 to 100
          duplicateCount: 0,
          status: IncidentStatus.RECEIVED,
          category: triage.hazardType as any,
          aiSummary: triage.aiSummary,
          hazardsIdentified: ["QUARANTINED_NOISE", ...(triage.quarantineReason ? [triage.quarantineReason] : [])],
          estimatedVictims: 0,
          reporterName: reporterName || "Anonymous",
          reporterPhone: reporterPhone || null,
          mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
          statusLogs: {
            create: {
              status: IncidentStatus.RECEIVED,
              message: "Your submission has been received and flagged for automated validation.",
              internalNotes: `QUARANTINED AS NOISE/SPAM: ${triage.quarantineReason}`,
              visibility: "INTERNAL_CONFIDENTIAL",
            },
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          quarantined: true,
          trackingCode: quarantinedIncident.trackingCode,
          message: "Report received. Flagged for verification.",
          credibilityScore: triage.credibilityScore,
        },
        { status: 202 }
      );
    }

    // =========================================================================
    // SCENARIO B: GEOSPATIAL DEDUPLICATION (MATCH WITHIN 250 METERS)
    // Merge into Master Incident, increment duplicateCount, append details,
    // and prevent creating a duplicate ticket on dispatcher desks!
    // =========================================================================
    if (triage.isDuplicate && triage.duplicateOfId) {
      console.log(`🔗 [AI Triage] Merging report into Master Incident: ${triage.duplicateOfId} (within 250m)`);

      const master = activeIncidents.find((i: any) => i.id === triage.duplicateOfId);

      // 1. Increment duplicate count and boost credibility with corroboration
      const updatedCredibility = Math.min(100, (master?.credibilityScore ?? 75) + 5);
      const mergedSeverity = Math.max(master?.severityScore ?? 5, triage.severityScore);
      const mergedVictims = Math.max(master?.estimatedVictims ?? 0, triage.estimatedVictims);
      const mergedHazards = Array.from(
        new Set([...(master?.hazardsIdentified || []), ...triage.hazardsIdentified])
      );

      const updatedMaster = await prisma.incident.update({
        where: { id: triage.duplicateOfId },
        data: {
          duplicateCount: { increment: 1 },
          credibilityScore: updatedCredibility,
          severityScore: mergedSeverity,
          estimatedVictims: mergedVictims,
          hazardsIdentified: mergedHazards,
        },
        include: {
          dispatches: {
            include: {
              rescueUnit: true,
            },
          },
          statusLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      // 2. Append child report record so citizen retains unique tracking code pointing to Master
      const childReport = await prisma.incident.create({
        data: {
          trackingCode,
          originalLanguage: triage.originalLanguage,
          rawContent: reportText,
          translatedText: triage.translatedText,
          latitude: lat,
          longitude: lng,
          locationName: locationName || master?.trackingCode,
          city: city || null,
          district: district || null,
          severityScore: triage.severityScore,
          credibilityScore: triage.credibilityScore,
          duplicateCount: 0,
          parentIncidentId: triage.duplicateOfId, // Linked to Master!
          status: updatedMaster.status,
          category: triage.hazardType as any,
          aiSummary: triage.aiSummary,
          hazardsIdentified: triage.hazardsIdentified,
          estimatedVictims: triage.estimatedVictims,
          reporterName: reporterName || "Corroborating Citizen",
          reporterPhone: reporterPhone || null,
          mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        },
      });

      // 3. Append transparent corroboration log to Master Incident timeline
      const newStatusLog = await prisma.statusUpdateLog.create({
        data: {
          incidentId: updatedMaster.id,
          status: updatedMaster.status,
          message: `Additional citizen corroboration received within 250m. Citizen message: "${triage.translatedText}".`,
          internalNotes: `Duplicate report [${trackingCode}] merged via Haversine 250m rule. Language: ${triage.originalLanguage.toUpperCase()}. Immediate needs: ${triage.immediateNeeds.join(", ")}.`,
          visibility: "PUBLIC",
        },
      });

      // 4. Broadcast live update to Command Center & Citizen room
      broadcastStatusChange({
        incidentId: updatedMaster.id,
        trackingCode: updatedMaster.trackingCode,
        status: updatedMaster.status,
        updateLog: newStatusLog,
        assignedUnits: updatedMaster.dispatches.map((d: any) => d.rescueUnit),
        incident: updatedMaster,
      });

      return NextResponse.json(
        {
          success: true,
          merged: true,
          masterIncidentId: updatedMaster.id,
          masterTrackingCode: updatedMaster.trackingCode,
          trackingCode: childReport.trackingCode,
          socketRoom: `incident_${updatedMaster.id}`,
          message: "Report matched an existing active incident within 250 meters. Merged into Master Incident.",
          duplicateCount: updatedMaster.duplicateCount,
        },
        { status: 200 }
      );
    }

    // =========================================================================
    // SCENARIO C: NEW VERIFIED GROUND-TRUTH INCIDENT
    // Create new Master Incident, log initial feedback, broadcast to command_center
    // =========================================================================
    const initialStatus =
      triage.credibilityScore >= 85 && triage.severityScore >= 8
        ? IncidentStatus.VERIFIED
        : IncidentStatus.RECEIVED;

    const newIncident = await prisma.incident.create({
      data: {
        trackingCode,
        originalLanguage: triage.originalLanguage,
        rawContent: reportText,
        translatedText: triage.translatedText,
        latitude: lat,
        longitude: lng,
        locationName: locationName || `Coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
        city: city || null,
        district: district || null,
        severityScore: triage.severityScore, // 1 to 10 life-threat prioritized
        credibilityScore: triage.credibilityScore, // 0 to 100
        duplicateCount: 0,
        status: initialStatus,
        category: triage.hazardType as any,
        aiSummary: triage.aiSummary,
        hazardsIdentified: triage.hazardsIdentified,
        estimatedVictims: triage.estimatedVictims,
        reporterName: reporterName || "Anonymous Citizen",
        reporterPhone: reporterPhone || null,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        statusLogs: {
          create: {
            status: initialStatus,
            message:
              initialStatus === IncidentStatus.VERIFIED
                ? `Emergency signal verified by Survixa AI. Severity rated ${triage.severityScore}/10. Priority routing to Joint Command.`
                : `Emergency report received in ${triage.originalLanguage.toUpperCase()}. AI Triage completed. Standing by for dispatch allocation.`,
            internalNotes: `AI Triage: Urgency ${triage.severityScore}/10. Credibility: ${triage.credibilityScore}/100. Immediate Needs: ${triage.immediateNeeds.join(", ")}.`,
            visibility: "PUBLIC",
          },
        },
      },
      include: {
        dispatches: {
          include: {
            rescueUnit: true,
          },
        },
        statusLogs: true,
      },
    });

    // Broadcast immediately to the 'command_center' room
    broadcastVerifiedIncident(newIncident);

    return NextResponse.json(
      {
        success: true,
        merged: false,
        incident: newIncident,
        trackingCode: newIncident.trackingCode,
        trackingUrl: `/api/incidents/${newIncident.id}/track`,
        socketRoom: `incident_${newIncident.id}`,
        message: "Distress report registered and broadcast to Joint Command Center.",
        triage: {
          hazardType: triage.hazardType,
          severityScore: triage.severityScore,
          credibilityScore: triage.credibilityScore,
          immediateNeeds: triage.immediateNeeds,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ [API /api/incidents POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create incident report" },
      { status: 500 }
    );
  }
}
