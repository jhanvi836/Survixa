import { IncidentRecord, RescueUnitRecord, StatusUpdateLogRecord, IncidentStatus, UnitStatus } from "./index";

export interface StatusChangePayload {
  incidentId: string;
  trackingCode: string;
  status: IncidentStatus;
  updateLog: StatusUpdateLogRecord;
  assignedUnits: Array<{
    id?: string;
    callsign: string;
    agencyType: string;
    department?: string;
    latitude: number;
    longitude: number;
  }>;
  incident?: Partial<IncidentRecord>;
  timestamp: string;
}

export interface ServerToClientEvents {
  // Command Center Room Broadcasts ("command_center")
  "incident:verified": (incident: IncidentRecord) => void;
  "incident:created": (incident: IncidentRecord) => void;
  "new_incident": (incident: IncidentRecord) => void;
  "incident:updated": (incident: IncidentRecord) => void;
  "unit:gps_updated": (payload: { unitId: string; latitude: number; longitude: number; heading?: number; speed?: number }) => void;
  "unit:status_changed": (payload: { unitId: string; status: UnitStatus; assignedIncidentId?: string }) => void;

  // Specific Incident Room Broadcasts ("incident_<id>") for Citizen Feedback Loop
  "status_change": (payload: StatusChangePayload) => void;
  "incident:status_changed": (payload: { incidentId: string; status: IncidentStatus; log: StatusUpdateLogRecord; assignedUnits?: any[] }) => void;
  "citizen:status_stream": (payload: StatusChangePayload) => void;

  // Inter-Agency Broadcast
  "broadcast:agency_alert": (payload: {
    agency: string;
    priority: "HIGH" | "CRITICAL";
    message: string;
    incidentId: string;
  }) => void;
}

export interface ClientToServerEvents {
  // Join the primary joint command center room ("command_center")
  "join:command_center": () => void;
  
  // Join specific incident room ("incident_<id>") for live citizen updates
  "join:incident": (incidentId: string) => void;
  "join:citizen_tracker": (trackingCodeOrId: string) => void;
  "leave:incident": (incidentId: string) => void;
  "leave:citizen_tracker": (trackingCodeOrId: string) => void;

  // Join agency-specific room
  "join:agency_channel": (agency: string) => void;
  
  // Field unit telemetry
  "unit:report_gps": (payload: { unitId: string; latitude: number; longitude: number; speed?: number; heading?: number }) => void;
}
