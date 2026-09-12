# backend/agent-service/main.py
"""
FastAPI Server for Python 4-Agent Service
Exposes REST endpoints for Node backend and frontend integration
"""
import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Optional

# Ensure package imports work smoothly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from orchestrator.orchestrator_agent import OrchestratorAgent
from contracts.planning import PlanResponse

app = FastAPI(
    title="Automatic Block Planning System — Auditable Multi-Agent Service",
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
    startTime: Optional[str] = Field(default="19:00", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    endTime: Optional[str] = Field(default="20:30", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    durationMinutes: Optional[int] = Field(default=90, ge=1, le=1440)
    criticality: Optional[int] = None
    urgency: Optional[int] = None
    failureProbability: Optional[int] = None
    overdueDays: Optional[int] = None
    prohibitedStartTime: Optional[str] = Field(default=None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    prohibitedEndTime: Optional[str] = Field(default=None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")

    @model_validator(mode="after")
    def validate_window_pairs(self):
        if bool(self.prohibitedStartTime) != bool(self.prohibitedEndTime):
            raise ValueError("prohibitedStartTime and prohibitedEndTime must be supplied together")
        if self.startTime == self.endTime:
            raise ValueError("startTime and endTime cannot be equal")
        if self.prohibitedStartTime and self.prohibitedStartTime == self.prohibitedEndTime:
            raise ValueError("prohibited window start and end cannot be equal")
        return self

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "Python Multi-Agent Service",
        "agents": ["Orchestrator", "Maintenance", "Traffic", "Block Planner", "Safety Verifier", "Explanation"],
        "explanationAI": {
            "enabled": orchestrator.explanation_agent.enabled,
            "provider": "OpenRouter",
            "model": orchestrator.explanation_agent.model if orchestrator.explanation_agent.enabled else None,
        },
        "schemaVersion": "2.0",
    }

@app.post("/agent/plan", response_model=PlanResponse)
def agent_plan(request: PlanRequest):
    result = orchestrator.process_plan(request.model_dump())
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001)
