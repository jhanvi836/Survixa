import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents, StatusChangePayload } from "@/types/socket-events";

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

/**
 * Initialize Socket.io Real-Time Emergency Gateway
 * Configures rooms for Joint Command and individual Incident Citizen Feedback Loops
 */
export function initializeSocketServer(httpServer: HttpServer) {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : null;

  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins || ((origin, callback) => callback(null, true)),
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`📡 [Socket.io] Client connected: ${socket.id}`);

    /**
     * 1. Join Command Center Room ("command_center")
     * All joint dispatchers & commanders join this room for the Common Operating Picture
     */
    socket.on("join:command_center", () => {
      socket.join("command_center");
      console.log(`🛰️ [Socket.io] Joined room: 'command_center' (${socket.id})`);
    });

    /**
     * 2. Join Specific Incident Room ("incident_<id>")
     * Reporting citizens join this isolated room to receive real-time status updates without refreshing
     */
    socket.on("join:incident", (incidentId: string) => {
      const room = incidentId.startsWith("incident_") ? incidentId : `incident_${incidentId}`;
      socket.join(room);
      console.log(`📱 [Socket.io] Subscribed to incident room: '${room}' (${socket.id})`);
    });

    // Also support citizen tracker alias (accepts incidentId or trackingCode)
    socket.on("join:citizen_tracker", (trackingCodeOrId: string) => {
      const room = trackingCodeOrId.startsWith("incident_") 
        ? trackingCodeOrId 
        : `incident_${trackingCodeOrId}`;
      socket.join(room);
      console.log(`📱 [Socket.io] Citizen subscribed to tracking loop: '${room}' (${socket.id})`);
    });

    socket.on("leave:incident", (incidentId: string) => {
      const room = incidentId.startsWith("incident_") ? incidentId : `incident_${incidentId}`;
      socket.leave(room);
    });

    socket.on("leave:citizen_tracker", (trackingCodeOrId: string) => {
      const room = trackingCodeOrId.startsWith("incident_") 
        ? trackingCodeOrId 
        : `incident_${trackingCodeOrId}`;
      socket.leave(room);
    });

    // Agency-specific channel for units
    socket.on("join:agency_channel", (agency: string) => {
      const room = `agency:${agency.toUpperCase()}`;
      socket.join(room);
      console.log(`🚒 [Socket.io] Unit subscribed to agency channel: '${room}'`);
    });

    // Rescue Unit Live GPS Telemetry Ping
    socket.on("unit:report_gps", (payload) => {
      io?.to("command_center").emit("unit:gps_updated", {
        unitId: payload.unitId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        heading: payload.heading,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}

/**
 * Broadcast new verified incident immediately to the 'command_center' room
 */
export function broadcastVerifiedIncident(incident: any) {
  if (!io) {
    console.warn("⚠️ [Socket.io] Server instance not ready for broadcastVerifiedIncident");
    return;
  }

  console.log(`🚨 [Socket.io] Broadcasting verified incident ${incident.id} (${incident.trackingCode}) to 'command_center'`);
  io.to("command_center").emit("incident:verified", incident);
  io.to("command_center").emit("incident:created", incident);
  io.to("command_center").emit("new_incident", incident);
}

/**
 * Broadcast status change immediately to a specific 'incident_<id>' room
 * so the reporting citizen's screen updates live without refreshing.
 * Also pushes updates to 'command_center' for responder situational awareness.
 */
export function broadcastStatusChange(payload: {
  incidentId: string;
  trackingCode?: string;
  status: any;
  updateLog: any;
  assignedUnits: any[];
  incident?: any;
}) {
  if (!io) {
    console.warn("⚠️ [Socket.io] Server instance not ready for broadcastStatusChange");
    return;
  }

  const broadcastPayload: StatusChangePayload = {
    incidentId: payload.incidentId,
    trackingCode: payload.trackingCode || "",
    status: payload.status,
    updateLog: payload.updateLog,
    assignedUnits: payload.assignedUnits,
    incident: payload.incident,
    timestamp: new Date().toISOString(),
  };

  // 1. Target primary specific incident room: 'incident_<id>'
  const primaryRoom = `incident_${payload.incidentId}`;
  console.log(`📢 [Socket.io] Broadcasting status change to room '${primaryRoom}': [${payload.status}]`);
  io.to(primaryRoom).emit("status_change", broadcastPayload);
  io.to(primaryRoom).emit("citizen:status_stream", broadcastPayload);
  io.to(primaryRoom).emit("incident:status_changed", {
    incidentId: payload.incidentId,
    status: payload.status,
    log: payload.updateLog,
    assignedUnits: payload.assignedUnits,
  });

  // Also broadcast to trackingCode room if different from incidentId
  if (payload.trackingCode && payload.trackingCode !== payload.incidentId) {
    const trackingRoom = `incident_${payload.trackingCode}`;
    io.to(trackingRoom).emit("status_change", broadcastPayload);
    io.to(trackingRoom).emit("citizen:status_stream", broadcastPayload);
  }

  // 2. Broadcast to 'command_center' room so dispatchers see the status change live
  io.to("command_center").emit("incident:status_changed", {
    incidentId: payload.incidentId,
    status: payload.status,
    log: payload.updateLog,
    assignedUnits: payload.assignedUnits,
  });
}

/**
 * Backwards-compatibility aliases
 */
export const broadcastIncidentCreated = broadcastVerifiedIncident;
export const broadcastStatusUpdate = broadcastStatusChange;
export function broadcastUnitGps(payload: {
  unitId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}) {
  if (!io) return;
  io.to("command_center").emit("unit:gps_updated", payload);
}
