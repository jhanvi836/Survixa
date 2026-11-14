"use client";

import { io, Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "@/types/socket-events";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocketClient(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket && typeof window !== "undefined") {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("⚡ [Survixa Socket] Connected to Disaster Gateway:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ [Survixa Socket] Disconnected:", reason);
    });
  }

  return socket!;
}
