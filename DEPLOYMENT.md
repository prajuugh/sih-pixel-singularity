# Production Deployment Guide: Automatic Railway Block Planning System (RBPS)

This guide provides step-by-step instructions to deploy the entire 3-tier Automatic Block Planning System:
- **Frontend SPA**: React 19 + Vite + Leaflet + Tailwind CSS
- **Backend API**: Node.js Express REST API (`:5000`)
- **Agent Microservice**: Python 3.11 FastAPI + NetworkX Multi-Agent System (`:5001`)
- **Database**: PostgreSQL 15 + PostGIS (Supabase Managed or Self-Hosted)

---

## Method 1: Full-Stack Docker Compose Deployment (Recommended for Local / VPS / Cloud Server)

This single-command workflow spins up all 3 services inside isolated Docker containers with automated health checks and Nginx reverse proxying.

### Prerequisites:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine + Docker Compose Plugin (Linux).

### Steps:

1. **Clone the repository and prepare environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DATABASE_URL` is set to your Supabase PostgreSQL connection string or self-hosted database).*

2. **Build and start all containers**:
   ```bash
   docker compose up --build -d
   ```

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```
   You should see:
   - `rbps-agent-service` on port `5001` (healthy)
   - `rbps-backend` on port `5000` (healthy)
   - `rbps-frontend` on port `80` (running)

4. **Access the Application**:
   - **Frontend Application**: [http://localhost](http://localhost)
   - **Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
   - **Agent Service Docs**: [http://localhost:5001/docs](http://localhost:5001/docs)

5. **Stop the stack**:
   ```bash
   docker compose down
   ```

---

## Method 2: Managed Cloud Deployment (Vercel + Render + Supabase)

### Tier A: Database (Supabase)
1. Your Supabase PostgreSQL database is already configured in `backend/.env`:
   - Connection URL: `aws-0-ap-south-1.pooler.supabase.com:6543`
2. Run database setup scripts if setting up a fresh project:
   ```bash
   cd backend
   node scripts/init_db.js
   node scripts/seed_data.js
   ```

---

### Tier B: Backend & Python Agent Microservice (Render)
1. Push this repository to GitHub/GitLab.
2. Sign in to [Render](https://render.com).
3. Click **New +** $\to$ **Blueprint**.
4. Connect this repository: Render will automatically detect [`render.yaml`](file:///c:/Users/navya%20sastry/.gemini/antigravity-ide/scratch/sih-pixel-singularity/render.yaml) and create both services:
   - **`rbps-agent-service`** (Python FastAPI)
   - **`rbps-backend`** (Node Express API)
5. Under `rbps-backend` Environment Variables, add:
   - `DATABASE_URL`: `[Your Supabase postgres connection string]`
6. Once deployed, Render will provide a public URL for your backend (e.g. `https://rbps-backend.onrender.com`).

---

### Tier C: Frontend SPA (Vercel)
1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New** $\to$ **Project** $\to$ Import your GitHub repository.
3. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://[your-backend-subdomain].onrender.com/api`
   - `VITE_AGENT_BASE_URL`: `https://[your-agent-subdomain].onrender.com`
5. Click **Deploy**. Vercel will build and serve the application with client-side SPA routing supported via [`vercel.json`](file:///c:/Users/navya%20sastry/.gemini/antigravity-ide/scratch/sih-pixel-singularity/frontend/vercel.json).

---

## Post-Deployment Verification Checklist

- [ ] **Health Endpoint**: `GET https://your-backend-url/api/health` returns status `HEALTHY`.
- [ ] **Agent Health**: `GET https://your-agent-url/health` returns status `HEALTHY` with 4 agents listed.
- [ ] **Track Catalog**: `GET https://your-backend-url/api/tracks` returns GeoJSON FeatureCollection of 5,461 segments.
- [ ] **Login**: Sign in with `officer1` / `password123` or `admin` / `admin123`.
- [ ] **Live GIS Map**: Open Live Map and confirm track segments load cleanly with interactive inspection.
- [ ] **MCDA Planning**: Submit a maintenance request and verify multi-agent priority score generation.
