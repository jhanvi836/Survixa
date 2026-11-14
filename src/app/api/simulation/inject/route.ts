import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triageEmergencyReport } from "@/services/aiTriage";
import { broadcastVerifiedIncident, broadcastStatusChange } from "@/server/socket";
import { IncidentStatus, IncidentCategory } from "@prisma/client";

import { SIMULATION_TAG, SIMULATED_REPORTS } from "@/lib/simulation-data";

/**
 * POST /api/simulation/inject
 * Injects 10 realistic disaster reports simultaneously/sequentially to demonstrate:
 * 1. AI Noise / Spam Filtering
 * 2. Geospatial Haversine Deduplication (3 reports -> 1 Master Ticket with duplicateCount = 2)
 * 3. Life-Threat Urgency Ranking (Severity 10 at top of queue)
 */
export async function POST(req: NextRequest) {
  try {
    const results: any[] = [];
    let quarantinedSpam = 0;
    let duplicatesMerged = 0;
    let masterCreated = 0;

    // Process reports sequentially to guarantee Master Incident exists before duplicates check 250m radius
    for (const report of SIMULATED_REPORTS) {
      // 1. Fetch current active master incidents for the 250m Haversine deduplication check
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

      // 2. Trigger AI Triage Engine
      const triage = await triageEmergencyReport({
        rawContent: report.rawContent,
        latitude: report.latitude,
        longitude: report.longitude,
        existingActiveIncidents: activeIncidents as any,
      });

      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const trackingCode = `SIM-${randomHex}`;

      // A. SPAM / NOISE QUARANTINE
      if (triage.quarantined || triage.isSpam) {
        quarantinedSpam++;
        const quarantinedIncident = await prisma.incident.create({
          data: {
            trackingCode,
            originalLanguage: triage.originalLanguage,
            rawContent: report.rawContent,
            translatedText: triage.translatedText,
            latitude: report.latitude,
            longitude: report.longitude,
            locationName: report.locationName,
            city: report.city,
            district: report.district,
            severityScore: 1,
            credibilityScore: triage.credibilityScore,
            duplicateCount: 0,
            status: IncidentStatus.RECEIVED,
            category: triage.hazardType as any,
            aiSummary: triage.aiSummary,
            hazardsIdentified: ["QUARANTINED_NOISE", ...(triage.quarantineReason ? [triage.quarantineReason] : [])],
            estimatedVictims: 0,
            reporterName: `[SIMULATED SPAM] ${report.reporterName}`,
            reporterPhone: report.reporterPhone,
            statusLogs: {
              create: {
                status: IncidentStatus.RECEIVED,
                message: "Quarantined by automated AI spam & noise filter.",
                internalNotes: `QUARANTINED AS NOISE: ${triage.quarantineReason}`,
                visibility: "INTERNAL_CONFIDENTIAL",
              },
            },
          },
        });

        results.push({
          simId: report.simId,
          type: "QUARANTINED_SPAM",
          trackingCode,
          credibilityScore: triage.credibilityScore,
          quarantineReason: triage.quarantineReason,
          category: triage.hazardType,
          originalLanguage: triage.originalLanguage,
        });
        continue;
      }

      // B. GEOSPATIAL DEDUPLICATION (MATCH WITHIN 250 METERS)
      if (triage.isDuplicate && triage.duplicateOfId) {
        duplicatesMerged++;
        const master = activeIncidents.find((i: any) => i.id === triage.duplicateOfId);

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
            dispatches: { include: { rescueUnit: true } },
            statusLogs: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        });

        // Create child record linked to Master ticket
        const childRecord = await prisma.incident.create({
          data: {
            trackingCode,
            originalLanguage: triage.originalLanguage,
            rawContent: report.rawContent,
            translatedText: triage.translatedText,
            latitude: report.latitude,
            longitude: report.longitude,
            locationName: report.locationName,
            city: report.city,
            district: report.district,
            severityScore: triage.severityScore,
            credibilityScore: triage.credibilityScore,
            duplicateCount: 0,
            parentIncidentId: triage.duplicateOfId,
            status: updatedMaster.status,
            category: triage.hazardType as any,
            aiSummary: triage.aiSummary,
            hazardsIdentified: triage.hazardsIdentified,
            estimatedVictims: triage.estimatedVictims,
            reporterName: `[SIMULATED DUPE] ${report.reporterName}`,
            reporterPhone: report.reporterPhone,
          },
        });

        const newStatusLog = await prisma.statusUpdateLog.create({
          data: {
            incidentId: updatedMaster.id,
            status: updatedMaster.status,
            message: `Corroborating citizen distress report received within 250m in ${triage.originalLanguage.toUpperCase()}.`,
            internalNotes: `Duplicate [${trackingCode}] merged via Haversine 250m rule. Translation: "${triage.translatedText}". Needs: ${triage.immediateNeeds.join(", ")}.`,
            visibility: "PUBLIC",
          },
        });

        broadcastStatusChange({
          incidentId: updatedMaster.id,
          trackingCode: updatedMaster.trackingCode,
          status: updatedMaster.status,
          updateLog: newStatusLog,
          assignedUnits: updatedMaster.dispatches?.map((d: any) => d.rescueUnit) || [],
          incident: updatedMaster,
        });

        results.push({
          simId: report.simId,
          type: "DUPLICATE_MERGED",
          trackingCode,
          mergedWithMasterId: triage.duplicateOfId,
          masterTrackingCode: master?.trackingCode,
          originalLanguage: triage.originalLanguage,
          duplicateCountNow: (master?.duplicateCount ?? 0) + 1,
        });
        continue;
      }

      // C. NEW MASTER EMERGENCY TICKET
      masterCreated++;
      const createdMaster = await prisma.incident.create({
        data: {
          trackingCode,
          originalLanguage: triage.originalLanguage,
          rawContent: report.rawContent,
          translatedText: triage.translatedText,
          latitude: report.latitude,
          longitude: report.longitude,
          locationName: report.locationName,
          city: report.city,
          district: report.district,
          severityScore: triage.severityScore,
          credibilityScore: triage.credibilityScore,
          duplicateCount: 0,
          status: IncidentStatus.VERIFIED,
          category: triage.hazardType as any,
          aiSummary: triage.aiSummary,
          hazardsIdentified: triage.hazardsIdentified,
          estimatedVictims: triage.estimatedVictims,
          reporterName: `[SIMULATED] ${report.reporterName}`,
          reporterPhone: report.reporterPhone,
          statusLogs: {
            create: {
              status: IncidentStatus.VERIFIED,
              message: "Emergency report ingested and verified by AI Triage Engine.",
              internalNotes: `AI Summary: ${triage.aiSummary}. Immediate Needs: ${triage.immediateNeeds.join(", ")}.`,
              visibility: "PUBLIC",
            },
          },
        },
        include: {
          dispatches: { include: { rescueUnit: true } },
          statusLogs: true,
        },
      });

      broadcastVerifiedIncident(createdMaster);

      results.push({
        simId: report.simId,
        type: "MASTER_CREATED",
        id: createdMaster.id,
        trackingCode: createdMaster.trackingCode,
        category: createdMaster.category,
        severityScore: createdMaster.severityScore,
        credibilityScore: createdMaster.credibilityScore,
        originalLanguage: triage.originalLanguage,
        translatedText: triage.translatedText,
        aiSummary: triage.aiSummary,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalInjected: SIMULATED_REPORTS.length,
        masterCreated,
        duplicatesMerged,
        quarantinedSpam,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [API /api/simulation/inject POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to inject simulation reports" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/simulation/inject
 * Purges all simulated reports (district = SIMULATION_RUN) so presenters can run tests again cleanly.
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Delete all child duplicate incidents from simulation
    await prisma.incident.deleteMany({
      where: {
        district: SIMULATION_TAG,
        parentIncidentId: { not: null },
      },
    });

    // 2. Delete all master / quarantined simulation incidents
    const deleteRes = await prisma.incident.deleteMany({
      where: {
        district: SIMULATION_TAG,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deleteRes.count} simulation incidents.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [API /api/simulation/inject DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to purge simulation incidents" },
      { status: 500 }
    );
  }
}
