import time

from .celery_app import celery_app
from .storage import (
    append_event,
    get_artifact,
    get_idea,
    set_artifact,
    set_run_status,
    set_step_status,
)


def _start_step(run_id: str, step: str) -> None:
    if step == "pm":
        set_run_status(run_id, "running")
        append_event(run_id, {"type": "run_started", "timestamp": int(time.time())})
    set_step_status(run_id, step, "running")
    append_event(
        run_id,
        {"type": "step_started", "step": step, "timestamp": int(time.time())},
    )


def _finish_step(run_id: str, step: str, status: str) -> None:
    set_step_status(run_id, step, status)
    append_event(
        run_id,
        {"type": f"step_{status}", "step": step, "timestamp": int(time.time())},
    )


def _fail_step(run_id: str, step: str, exc: Exception) -> None:
    set_step_status(run_id, step, "failed")
    set_run_status(run_id, "failed")
    append_event(
        run_id,
        {
            "type": "step_failed",
            "step": step,
            "error": str(exc),
            "timestamp": int(time.time()),
        },
    )


@celery_app.task
def pm_step(run_id: str) -> None:
    step = "pm"
    _start_step(run_id, step)
    try:
        idea = get_idea(run_id) or ""
        content = (
            "# Product Requirements (PRD)\n\n"
            f"## Idea\n{idea}\n\n"
            "## Notes\n- Stub output. Replace with LLM response using prompts/pm.md\n"
        )
        set_artifact(run_id, "prd", content)
        _finish_step(run_id, step, "completed")
    except Exception as exc:
        _fail_step(run_id, step, exc)
        raise


@celery_app.task
def tech_step(run_id: str) -> None:
    step = "tech"
    _start_step(run_id, step)
    try:
        prd = get_artifact(run_id, "prd") or ""
        arch = (
            "# System Architecture\n\n"
            "## Summary\n- Stub output. Replace with LLM response using prompts/tech.md\n\n"
            f"## PRD Snapshot\n{prd}\n"
        )
        api = (
            "# API Design\n\n"
            "## Summary\n- Stub output. Replace with LLM response using prompts/tech.md\n"
        )
        set_artifact(run_id, "arch", arch)
        set_artifact(run_id, "api", api)
        _finish_step(run_id, step, "completed")
    except Exception as exc:
        _fail_step(run_id, step, exc)
        raise


@celery_app.task
def qa_step(run_id: str) -> None:
    step = "qa"
    _start_step(run_id, step)
    try:
        arch = get_artifact(run_id, "arch") or ""
        test_plan = (
            "# Test Plan\n\n"
            "## Summary\n- Stub output. Replace with LLM response using prompts/qa.md\n\n"
            f"## Architecture Snapshot\n{arch}\n"
        )
        risks = (
            "# Risk Analysis\n\n"
            "## Summary\n- Stub output. Replace with LLM response using prompts/qa.md\n"
        )
        set_artifact(run_id, "test", test_plan)
        set_artifact(run_id, "risk", risks)
        _finish_step(run_id, step, "completed")
    except Exception as exc:
        _fail_step(run_id, step, exc)
        raise


@celery_app.task
def review_step(run_id: str) -> None:
    step = "review"
    _start_step(run_id, step)
    try:
        prd = get_artifact(run_id, "prd") or ""
        arch = get_artifact(run_id, "arch") or ""
        api = get_artifact(run_id, "api") or ""
        test = get_artifact(run_id, "test") or ""
        risk = get_artifact(run_id, "risk") or ""
        review = (
            "# Review Notes\n\n"
            "## Summary\n- Stub output. Replace with LLM response using prompts/reviewer.md\n\n"
            "## Artifacts Reviewed\n"
            f"- PRD: {bool(prd)}\n- Architecture: {bool(arch)}\n"
            f"- API: {bool(api)}\n- Test Plan: {bool(test)}\n- Risks: {bool(risk)}\n"
        )
        set_artifact(run_id, "review", review)
        _finish_step(run_id, step, "completed")
    except Exception as exc:
        _fail_step(run_id, step, exc)
        raise


@celery_app.task
def finalize(run_id: str) -> None:
    step = "finalize"
    try:
        parts = []
        for name in ("prd", "arch", "api", "test", "risk", "review"):
            content = get_artifact(run_id, name)
            if content:
                parts.append(content)
        final_doc = "\n\n---\n\n".join(parts) if parts else ""
        set_artifact(run_id, "final", final_doc)
        set_run_status(run_id, "completed")
        append_event(run_id, {"type": "run_completed", "timestamp": int(time.time())})
    except Exception as exc:
        _fail_step(run_id, step, exc)
        raise
