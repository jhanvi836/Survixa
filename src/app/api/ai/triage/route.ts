import { NextRequest, NextResponse } from "next/server";
import { triageEmergencyReport } from "@/services/aiTriage";
import { prisma } from "@/lib/prisma";
import { IncidentStatus } from "@prisma/client";

/**
 * GET /api/ai/triage
 * Real-time AI Engine Diagnostics & Status
 */
export async function GET() {
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.AI_API_KEY ||
    "";

  const maskedKey = apiKey
    ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
    : null;

  return NextResponse.json({
    success: true,
    engine: "Google Gemini 3.5 Flash (Interactions v1beta)",
    status: apiKey ? "ACTIVE_CONNECTED" : "OFFLINE_FALLBACK_ACTIVE",
    provider: "gemini",
    model: "models/gemini-3.5-flash",
    hasApiKey: !!apiKey,
    maskedKey,
    features: {
      multimodalVision: true,
      multilingualTranslation: true,
      urgencyScoring: "1-10 Life Threat Weighted",
      spamQuarantine: "0-100 Credibility Filter",
      geospatialDeduplication: "250m Haversine Radius",
      crossAgencyRecommendation: ["FIRE", "MEDICAL", "POLICE", "NGO"],
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/ai/triage
 * Direct AI Triage Ingestion endpoint for text and multimodal reports
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawContent, latitude, longitude, mediaUrls } = body;

    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'rawContent'" },
        { status: 400 }
      );
    }

    const lat = latitude !== undefined ? parseFloat(latitude) : 37.7749;
    const lng = longitude !== undefined ? parseFloat(longitude) : -122.4194;

    // Optional active incidents for deduplication check
    let activeIncidents: any[] = [];
    try {
      activeIncidents = await prisma.incident.findMany({
        where: {
          status: {
            in: [
              IncidentStatus.RECEIVED,
              IncidentStatus.VERIFIED,
              IncidentStatus.ASSIGNED,
              IncidentStatus.EN_ROUTE,
            ],
          },
          parentIncidentId: null,
        },
        select: {
          id: true,
          trackingCode: true,
          latitude: true,
          longitude: true,
          category: true,
          severityScore: true,
          duplicateCount: true,
          createdAt: true,
        },
        take: 50,
      });
    } catch {
      // If DB is offline, continue with standalone AI triage
      activeIncidents = [];
    }

    const result = await triageEmergencyReport({
      rawContent,
      latitude: lat,
      longitude: lng,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : undefined,
      existingActiveIncidents: activeIncidents as any,
    });

    return NextResponse.json({
      success: true,
      engine: result.engineProvider || "Google Gemini 3.5 Flash",
      model: result.modelUsed || "models/gemini-3.5-flash",
      latencyMs: result.latencyMs,
      triage: result,
    });
  } catch (error: any) {
    console.error("API /api/ai/triage error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "AI Triage execution failed" },
      { status: 500 }
    );
  }
}
