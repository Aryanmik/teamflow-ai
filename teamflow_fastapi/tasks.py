import os
import re
import time
from pathlib import Path
from typing import Tuple

from openai import OpenAI

from .celery_app import celery_app
from .storage import (
    append_event,
    get_artifact,
    get_idea,
    set_artifact,
    set_run_status,
    set_step_status,
)

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
OPENAI_MAX_RETRIES = int(os.getenv("OPENAI_MAX_RETRIES", "2"))
OPENAI_RETRY_BACKOFF_SECONDS = float(
    os.getenv("OPENAI_RETRY_BACKOFF_SECONDS", "2.0")
)

_client = OpenAI()


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


def _load_prompt(name: str) -> str:
    path = PROMPT_DIR / f"{name}.md"
    return path.read_text(encoding="utf-8")


def _render_prompt(template: str, **kwargs: str) -> str:
    rendered = template
    for key, value in kwargs.items():
        rendered = rendered.replace(f"${key}", value)
    return rendered


def _ensure_heading(content: str, heading: str) -> str:
    if not content:
        return f"# {heading}"
    pattern = re.compile(rf"(?im)^#{1,6}\s*{re.escape(heading)}\s*$")
    if pattern.search(content):
        return content.strip()
    return f"# {heading}\n\n{content.strip()}"


def _split_sections(
    content: str, primary_heading: str, secondary_heading: str
) -> Tuple[str, str]:
    if not content:
        return "", ""
    pattern = re.compile(rf"(?im)^#{1,6}\s*{re.escape(secondary_heading)}\s*$")
    match = pattern.search(content)
    if not match:
        first = _ensure_heading(content.strip(), primary_heading)
        return first, ""
    first = content[: match.start()].strip()
    second = content[match.start() :].strip()
    first = _ensure_heading(first, primary_heading)
    second = _ensure_heading(second, secondary_heading)
    return first, second


def _call_llm(prompt: str) -> str:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set")
    last_exc: Exception | None = None
    for attempt in range(OPENAI_MAX_RETRIES + 1):
        try:
            response = _client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized agent. Follow the prompt exactly.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=OPENAI_TEMPERATURE,
            )
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("Empty response from model")
            return content.strip()
        except Exception as exc:
            last_exc = exc
            if attempt >= OPENAI_MAX_RETRIES:
                break
            time.sleep(OPENAI_RETRY_BACKOFF_SECONDS * (2**attempt))
    raise last_exc or RuntimeError("OpenAI call failed")


@celery_app.task
def pm_step(run_id: str) -> None:
    step = "pm"
    _start_step(run_id, step)
    try:
        idea = get_idea(run_id) or ""
        template = _load_prompt("pm")
        prompt = _render_prompt(template, idea=idea)
        content = _call_llm(prompt)
        content = _ensure_heading(content, "Product Requirements (PRD)")
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
        template = _load_prompt("tech")
        prompt = _render_prompt(template, prd=prd)
        content = _call_llm(prompt)
        arch, api = _split_sections(content, "System Architecture", "API Design")
        if not api:
            api = "# API Design\n\n- Model output did not include an API Design section."
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
        prd = get_artifact(run_id, "prd") or ""
        api = get_artifact(run_id, "api") or ""
        template = _load_prompt("qa")
        prompt = _render_prompt(template, prd=prd, arch=arch, api=api)
        content = _call_llm(prompt)
        test_plan, risks = _split_sections(content, "Test Plan", "Risk Analysis")
        if not risks:
            risks = "# Risk Analysis\n\n- Model output did not include a Risk Analysis section."
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
        template = _load_prompt("reviewer")
        prompt = _render_prompt(
            template, prd=prd, arch=arch, api=api, test=test, risk=risk
        )
        review = _call_llm(prompt)
        review = _ensure_heading(review, "Review Notes")
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
