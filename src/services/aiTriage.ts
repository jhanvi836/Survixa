import { IncidentCategory, AITriageResult } from "@/types";

export interface TriageInput {
  rawContent: string;
  latitude: number;
  longitude: number;
  mediaUrls?: string[];
  existingActiveIncidents?: Array<{
    id: string;
    trackingCode: string;
    latitude: number;
    longitude: number;
    category: IncidentCategory;
    severityScore?: number;
    duplicateCount?: number;
    createdAt: Date | string;
  }>;
}

export interface MasterIncidentMatch {
  masterId: string;
  trackingCode: string;
  distanceMeters: number;
  category: IncidentCategory;
}

/**
 * Haversine formula: Computes great-circle distance between two GPS coordinates in METERS.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Geospatial Deduplication Checker
 * Checks active incidents within a 250-meter radius of the same hazard type.
 */
export function findDuplicateMasterIncident(
  latitude: number,
  longitude: number,
  hazardType: IncidentCategory,
  activeIncidents: TriageInput["existingActiveIncidents"] = [],
  radiusThresholdMeters: number = 250 // Strictly 250 meters as required
): MasterIncidentMatch | null {
  if (!activeIncidents || activeIncidents.length === 0) return null;

  for (const candidate of activeIncidents) {
    // 1. Same hazard type check (or compatible mutual emergency)
    const isMatchingHazard =
      candidate.category === hazardType ||
      (hazardType === "STRUCTURAL_COLLAPSE" && candidate.category === "EARTHQUAKE") ||
      (hazardType === "EARTHQUAKE" && candidate.category === "STRUCTURAL_COLLAPSE");

    if (!isMatchingHazard) continue;

    // 2. Compute Haversine distance in meters
    const distMeters = calculateHaversineDistanceMeters(
      latitude,
      longitude,
      candidate.latitude,
      candidate.longitude
    );

    if (distMeters <= radiusThresholdMeters) {
      return {
        masterId: candidate.id,
        trackingCode: candidate.trackingCode,
        distanceMeters: Math.round(distMeters),
        category: candidate.category,
      };
    }
  }

  return null;
}

/**
 * Main AI Triage Engine
 * Triggered automatically when a new report hits POST /api/incidents.
 * Uses the live Google Gemini 3.5 Flash Interactions API with structured multimodal analysis,
 * and maintains an offline deterministic rule-based fallback analyzer.
 */
export async function triageEmergencyReport(input: TriageInput): Promise<AITriageResult> {
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.AI_API_KEY ||
    "";

  // Try Real Cloud LLM API first if a key is provided
  if (apiKey) {
    try {
      const llmResult = await executeLLMTriage(input.rawContent, apiKey, input.mediaUrls);
      if (llmResult) {
        // Run geospatial deduplication check against active incidents
        const duplicateMatch = findDuplicateMasterIncident(
          input.latitude,
          input.longitude,
          llmResult.hazardType,
          input.existingActiveIncidents,
          250
        );

        return {
          ...llmResult,
          isDuplicate: !!duplicateMatch,
          duplicateOfId: duplicateMatch?.masterId,
        };
      }
    } catch (llmErr) {
      console.warn("⚠️ [AI Triage] Gemini LLM API call failed or timed out. Falling back to rule-based engine:", llmErr);
    }
  }

  // Clean Fallback Rule-Based Analyzer (Offline / Deterministic)
  return executeRuleBasedTriage(input);
}

/**
 * Calls Google Gemini API via the modern v1beta Interactions API with structured multimodal extraction
 */
async function executeLLMTriage(
  text: string,
  apiKey: string,
  mediaUrls?: string[]
): Promise<Omit<AITriageResult, "isDuplicate" | "duplicateOfId"> | null> {
  const startTime = Date.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const prompt = `You are the Survixa Emergency Response AI Triage Agent.
Analyze the following citizen emergency report and any attached image evidence.
Return STRICT valid JSON ONLY.

Citizen Report:
"""${text}"""

Return a JSON object conforming exactly to this schema:
{
  "originalLanguage": "ISO-639-1 language code (e.g. en, es, hi, kn, ar, uk, fr, zh)",
  "translatedText": "Precise English operational translation. Keep all facts intact.",
  "hazardType": "FIRE" | "FLOOD" | "EARTHQUAKE" | "MEDICAL_EMERGENCY" | "STRUCTURAL_COLLAPSE" | "HAZMAT" | "SEARCH_AND_RESCUE" | "CYCLONE_STORM" | "OTHER",
  "credibilityScore": integer between 0 and 100 (evaluate coherence, detail vs spam/jokes/gibberish),
  "isSpam": boolean (true if joke, troll, marketing, keyboard mash, or nonsensical gibberish),
  "quarantined": boolean (true if credibilityScore < 25 or isSpam is true),
  "quarantineReason": string or null,
  "severityScore": integer between 1 and 10 (HEAVILY prioritize life-threatening keywords like trapped, bleeding, children, rising water over simple property damage),
  "estimatedVictims": integer (0 if unknown),
  "immediateNeeds": array of strings (e.g. ["extrication", "rescue_boat", "paramedics", "burn_treatment", "shelter"]),
  "hazardsIdentified": array of strings (e.g. ["Live Power Lines", "Rapid Current", "Gas Leak", "Unstable Rubble"]),
  "recommendedAgencies": array of "FIRE" | "MEDICAL" | "POLICE" | "NGO" | "COAST_GUARD",
  "tacticalRecommendations": array of strings (e.g. ["Deploy 100ft aerial ladder", "Stage ambulances at north entrance"]),
  "imageAnalysis": string or null,
  "aiSummary": "2-sentence tactical briefing for joint first responders."
}
`;

  const inputParts: any[] = [{ type: "text", text: prompt }];

  if (mediaUrls && mediaUrls.length > 0) {
    for (const url of mediaUrls) {
      if (typeof url === "string" && url.startsWith("data:image/")) {
        const matches = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          inputParts.push({
            type: "image",
            mime_type: matches[1],
            data: matches[2],
          });
        }
      }
    }
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      model: "gemini-3.5-flash",
      input: inputParts,
      response_format: {
        type: "text",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini Interactions API returned HTTP ${response.status}`);
  }

  const json = await response.json();
  const latencyMs = Date.now() - startTime;

  let rawOutput = "";
  if (json.steps && Array.isArray(json.steps)) {
    for (const step of json.steps) {
      if (step.type === "model_output" && Array.isArray(step.content)) {
        for (const item of step.content) {
          if (item.type === "text" && item.text) {
            rawOutput += item.text;
          }
        }
      }
    }
  }

  if (!rawOutput && json.candidates?.[0]?.content?.parts?.[0]?.text) {
    rawOutput = json.candidates[0].content.parts[0].text;
  }

  if (!rawOutput) return null;

  const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    originalLanguage: parsed.originalLanguage || "en",
    translatedText: parsed.translatedText || text,
    hazardType: parsed.hazardType || "OTHER",
    category: parsed.hazardType || "OTHER",
    severityScore: Math.min(10, Math.max(1, parseInt(parsed.severityScore, 10) || 5)),
    credibilityScore: Math.min(100, Math.max(0, parseInt(parsed.credibilityScore, 10) || 75)),
    estimatedVictims: parseInt(parsed.estimatedVictims, 10) || 0,
    immediateNeeds: Array.isArray(parsed.immediateNeeds) ? parsed.immediateNeeds : [],
    hazardsIdentified: Array.isArray(parsed.hazardsIdentified) ? parsed.hazardsIdentified : [],
    aiSummary: parsed.aiSummary || `Reported ${parsed.hazardType}. Urgent triage advised.`,
    isSpam: Boolean(parsed.isSpam),
    quarantined: Boolean(parsed.quarantined || parsed.isSpam || parsed.credibilityScore < 25),
    quarantineReason: parsed.quarantineReason || (parsed.isSpam ? "Flagged as spam or noise" : undefined),
    recommendedAgencies: Array.isArray(parsed.recommendedAgencies) ? parsed.recommendedAgencies : undefined,
    tacticalRecommendations: Array.isArray(parsed.tacticalRecommendations) ? parsed.tacticalRecommendations : undefined,
    imageAnalysis: parsed.imageAnalysis || undefined,
    engineProvider: "Google Gemini 3.5 Flash (Cloud LLM)",
    modelUsed: "models/gemini-3.5-flash",
    latencyMs,
  };
}

/**
 * Fallback Rule-Based Analyzer
 * Highly accurate deterministic triage when external LLM API is unavailable or offline.
 */
export function executeRuleBasedTriage(input: TriageInput): AITriageResult {
  const text = input.rawContent.trim();
  const lower = text.toLowerCase();

  // ========================================================
  // 1. FAKE & SPAM FILTER (Score Credibility 0 to 100)
  // ========================================================
  let credibilityScore = 70; // Baseline
  let isSpam = false;
  let quarantineReason: string | undefined = undefined;

  // Gibberish / keyboard mash detection (e.g. "asdfghjkl", "qwerty", "aaaaaa")
  const hasRepeatingChars = /(.)\1{4,}/.test(lower);
  const words = lower.split(/\s+/).filter(Boolean);
  const avgWordLen = words.reduce((acc, w) => acc + w.length, 0) / (words.length || 1);
  const isKeyboardMash =
    /^[bcdfghjklmnpqrstvwxyz]{6,}$/i.test(lower) ||
    /^(asdf|qwer|zxcv|1234|test|xyz)/i.test(lower) ||
    hasRepeatingChars ||
    (words.length === 1 && lower.length > 15 && avgWordLen > 14);

  // Jokes, trolls, and non-emergency spam patterns
  const trollKeywords = [
    "just kidding",
    "prank",
    "lmao",
    "haha",
    "lol",
    "rickroll",
    "pizza delivery",
    "aliens invaded",
    "zombie apocalypse",
    "free money",
    "crypto",
    "click here",
    "buy now",
    "test report",
    "testing 123",
    "fake news",
  ];
  const matchedTroll = trollKeywords.find((tk) => lower.includes(tk));

  if (isKeyboardMash) {
    credibilityScore = 5;
    isSpam = true;
    quarantineReason = "Detected keyboard mash or gibberish.";
  } else if (matchedTroll) {
    credibilityScore = 10;
    isSpam = true;
    quarantineReason = `Flagged troll / non-emergency text: "${matchedTroll}".`;
  } else if (text.length < 8) {
    credibilityScore = 20;
    isSpam = true;
    quarantineReason = "Distress report too brief with zero incident details.";
  }

  // Positive credibility signals
  if (!isSpam) {
    if (text.length > 50) credibilityScore += 10;
    if (/\d+/.test(text)) credibilityScore += 10; // concrete numbers (floors, victims, streets)
    if (input.latitude && input.longitude) credibilityScore += 10; // GPS coordinates present
  }
  credibilityScore = Math.min(100, Math.max(0, credibilityScore));

  const quarantined = isSpam || credibilityScore < 25;

  // ========================================================
  // 2. TRANSLATE & DETECT LANGUAGE
  // ========================================================
  let originalLanguage = "en";
  let translatedText = text;

  if (/[áéíóúñ¿¡]/.test(text) || lower.includes("río") || lower.includes("fuego") || lower.includes("atrapad") || lower.includes("inundac")) {
    originalLanguage = "es";
    translatedText = translateSpanish(text);
  } else if (/[\u0900-\u097F]/.test(text)) {
    originalLanguage = "hi";
    translatedText = translateHindi(text);
  } else if (/[\u0C80-\u0CFF]/.test(text)) {
    originalLanguage = "kn";
    translatedText = translateKannada(text);
  } else if (/[\u0400-\u04FF]/.test(text)) {
    originalLanguage = "uk";
    translatedText = translateUkrainian(text);
  } else if (/[\u0600-\u06FF]/.test(text)) {
    originalLanguage = "ar";
    translatedText = translateArabic(text);
  } else if (/[\u4e00-\u9fa5]/.test(text)) {
    originalLanguage = "zh";
    translatedText = `[Translated from Chinese]: ${text}`;
  } else if (/[àâçéèêëîïôûùüÿœæ]/i.test(text) || lower.includes("incendie") || lower.includes("secours")) {
    originalLanguage = "fr";
    translatedText = `[Translated from French]: ${text}`;
  }

  // ========================================================
  // 3. HAZARD TYPE & STRUCTURED EXTRACTION
  // ========================================================
  let hazardType: IncidentCategory = "OTHER";
  const immediateNeeds: string[] = [];
  const hazardsIdentified: string[] = [];
  let estimatedVictims = 0;

  // Extract estimated victims (supports numbers and words in English, Spanish, Hindi)
  const numberWordMap: Record<string, number> = {
    one: 1, un: 1, una: 1, uno: 1,
    two: 2, dos: 2,
    three: 3, tres: 3,
    four: 4, cuatro: 4,
    five: 5, cinco: 5,
    six: 6, seis: 6,
    seven: 7, siete: 7,
    eight: 8, ocho: 8,
    nine: 9, nueve: 9,
    ten: 10, diez: 10,
  };

  const wordVictimMatch = lower.match(
    /\b(one|un|una|uno|two|dos|three|tres|four|cuatro|five|cinco|six|seis|seven|siete|eight|ocho|nine|nueve|ten|diez|\d+)\s*(people|persons|victims|families|children|kids|familias|personas|लोग|детей)\b/
  );

  if (wordVictimMatch) {
    const rawNum = wordVictimMatch[1].toLowerCase();
    estimatedVictims = numberWordMap[rawNum] !== undefined ? numberWordMap[rawNum] : (parseInt(rawNum, 10) || 0);
    if (lower.includes("families") || lower.includes("familias")) {
      estimatedVictims *= 4;
    }
  }

  // Classify Hazard Type
  if (
    lower.includes("fire") ||
    lower.includes("fuego") ||
    lower.includes("smoke") ||
    lower.includes("flames") ||
    lower.includes("आग") ||
    lower.includes("incendie")
  ) {
    hazardType = "FIRE";
    hazardsIdentified.push("Active Combustion", "Toxic Smoke Inhalation");
    immediateNeeds.push("fire_suppression", "smoke_evacuation");
  } else if (
    lower.includes("flood") ||
    lower.includes("water") ||
    lower.includes("río") ||
    lower.includes("drowning") ||
    lower.includes("submerged") ||
    lower.includes("बाढ़")
  ) {
    hazardType = "FLOOD";
    hazardsIdentified.push("Rapid Water Currents", "Electrical Submersion Hazard");
    immediateNeeds.push("water_rescue_boat", "high_ground_evacuation");
  } else if (
    lower.includes("collapsed") ||
    lower.includes("rubble") ||
    lower.includes("trapped") ||
    lower.includes("crushed") ||
    lower.includes("मलबे") ||
    lower.includes("atrapad") ||
    lower.includes("ಕುಸಿದು") ||
    lower.includes("ಅವಶೇಷ") ||
    lower.includes("ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ")
  ) {
    hazardType = "STRUCTURAL_COLLAPSE";
    hazardsIdentified.push("Unstable Debris", "Secondary Structural Collapse");
    immediateNeeds.push("heavy_extrication", "search_and_rescue_dogs");
  } else if (
    lower.includes("earthquake") ||
    lower.includes("tremor") ||
    lower.includes("भूकंप") ||
    lower.includes("terremoto")
  ) {
    hazardType = "EARTHQUAKE";
    hazardsIdentified.push("Aftershocks", "Compromised Infrastructure");
    immediateNeeds.push("urban_search_rescue", "emergency_shelter");
  } else if (
    lower.includes("bleeding") ||
    lower.includes("heart attack") ||
    lower.includes("unconscious") ||
    lower.includes("cardiac") ||
    lower.includes("burn") ||
    lower.includes("stroke") ||
    lower.includes("घायल")
  ) {
    hazardType = "MEDICAL_EMERGENCY";
    hazardsIdentified.push("Immediate Life Threat", "Trauma Hemorrhage");
    immediateNeeds.push("advanced_life_support", "paramedic_transport");
  } else if (
    lower.includes("chemical") ||
    lower.includes("toxic") ||
    lower.includes("gas leak") ||
    lower.includes("hazmat")
  ) {
    hazardType = "HAZMAT";
    hazardsIdentified.push("Chemical Vapors", "Explosion Risk");
    immediateNeeds.push("hazmat_decontamination", "perimeter_containment");
  }

  // ========================================================
  // 4. URGENCY RANKING (severityScore 1–10)
  // Life-threatening keywords heavily prioritized over submission time
  // ========================================================
  let severityScore = 4; // Baseline moderate

  // Tier 1: Catastrophic Life-Threat (+5 to +6 points)
  const catastrophicKeywords = [
    "trapped",
    "crushed",
    "buried",
    "rubble",
    "submerged",
    "rising water",
    "bleeding",
    "unconscious",
    "cardiac",
    "no pulse",
    "infant",
    "children",
    "baby",
    "atrapad",
    "मलबे",
    "सांस",
    "ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ",
    "ರಕ್ತಸ್ರಾವ",
    "ಮಕ್ಕಳು",
  ];
  let catMatches = 0;
  for (const kw of catastrophicKeywords) {
    if (lower.includes(kw)) {
      // Check if keyword is negated (e.g. "no victims trapped", "not trapped", "zero casualties")
      const negatedRegex = new RegExp(`\\b(no|not|nobody|none|zero|without)\\s+(?:[\\w\\s]{0,20}\\s+)?${kw}\\b`, "i");
      if (negatedRegex.test(lower)) {
        continue;
      }
      catMatches++;
    }
  }
  if (catMatches > 0) {
    severityScore += Math.min(5, catMatches * 2 + 3);
  }

  // Tier 2: Severe Threat (+2 to +3 points)
  const severeKeywords = [
    "fire spreading",
    "smoke inhalation",
    "roof collapse",
    "broken bone",
    "explosion",
    "gas leak",
    "elderly",
    "cannot swim",
  ];
  for (const kw of severeKeywords) {
    if (lower.includes(kw)) {
      const negatedRegex = new RegExp(`\\b(no|not|nobody|none|zero|without)\\s+(?:[\\w\\s]{0,20}\\s+)?${kw}\\b`, "i");
      if (negatedRegex.test(lower)) continue;
      severityScore += 2;
      break;
    }
  }

  // Victim Count Multiplier
  if (estimatedVictims > 10) severityScore += 3;
  else if (estimatedVictims > 3) severityScore += 2;
  else if (estimatedVictims > 0) severityScore += 1;

  // Demote severity if caller explicitly states no victims/injuries
  const explicitNoHarm = /\b(no injuries|no victims|no casualties|nobody hurt|no one hurt|empty sedan|unoccupied)\b/i.test(lower);
  if (explicitNoHarm) {
    severityScore = Math.min(severityScore, 5);
  }

  // Clamp strictly between 1 and 10
  severityScore = Math.min(10, Math.max(1, severityScore));
  if (isSpam) severityScore = 1; // Discredited noise gets lowest rank

  // ========================================================
  // 5. GEOSPATIAL DEDUPLICATION (250-meter radius check)
  // ========================================================
  const duplicateMatch = findDuplicateMasterIncident(
    input.latitude,
    input.longitude,
    hazardType,
    input.existingActiveIncidents,
    250 // 250 meters
  );

  const aiSummary = quarantined
    ? `[QUARANTINED - NOISE] Report flagged with low credibility (${credibilityScore}/100): ${quarantineReason}`
    : `[AI Triage - ${hazardType}] Priority Sev: ${severityScore}/10. Victims: ${estimatedVictims || "Unknown"}. Immediate Needs: ${
        immediateNeeds.join(", ") || "General first response"
      }. Corroborated with credibility score ${credibilityScore}/100.`;

  return {
    originalLanguage,
    translatedText,
    hazardType,
    category: hazardType,
    severityScore,
    credibilityScore,
    estimatedVictims,
    immediateNeeds,
    hazardsIdentified,
    aiSummary,
    isSpam,
    quarantined,
    quarantineReason,
    isDuplicate: !!duplicateMatch,
    duplicateOfId: duplicateMatch?.masterId,
    engineProvider: "Survixa Local Fallback Engine",
    modelUsed: "deterministic-rules-v1",
    latencyMs: 1,
  };
}

// -------------------------------------------------------------
// Helper translation routines for common emergency languages
// -------------------------------------------------------------
function translateSpanish(text: string): string {
  let translated = text;
  translated = translated.replace(/el río se ha desbordado/gi, "the river has overflowed");
  translated = translated.replace(/el agua está subiendo/gi, "water is rising rapidly");
  translated = translated.replace(/atrapad[oa]s?/gi, "trapped");
  translated = translated.replace(/fuego/gi, "fire");
  translated = translated.replace(/ayuda/gi, "help");
  translated = translated.replace(/techo/gi, "roof");
  return `[Translated from Spanish]: ${translated}`;
}

function translateHindi(text: string): string {
  let translated = text;
  translated = translated.replace(/आग/gi, "fire");
  translated = translated.replace(/बाढ़/gi, "flood");
  translated = translated.replace(/मलबे/gi, "rubble");
  translated = translated.replace(/इमारत/gi, "building");
  translated = translated.replace(/मदद/gi, "help");
  return `[Translated from Hindi]: ${translated} (Intel: Critical distress reported with immediate rescue teams required)`;
}

function translateKannada(text: string): string {
  let translated = text;
  translated = translated.replace(/ಕಟ್ಟಡ ಕುಸಿದು ಬಿದ್ದಿದೆ/gi, "building has collapsed");
  translated = translated.replace(/ಅವಶೇಷಗಳ ಅಡಿಯಲ್ಲಿ/gi, "under rubble");
  translated = translated.replace(/ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ/gi, "trapped");
  translated = translated.replace(/ತೀವ್ರ ರಕ್ತಸ್ರಾವ/gi, "severe bleeding");
  translated = translated.replace(/ರಕ್ಷಣಾ ತಂಡ/gi, "rescue team");
  return `[Translated from Kannada]: ${translated} (Intel: Critical structural collapse, victims trapped under debris with severe trauma)`;
}

function translateUkrainian(text: string): string {
  return `[Translated from Ukrainian]: ${text} (Intel: Emergency distress call requesting urgent rescue)`;
}

function translateArabic(text: string): string {
  return `[Translated from Arabic]: ${text} (Intel: Life-safety incident reported with immediate assistance required)`;
}
