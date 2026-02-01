import os
import time
import uuid
from typing import Generator, List

from dotenv import load_dotenv
from celery import chain
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from .models import RunCreateRequest, RunCreateResponse, RunStatusResponse, StepStatus
from .storage import (
    STEP_ORDER,
    append_event,
    clear_artifacts,
    get_artifact,
    get_run_status,
    get_step_statuses,
    init_run,
    list_artifacts,
    run_exists,
    set_run_status,
    set_step_status,
)
from .tasks import finalize, orchestrate_run

load_dotenv()

router = APIRouter()

REVIEW_ENABLED = os.getenv("REVIEW_ENABLED", "false").lower() in {"1", "true", "yes"}
STREAM_TIMEOUT_SECONDS = int(os.getenv("SSE_STREAM_TIMEOUT_SECONDS", "60"))
POLL_INTERVAL_SECONDS = float(os.getenv("SSE_POLL_INTERVAL_SECONDS", "1.0"))

STEP_SEQUENCE = ["pm", "tech", "qa", "principal", "review"]
ARTIFACTS_BY_STEP = {
    "pm": ["prd"],
    "tech": ["arch", "api"],
    "qa": ["test", "risk"],
    "principal": ["stack"],
    "review": ["review"],
}


def _build_chain(run_id: str, start_step: str = "pm"):
    if start_step not in STEP_SEQUENCE:
        raise ValueError("Unknown step")
    return chain(orchestrate_run.si(run_id, start_step), finalize.si(run_id))


def _steps_from(start_step: str) -> List[str]:
    idx = STEP_SEQUENCE.index(start_step)
    return STEP_SEQUENCE[idx:]


@router.post("/runs", response_model=RunCreateResponse)
def create_run(payload: RunCreateRequest) -> RunCreateResponse:
    idea = payload.idea.strip()
    if not idea:
        raise HTTPException(status_code=400, detail="Idea must not be empty")
    run_id = f"run_{uuid.uuid4().hex}"
    init_run(run_id, idea)
    if not REVIEW_ENABLED:
        set_step_status(run_id, "review", "skipped")
    _build_chain(run_id).apply_async()
    return RunCreateResponse(id=run_id, status="queued")


@router.get("/runs/{run_id}", response_model=RunStatusResponse)
def get_run(run_id: str) -> RunStatusResponse:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    status = get_run_status(run_id) or "unknown"
    step_statuses = get_step_statuses(run_id)
    steps = [
        StepStatus(name=step, status=step_statuses.get(step, "unknown"))
        for step in STEP_ORDER
    ]
    artifacts = list_artifacts(run_id)
    return RunStatusResponse(id=run_id, status=status, steps=steps, artifacts=artifacts)


@router.post("/runs/{run_id}/steps/{step}/regenerate")
def regenerate_step(run_id: str, step: str) -> dict:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    if step not in STEP_SEQUENCE:
        raise HTTPException(status_code=400, detail="Unknown step")
    if step == "review" and not REVIEW_ENABLED:
        raise HTTPException(status_code=409, detail="Review step not enabled")

    steps_to_clear = _steps_from(step)
    artifacts_to_clear: List[str] = ["final"]
    for step_name in steps_to_clear:
        artifacts_to_clear.extend(ARTIFACTS_BY_STEP[step_name])
        if step_name == "review" and not REVIEW_ENABLED:
            set_step_status(run_id, step_name, "skipped")
        else:
            set_step_status(run_id, step_name, "pending")

    clear_artifacts(run_id, artifacts_to_clear)
    set_run_status(run_id, "queued")
    append_event(
        run_id,
        {
            "type": "step_regenerate",
            "step": step,
            "timestamp": int(time.time()),
        },
    )
    _build_chain(run_id, start_step=step).apply_async()
    return {"id": run_id, "status": "queued", "step": step}


@router.get("/runs/{run_id}/events")
def stream_events(run_id: str, request: Request, start: int = 0) -> StreamingResponse:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail="Run not found")

    def event_stream() -> Generator[str, None, None]:
        from .storage import get_events

        start_time = time.time()
        index = max(0, int(start))
        last_event_id = request.headers.get("last-event-id")
        if last_event_id:
            try:
                index = max(index, int(last_event_id) + 1)
            except ValueError:
                pass
        while time.time() - start_time < STREAM_TIMEOUT_SECONDS:
            items = get_events(run_id, index)
            if items:
                for raw in items:
                    yield f"id: {index}\n"
                    yield f"data: {raw}\n\n"
                    index += 1
            else:
                yield ": keep-alive\n\n"
            time.sleep(POLL_INTERVAL_SECONDS)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/runs/{run_id}/export")
def export_run(run_id: str, format: str = "md") -> Response:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    if format != "md":
        raise HTTPException(status_code=400, detail="Only md is supported in MVP")
    final_doc = get_artifact(run_id, "final")
    if not final_doc:
        raise HTTPException(status_code=409, detail="Run not finalized")
    return Response(content=final_doc, media_type="text/markdown; charset=utf-8")
