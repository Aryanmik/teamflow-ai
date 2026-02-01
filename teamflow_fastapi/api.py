import os
import re
import time
import uuid
from typing import Generator, List, Optional

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
    get_run_meta,
    get_run_status,
    get_step_statuses,
    init_run,
    list_artifacts,
    run_exists,
    is_run_cancelled,
    set_run_meta,
    set_run_status,
    set_step_status,
)
from .tasks import finalize, orchestrate_run
from pathlib import Path

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

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
CURSOR_PROMPT_MAX_CHARS = int(os.getenv("CURSOR_PROMPT_MAX_CHARS", "5200"))


def _clamp_max_chars(value: int) -> int:
    return max(500, min(int(value), 20000))


def _extract_max_chars(idea: str) -> Optional[int]:
    if not idea:
        return None
    text = idea.lower().replace(",", "")
    patterns = [
        (r"(?:within|under|less than|<=)\s*(\d{3,6})\s*(?:characters|chars)?", 1),
        (r"(\d{3,6})\s*(?:characters|chars)", 1),
        (r"(\d{1,3})\s*k\s*(?:characters|chars)?", 1000),
    ]
    for pattern, multiplier in patterns:
        match = re.search(pattern, text)
        if match:
            return _clamp_max_chars(int(match.group(1)) * multiplier)
    if any(
        phrase in text
        for phrase in (
            "short document",
            "short doc",
            "keep it short",
            "concise",
            "brief",
            "short version",
        )
    ):
        return 5000
    return None


def _load_prompt(name: str) -> str:
    path = PROMPT_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8")


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def _compress_markdown(md: str, *, max_bullets: int, max_chars: int) -> str:
    if not md:
        return ""
    lines = md.replace("\r\n", "\n").split("\n")
    output: List[str] = []
    bullets_seen = 0
    in_section = False
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            output.append(line)
            bullets_seen = 0
            in_section = True
            continue
        if line.startswith(("-", "*")):
            if bullets_seen < max_bullets:
                output.append(_clip(line, max_chars))
            elif bullets_seen == max_bullets:
                output.append("- (more in full document)")
            bullets_seen += 1
            continue
        if in_section and bullets_seen == 0:
            output.append(_clip(line, max_chars))
    return "\n".join(output).strip()


def _strip_api_design(content: str) -> str:
    if not content:
        return ""
    lines = content.replace("\r\n", "\n").split("\n")
    output = []
    skipping = False
    inserted = False
    for raw in lines:
        stripped = raw.strip()
        if stripped.startswith("#"):
            heading = stripped.lstrip("#").strip().lower()
            if heading.startswith("api design"):
                if not inserted:
                    output.append("## API Design")
                    output.append("- Refer to teamflow_ide_prompt.md for API details.")
                    inserted = True
                skipping = True
                continue
            if skipping:
                skipping = False
            output.append(raw)
            continue
        if skipping:
            continue
        output.append(raw)
    return "\n".join(output).strip()


def _minimize_newlines(content: str) -> str:
    if not content:
        return ""
    cleaned = content.replace("\r\n", "\n")
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    return cleaned.strip()


def _strip_matching_heading(content: str, title: str) -> str:
    if not content:
        return ""
    lines = content.replace("\r\n", "\n").split("\n")
    cleaned: List[str] = []
    title_lower = title.lower()
    for raw in lines:
        line = raw.strip()
        if line.startswith("#") and title_lower in line.lower():
            continue
        cleaned.append(raw)
    return "\n".join(cleaned).strip()


def _build_cursor_prompt(run_id: str, ide_prompt: str) -> str:
    sections: List[str] = []

    def add_section(title: str, content: str, max_bullets: int, max_chars: int):
        content = _strip_matching_heading(content or "", title)
        if not content:
            sections.append(f"## {title}\n- (not available)")
            return
        compressed = _compress_markdown(content, max_bullets=max_bullets, max_chars=max_chars)
        if not compressed.startswith("#"):
            compressed = f"## {title}\n{compressed}"
        sections.append(compressed)

    raw_sections = [
        ("Product Requirements (PRD)", get_artifact(run_id, "prd") or ""),
        ("System Architecture", get_artifact(run_id, "arch") or ""),
        ("API Design", get_artifact(run_id, "api") or ""),
        ("Test Plan", get_artifact(run_id, "test") or ""),
        ("Risk Analysis", get_artifact(run_id, "risk") or ""),
        ("Tech Stack Recommendation", get_artifact(run_id, "stack") or ""),
    ]

    header = (
        "You are an engineering agent working inside an IDE. "
        "Use the summarized requirements below to start implementation. "
        "For full context, open teamflow_ide_prompt.md."
    )

    # Try progressively smaller summaries until within the Cursor limit.
    for max_bullets, max_chars in [(12, 220), (10, 180), (8, 150), (6, 120)]:
        sections = []
        for title, content in raw_sections:
            add_section(title, content, max_bullets=max_bullets, max_chars=max_chars)
        candidate = "\n\n---\n\n".join([header] + sections)
        if len(candidate) <= CURSOR_PROMPT_MAX_CHARS:
            return candidate
    return candidate


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
    max_chars = payload.max_chars or _extract_max_chars(idea)
    if payload.fast_mode:
        if max_chars is None or max_chars > 5000:
            max_chars = 5000
        set_run_meta(run_id, {"fast_mode": "true"})
    if max_chars:
        set_run_meta(run_id, {"max_chars": str(max_chars)})
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


@router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str) -> dict:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail="Run not found")
    status = get_run_status(run_id) or "unknown"
    if status in {"completed", "failed", "cancelled"}:
        return {"id": run_id, "status": status}

    set_run_status(run_id, "cancelled")
    step_statuses = get_step_statuses(run_id)
    for step in STEP_ORDER:
        current = step_statuses.get(step)
        if current in {None, "pending", "queued", "running", "unknown"}:
            set_step_status(run_id, step, "cancelled")

    append_event(
        run_id,
        {"type": "run_cancelled", "timestamp": int(time.time())},
    )
    return {"id": run_id, "status": "cancelled"}


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
    final_doc = get_artifact(run_id, "final")
    if not final_doc:
        raise HTTPException(status_code=409, detail="Run not finalized")
    if format == "md":
        return Response(content=final_doc, media_type="text/markdown; charset=utf-8")
    if format not in {"ide", "cursor"}:
        raise HTTPException(status_code=400, detail="Only md, ide, or cursor is supported in MVP")

    prompt = _load_prompt("ide_agent_prompt").strip()
    if format == "cursor":
        cursor_doc = _strip_api_design(final_doc)
        cursor_doc = _minimize_newlines(cursor_doc)
        return Response(content=cursor_doc, media_type="text/markdown; charset=utf-8")

    parts = [prompt]
    for name in ("prd", "arch", "api", "test", "risk", "stack"):
        content = get_artifact(run_id, name)
        if content:
            parts.append(content.strip())
    combined = "\n\n---\n\n".join(parts)
    headers = {"Content-Disposition": 'attachment; filename="teamflow_ide_prompt.md"'}
    return Response(content=combined, media_type="text/markdown; charset=utf-8", headers=headers)
