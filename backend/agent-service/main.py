# backend/agent-service/main.py
"""
FastAPI Server for Python 4-Agent Service
Exposes REST endpoints for Node backend and frontend integration
"""
import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Ensure package imports work smoothly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from orchestrator.orchestrator_agent import OrchestratorAgent

app = FastAPI(
    title="Automatic Block Planning System — Python 4-Agent Service",
    version="1.0.0",
    description="Multi-agent service for maintenance analysis, traffic conflict detection, MCDA priority scoring, and alternatives generation."
)

# Enable CORS for frontend at localhost:5173 and all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = OrchestratorAgent()

class PlanRequest(BaseModel):
    requestId: Optional[str] = None
    taskId: Optional[str] = None
    trackId: Optional[str] = "KA-T-000342"
    department: Optional[str] = "ENGINEERING"
    assetType: Optional[str] = "TRACK"
    planningDate: Optional[str] = "2026-09-15"
    startTime: Optional[str] = "19:00"
    endTime: Optional[str] = "20:30"
    durationMinutes: Optional[int] = 90
    criticality: Optional[int] = None
    urgency: Optional[int] = None
    failureProbability: Optional[int] = None
    overdueDays: Optional[int] = None
    prohibitedStartTime: Optional[str] = None
    prohibitedEndTime: Optional[str] = None

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "Python 4-Agent Service",
        "agents": ["Orchestrator", "Maintenance", "Traffic", "Block Planner"]
    }

@app.post("/agent/plan")
def agent_plan(request: PlanRequest):
    result = orchestrator.process_plan(request.dict())
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001)
