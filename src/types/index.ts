export type AgencyType = 
  | "FIRE" 
  | "MEDICAL" 
  | "POLICE" 
  | "NGO" 
  | "COAST_GUARD" 
  | "CIVIL_DEFENSE" 
  | "DISASTER_MANAGEMENT";

export type IncidentStatus = 
  | "RECEIVED" 
  | "VERIFIED" 
  | "ASSIGNED" 
  | "EN_ROUTE" 
  | "RESOLVED";

export type IncidentCategory = 
  | "FIRE" 
  | "FLOOD" 
  | "EARTHQUAKE" 
  | "MEDICAL_EMERGENCY" 
  | "STRUCTURAL_COLLAPSE" 
  | "HAZMAT" 
  | "SEARCH_AND_RESCUE" 
  | "CYCLONE_STORM" 
  | "OTHER";

export type UnitStatus = 
  | "AVAILABLE" 
  | "DISPATCHED" 
  | "ON_SCENE" 
  | "RETURNING" 
  | "STANDBY" 
  | "OFFLINE";

export type UpdateVisibility = "PUBLIC" | "INTERNAL_CONFIDENTIAL";

export interface IncidentRecord {
  id: string;
  trackingCode: string;
  originalLanguage: string;
  rawContent: string;
  translatedText?: string;
  latitude: number;
  longitude: number;
  locationName?: string | null;
  city?: string | null;
  district?: string | null;
  severityScore?: number; // 1 to 10
  credibilityScore?: number; // 0 to 100
  duplicateCount?: number;
  status: IncidentStatus;
  category: IncidentCategory;
  aiSummary?: string | null;
  hazardsIdentified?: string[];
  immediateNeeds?: string[];
  estimatedVictims?: number | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  mediaUrls?: string[];
  parentIncidentId?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  resolvedAt?: string | Date | null;
  dispatches?: UnitDispatchRecord[];
  statusLogs?: StatusUpdateLogRecord[];
  progressPercentage?: number;
}

export interface RescueUnitRecord {
  id: string;
  callsign: string;
  agencyType: AgencyType;
  department: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  lastGpsUpdate: string | Date;
  availability: UnitStatus;
  personnelCount?: number;
  capabilities: string[];
  contactChannel?: string | null;
  dispatches?: UnitDispatchRecord[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface UnitDispatchRecord {
  id: string;
  incidentId: string;
  rescueUnitId: string;
  rescueUnit?: RescueUnitRecord;
  assignedRole?: string | null;
  dispatchedAt: string | Date;
  arrivedAt?: string | Date | null;
  clearedAt?: string | Date | null;
}

export interface StatusUpdateLogRecord {
  id: string;
  incidentId: string;
  rescueUnitId?: string | null;
  rescueUnit?: RescueUnitRecord | null;
  status: IncidentStatus;
  message: string;
  internalNotes?: string | null;
  visibility: UpdateVisibility;
  sourceAgency?: AgencyType | null;
  operatorId?: string | null;
  createdAt: string | Date;
}

export interface AITriageResult {
  originalLanguage: string;
  translatedText: string;
  hazardType: IncidentCategory;
  category: IncidentCategory;
  severityScore: number; // 1 to 10
  credibilityScore: number; // 0 to 100
  estimatedVictims: number;
  immediateNeeds: string[];
  hazardsIdentified: string[];
  aiSummary: string;
  isSpam: boolean;
  quarantined: boolean;
  quarantineReason?: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  engineProvider?: string;
  modelUsed?: string;
  latencyMs?: number;
  imageAnalysis?: string;
  recommendedAgencies?: AgencyType[];
  tacticalRecommendations?: string[];
}
