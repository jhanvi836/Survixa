# Survixa — Production Deployment & Operations Guide

This guide details the step-by-step deployment instructions for the **Survixa Unified Disaster Response Platform**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph DataLayer["1. Database Layer (PostgreSQL)"]
        DB[(Supabase / Neon Postgres)]
    end

    subgraph TelemetryLayer["2. Real-Time Telemetry Layer (Stateful Node.js)"]
        SocketServer["Render / Railway Web Service\n(Socket.io / ws:// / Telemetry Bus)"]
    end

    subgraph AppLayer["3. Web App Layer (Serverless Next.js 15)"]
        VercelApp["Vercel Production Deployment\n(Citizen PWA, Command Center, REST APIs)"]
    end

    Citizen["Citizen Mobile PWA\n(/report)"] -->|HTTPS / Offline Service Worker| VercelApp
    Citizen -->|WSS Socket.io / Live Tracking| SocketServer
    Dispatchers["Joint Command Center\n(/command)"] -->|HTTPS| VercelApp
    Dispatchers -->|WSS Telemetry / Live GPS| SocketServer

    VercelApp -->|Prisma Client (Port 6543 Pooled)| DB
    SocketServer -->|Prisma Client| DB
```

---

## 2. Environment Variables Specification

Ensure your environment variables are configured in each service according to this specification:

| Environment Variable | Target Service | Example Value | Description |
|---|---|---|---|
| `DATABASE_URL` | Vercel & Render/Railway | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` | Pooled PostgreSQL connection string |
| `LLM_API_KEY` | Vercel & Render/Railway | `AIzaSy...` | Google Gemini 3.5 Flash API Key |
| `GEMINI_API_KEY` | Vercel & Render/Railway | `AIzaSy...` | Alias for LLM_API_KEY |
| `NEXT_PUBLIC_SOCKET_URL` | Vercel (Frontend) | `https://survixa-socket.onrender.com` | Public URL of the WebSocket telemetry server |
| `NEXT_PUBLIC_SITE_URL` | Vercel (Frontend) | `https://survixa.vercel.app` | Canonical public URL of the deployed frontend |
| `PORT` | Render / Railway | `10000` or `8080` | Port for the Node.js HTTP/WebSocket server |
| `HOST` | Render / Railway | `0.0.0.0` | Host binding for container networking |
| `CORS_ORIGIN` | Render / Railway | `https://survixa.vercel.app,http://localhost:3000` | Allowed origins for cross-domain WebSockets |

---

## 3. Database Deployment (Supabase or Neon)

### Option A: Supabase (Recommended)

1. **Create Project**:
   - Navigate to [supabase.com](https://supabase.com) and click **"New Project"**.
   - Select your nearest geographical region and set a secure database password.
2. **Obtain Connection String**:
   - Go to **Project Settings $\rightarrow$ Database**.
   - Under **Connection Parameters**, select **Connection Pooling (Port 6543)** and mode **Transaction**.
   - Copy the string:
     ```env
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
     ```
3. **Execute Schema Migration & Fleet Seeding**:
   From your local terminal:
   ```bash
   # 1. Export database URL
   export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

   # 2. Push schema to Supabase
   npx prisma db push

   # 3. Seed multi-agency units (Fire, Medical, Police, NGO)
   npm run prisma:seed
   ```

### Option B: Neon Serverless Postgres

1. Log into [neon.tech](https://neon.tech) and create a project (`survixa-db`).
2. Under **Connection Details**, check **"Pooled connection"** and copy the connection string.
3. Run `npx prisma db push && npm run prisma:seed`.

---

## 4. WebSocket Backend Deployment (Render or Railway)

> **Important**: Vercel serverless functions have a 10s–60s timeout and cannot maintain persistent stateful WebSocket connections. Therefore, Socket.io is hosted on Render or Railway.

### Option A: Deploy on Render

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: Survixa production release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/survixa.git
   git push -u origin main
   ```
2. In the [Render Dashboard](https://dashboard.render.com):
   - Click **"New +" $\rightarrow$ "Web Service"**.
   - Connect your `survixa` repository.
   - Configure service details:
     - **Name**: `survixa-socket`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npx prisma generate`
     - **Start Command**: `npm start`
     - **Plan**: Free or Starter
3. Under **Environment Variables**, add:
   - `DATABASE_URL`: `postgresql://...`
   - `LLM_API_KEY`: `AIzaSy...`
   - `CORS_ORIGIN`: `https://<your-vercel-app>.vercel.app,http://localhost:3000`
4. Click **"Create Web Service"**.
5. Once live, note the assigned URL: `https://survixa-socket.onrender.com`.

### Option B: Deploy on Railway

1. In [railway.com](https://railway.com):
   - Click **"New Project" $\rightarrow$ "Deploy from GitHub repo"**.
   - Select `survixa`.
2. Under **Variables**, add `DATABASE_URL`, `LLM_API_KEY`, and `CORS_ORIGIN`.
3. Under **Settings $\rightarrow$ Networking**, click **"Generate Domain"** (e.g. `https://survixa.up.railway.app`).

---

## 5. Next.js Frontend Deployment (Vercel)

1. Log into [vercel.com](https://vercel.com) and click **"Add New... $\rightarrow$ Project"**.
2. Select your `survixa` repository.
3. Configure build settings:
   - **Framework Preset**: Next.js (automatically detected)
   - **Build Command**: `npm run build` *(runs `prisma generate && next build`)*
   - **Output Directory**: `.next`
4. Add the following **Environment Variables**:
   ```env
   DATABASE_URL="postgresql://..."
   LLM_API_KEY="AIzaSy..."
   NEXT_PUBLIC_SOCKET_URL="https://survixa-socket.onrender.com"
   NEXT_PUBLIC_SITE_URL="https://survixa.vercel.app"
   ```
5. Click **"Deploy"**.
6. When deployment finishes, copy your production domain: `https://survixa.vercel.app`.
7. Go back to your Render/Railway backend environment variables and ensure `CORS_ORIGIN` includes your Vercel URL.

---

## 6. CORS Configuration Verification

- **REST APIs**: Handled in `next.config.ts` with custom headers for `/api/:path*`:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, OPTIONS, PATCH, DELETE, POST, PUT`
  - `Access-Control-Allow-Credentials: true`
- **Socket.io WebSocket Server**: Handled in `src/server/socket.ts`:
  - Parses `process.env.CORS_ORIGIN`. If unset, dynamically echoes the requesting client's origin with `credentials: true`, allowing all preview and production Vercel domains to connect seamlessly.

---

## 7. PWA & Offline Verification Checklist

1. **PWA Manifest Check**:
   - Open Chrome DevTools $\rightarrow$ **Application $\rightarrow$ Manifest**.
   - Verify App name (`Survixa — Emergency Disaster Response`), short name, icons (`/icons/icon.svg`), theme color (`#e11d48`), and shortcuts.
2. **Service Worker Verification**:
   - Open DevTools $\rightarrow$ **Application $\rightarrow$ Service Workers**.
   - Verify `/sw.js` is active and running.
3. **Simulated Disaster Blackout**:
   - In DevTools $\rightarrow$ **Network**, select **Offline**.
   - Refresh the page: `/report` loads from the service worker cache.
   - Submit an emergency report: the report is saved into `survixa_offline_emergency_queue`.
   - Switch network back to **Online**: the report automatically syncs to Unified Command and redirects to `/track/[incidentId]`.
