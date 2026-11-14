import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { initializeSocketServer } from "./socket";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  try {
    await app.prepare();
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling request:", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    // Initialize Socket.io disaster gateway
    const io = initializeSocketServer(server);
    (global as any).survixaSocket = io;

    server.listen(port, () => {
      console.log(`
╔═════════════════════════════════════════════════════════════════╗
║                   SURVIXA DISASTER PLATFORM                     ║
║         Unified Real-Time AI Emergency Response Hub             ║
╠═════════════════════════════════════════════════════════════════╣
║  🌐 Next.js App Router  : http://localhost:${port}                ║
║  🚨 Citizen Portal       : http://localhost:${port}/report         ║
║  🛰️  Command Dashboard   : http://localhost:${port}/command        ║
║  ⚡ Socket.io Gateway    : ws://localhost:${port}/socket.io        ║
║  🛡️  Breaking Silos     : Fire | Medical | Police | NGO         ║
╚═════════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log("\nInitiating graceful shutdown of Survixa Core...");
      server.close(() => {
        console.log("Survixa HTTP & Socket server terminated safely.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Fatal startup error in Survixa server:", error);
    process.exit(1);
  }
}

bootstrap();
