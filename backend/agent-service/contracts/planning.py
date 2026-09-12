from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EvidenceReference(BaseModel):
    sourceType: str
    sourceId: str
    observedAt: str


class AgentTraceStep(BaseModel):
    stepId: str
    agent: str
    status: str
    startedAt: str
    finishedAt: str
    durationMs: int = Field(ge=0)
    inputArtifactIds: List[str] = Field(default_factory=list)
    outputArtifactIds: List[str] = Field(default_factory=list)
    evidence: List[EvidenceReference] = Field(default_factory=list)
    summary: str
    implementationVersion: str


class VerificationResult(BaseModel):
    passed: bool
    checkedRules: List[str] = Field(default_factory=list)
    failedRules: List[Dict[str, Any]] = Field(default_factory=list)


class PlanResponse(BaseModel):
    """V2 envelope while retaining the V1 planning fields for compatibility."""

    model_config = ConfigDict(extra="allow")

    schemaVersion: str = "2.0"
    runId: str
    requestId: Optional[str] = None
    status: str
    priorityScore: Optional[int] = None
    breakdown: Dict[str, Any] = Field(default_factory=dict)
    conflict: Optional[bool] = None
    conflictingTrains: List[Dict[str, Any]] = Field(default_factory=list)
    recommendedBlock: Optional[Dict[str, Any]] = None
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: str
    explanationDetails: Optional[Dict[str, Any]] = None
    verification: VerificationResult
    trace: List[AgentTraceStep] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    requiresHumanApproval: bool = True
