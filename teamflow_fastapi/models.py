from typing import Dict, List

from pydantic import BaseModel, Field


class RunCreateRequest(BaseModel):
    idea: str = Field(..., max_length=1000)


class RunCreateResponse(BaseModel):
    id: str
    status: str


class StepStatus(BaseModel):
    name: str
    status: str


class RunStatusResponse(BaseModel):
    id: str
    status: str
    steps: List[StepStatus]
    artifacts: Dict[str, bool]
