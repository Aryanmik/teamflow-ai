import dataclasses
import logging
import os
import re
import time
from pathlib import Path
from typing import Tuple

from agents import Agent, ModelSettings, Runner, enable_verbose_stdout_logging, trace
from agents.models.default_models import get_default_model_settings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from .celery_app import celery_app
from .storage import (
    append_event,
    get_run_status,
    get_artifact,
    get_idea,
    set_artifact,
    set_run_status,
    set_step_status,
)

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
REVIEW_ENABLED = os.getenv("REVIEW_ENABLED", "false").lower() in {"1", "true", "yes"}

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
OPENAI_AGENT_MAX_TURNS = int(os.getenv("OPENAI_AGENT_MAX_TURNS", "12"))
TEAMFLOW_REVISION_CYCLES = max(0, int(os.getenv("TEAMFLOW_REVISION_CYCLES", "1")))
OPENAI_AGENT_VERBOSE_LOGS = os.getenv("OPENAI_AGENTS_VERBOSE_LOGS", "false").lower() in {
    "1",
    "true",
    "yes",
}
OPENAI_AGENT_TRACE = os.getenv("OPENAI_AGENTS_TRACE", "false").lower() in {
    "1",
    "true",
    "yes",
}
TEAMFLOW_LOG_AGENT_PAYLOADS = os.getenv(
    "TEAMFLOW_LOG_AGENT_PAYLOADS", "true"
).lower() in {"1", "true", "yes"}
TEAMFLOW_LOG_MAX_CHARS = int(os.getenv("TEAMFLOW_LOG_MAX_CHARS", "4000"))
TEAMFLOW_AGENT_LOG_LEVEL = os.getenv("TEAMFLOW_AGENT_LOG_LEVEL", "INFO").upper()
TEAMFLOW_SSE_AGENT_EVENTS = os.getenv("TEAMFLOW_SSE_AGENT_EVENTS", "true").lower() in {
    "1",
    "true",
    "yes",
}
# Keep transcript-like content out of the API by default. Frontend only gets metadata unless enabled.
TEAMFLOW_SSE_AGENT_PREVIEW_CHARS = max(
    0, int(os.getenv("TEAMFLOW_SSE_AGENT_PREVIEW_CHARS", "0"))
)

logger = logging.getLogger("teamflow.agents")
logger.setLevel(getattr(logging, TEAMFLOW_AGENT_LOG_LEVEL, logging.INFO))

if OPENAI_AGENT_VERBOSE_LOGS:
    enable_verbose_stdout_logging()


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
    missing = re.findall(r"\$[A-Za-z_]+", rendered)
    if missing:
        logger.warning("Prompt rendering left placeholders unresolved: %s", missing)
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


def _log_payload(label: str, payload: str) -> None:
    if not TEAMFLOW_LOG_AGENT_PAYLOADS:
        return
    if payload is None:
        logger.info("%s: <none>", label)
        return
    text = payload.strip()
    if not text:
        logger.info("%s: <empty>", label)
        return
    if len(text) > TEAMFLOW_LOG_MAX_CHARS:
        logger.info(
            "%s (truncated to %s chars): %s",
            label,
            TEAMFLOW_LOG_MAX_CHARS,
            text[:TEAMFLOW_LOG_MAX_CHARS],
        )
        return
    logger.info("%s: %s", label, text)


def _build_model_settings() -> ModelSettings:
    base = get_default_model_settings(OPENAI_MODEL)
    return dataclasses.replace(base, temperature=OPENAI_TEMPERATURE)


def _run_agent(
    role: str,
    prompt: str,
    run_id: str,
    step: str,
    *,
    iteration: int = 0,
    reason: str = "",
) -> str:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set")
    agent = Agent(
        name=role,
        instructions=prompt,
        model=OPENAI_MODEL,
        model_settings=_build_model_settings(),
    )
    logger.info(
        "ORCH iteration=%s from=Orchestrator to=%s step=%s run_id=%s reason=%s",
        iteration,
        role,
        step,
        run_id,
        reason,
    )
    if TEAMFLOW_SSE_AGENT_EVENTS:
        append_event(
            run_id,
            {
                "type": "agent_to",
                "from": "Orchestrator",
                "to": role,
                "step": step,
                "iteration": iteration,
                "reason": reason,
                "timestamp": int(time.time()),
            },
        )
    _log_payload(f"{role} prompt", prompt)
    input_text = "Generate the requested output."
    if OPENAI_AGENT_TRACE:
        with trace(
            f"TeamFlow {role}",
            metadata={"run_id": run_id, "step": step, "agent": role},
        ) as agent_trace:
            logger.info("Trace started for %s: %s", role, agent_trace.trace_id)
            result = Runner.run_sync(agent, input_text, max_turns=OPENAI_AGENT_MAX_TURNS)
    else:
        result = Runner.run_sync(agent, input_text, max_turns=OPENAI_AGENT_MAX_TURNS)
    output = result.final_output if hasattr(result, "final_output") else result
    output_text = "" if output is None else str(output)
    _log_payload(f"{role} output", output_text)
    if TEAMFLOW_SSE_AGENT_EVENTS:
        event = {
            "type": "agent_from",
            "from": role,
            "to": "Orchestrator",
            "step": step,
            "iteration": iteration,
            "timestamp": int(time.time()),
        }
        if TEAMFLOW_SSE_AGENT_PREVIEW_CHARS and output_text:
            event["preview"] = output_text.strip()[:TEAMFLOW_SSE_AGENT_PREVIEW_CHARS]
        append_event(run_id, event)
    return output_text.strip()


def _join_feedback(*parts: str) -> str:
    return "\n\n---\n\n".join([p for p in parts if p])


def _run_started(run_id: str, *, start_step: str) -> None:
    set_run_status(run_id, "running")
    append_event(
        run_id,
        {
            "type": "run_started",
            "start_step": start_step,
            "timestamp": int(time.time()),
        },
    )


@celery_app.task
def orchestrate_run(run_id: str, start_step: str = "pm") -> None:
    """
    Hub-and-spoke orchestrator with a bounded revision loop.

    Steps:
      PM -> Tech -> QA -> Principal Engineer -> (revise Tech N times) -> Reviewer
    """
    steps = ["pm", "tech", "qa", "principal", "review"]
    if start_step not in steps:
        raise ValueError("Unknown step")

    if start_step != "pm":
        _run_started(run_id, start_step=start_step)

    current_step = start_step
    try:
        if get_run_status(run_id) == "cancelled":
            return
        # 1) PM (PRD)
        if steps.index(start_step) <= steps.index("pm"):
            if get_run_status(run_id) == "cancelled":
                return
            step = "pm"
            current_step = step
            _start_step(run_id, step)
            idea = get_idea(run_id) or ""
            logger.info("PM received idea for run_id=%s", run_id)
            _log_payload("Idea", idea)
            template = _load_prompt("pm")
            prompt = _render_prompt(template, idea=idea)
            prd = _run_agent(
                "Product Manager",
                prompt,
                run_id,
                step,
                iteration=0,
                reason="Generate initial PRD from user idea",
            )
            prd = _ensure_heading(prd, "Product Requirements (PRD)")
            set_artifact(run_id, "prd", prd)
            _finish_step(run_id, step, "completed")

        prd = get_artifact(run_id, "prd") or ""

        # 2) Tech (Architecture + API)
        if steps.index(start_step) <= steps.index("tech"):
            if get_run_status(run_id) == "cancelled":
                return
            step = "tech"
            current_step = step
            _start_step(run_id, step)
            logger.info("TECH received PRD for run_id=%s", run_id)
            _log_payload("PRD input", prd)
            template = _load_prompt("tech")
            prompt = _render_prompt(template, prd=prd)
            content = _run_agent(
                "Tech Lead",
                prompt,
                run_id,
                step,
                iteration=0,
                reason="Generate initial architecture + API from PRD",
            )
            arch, api = _split_sections(content, "System Architecture", "API Design")
            if not api:
                api = "# API Design\n\n- Model output did not include an API Design section."
            set_artifact(run_id, "arch", arch)
            set_artifact(run_id, "api", api)
            _finish_step(run_id, step, "completed")

        arch = get_artifact(run_id, "arch") or ""
        api = get_artifact(run_id, "api") or ""

        # 3) QA (Test + Risks)
        if steps.index(start_step) <= steps.index("qa"):
            if get_run_status(run_id) == "cancelled":
                return
            step = "qa"
            current_step = step
            _start_step(run_id, step)
            logger.info("QA received artifacts for run_id=%s", run_id)
            _log_payload("Architecture input", arch)
            _log_payload("API input", api)
            template = _load_prompt("qa")
            prompt = _render_prompt(template, prd=prd, arch=arch, api=api)
            content = _run_agent(
                "QA Engineer",
                prompt,
                run_id,
                step,
                iteration=0,
                reason="Generate initial test plan + risks from PRD + architecture + API",
            )
            test_plan, risks = _split_sections(content, "Test Plan", "Risk Analysis")
            if not risks:
                risks = (
                    "# Risk Analysis\n\n- Model output did not include a Risk Analysis section."
                )
            set_artifact(run_id, "test", test_plan)
            set_artifact(run_id, "risk", risks)
            _finish_step(run_id, step, "completed")

        test_plan = get_artifact(run_id, "test") or ""
        risks = get_artifact(run_id, "risk") or ""

        # 4) Principal Engineer (Stack + feedback)
        if steps.index(start_step) <= steps.index("principal"):
            if get_run_status(run_id) == "cancelled":
                return
            step = "principal"
            current_step = step
            _start_step(run_id, step)
            template = _load_prompt("principal_engineer")
            prompt = _render_prompt(
                template, prd=prd, arch=arch, api=api, test=test_plan, risk=risks
            )
            stack = _run_agent(
                "Principal Engineer",
                prompt,
                run_id,
                step,
                iteration=0,
                reason="Recommend tech stack and provide engineering feedback",
            )
            stack = _ensure_heading(stack, "Tech Stack Recommendation")
            set_artifact(run_id, "stack", stack)
            _finish_step(run_id, step, "completed")

        # If we're regenerating only the review step, skip the revision loop.
        if start_step == "review":
            if get_run_status(run_id) == "cancelled":
                return
            if not REVIEW_ENABLED:
                set_step_status(run_id, "review", "skipped")
                return
            step = "review"
            current_step = step
            _start_step(run_id, step)
            prd = get_artifact(run_id, "prd") or ""
            arch = get_artifact(run_id, "arch") or ""
            api = get_artifact(run_id, "api") or ""
            test_plan = get_artifact(run_id, "test") or ""
            risks = get_artifact(run_id, "risk") or ""
            stack = get_artifact(run_id, "stack") or ""
            template = _load_prompt("reviewer")
            prompt = _render_prompt(
                template,
                prd=prd,
                arch=arch,
                api=api,
                test=test_plan,
                risk=risks,
                stack=stack,
            )
            review = _run_agent(
                "Reviewer",
                prompt,
                run_id,
                step,
                iteration=0,
                reason="Review artifacts for consistency and gaps (regenerate review only)",
            )
            review = _ensure_heading(review, "Review Notes")
            set_artifact(run_id, "review", review)
            _finish_step(run_id, step, "completed")
            return

        # 5) Revision loop (bounded)
        for iteration in range(1, TEAMFLOW_REVISION_CYCLES + 1):
            if get_run_status(run_id) == "cancelled":
                return
            if TEAMFLOW_SSE_AGENT_EVENTS:
                append_event(
                    run_id,
                    {
                        "type": "revision_started",
                        "step": "tech",
                        "iteration": iteration,
                        "timestamp": int(time.time()),
                    },
                )
            prd = get_artifact(run_id, "prd") or ""
            arch = get_artifact(run_id, "arch") or ""
            api = get_artifact(run_id, "api") or ""
            test_plan = get_artifact(run_id, "test") or ""
            risks = get_artifact(run_id, "risk") or ""
            stack = get_artifact(run_id, "stack") or ""

            qa_feedback = _join_feedback(test_plan, risks)
            pe_feedback = stack

            # Tech revision (fast loop): revise arch/api using QA+PE feedback, without re-running QA/PE.
            step = "tech"
            current_step = step
            _start_step(run_id, step)
            template = _load_prompt("tech_revision")
            prompt = _render_prompt(
                template,
                prd=prd,
                arch=arch,
                api=api,
                qa_feedback=qa_feedback,
                pe_feedback=pe_feedback,
                iteration=str(iteration),
            )
            content = _run_agent(
                "Tech Lead",
                prompt,
                run_id,
                step,
                iteration=iteration,
                reason="Revise architecture + API based on QA + Principal feedback",
            )
            new_arch, new_api = _split_sections(
                content, "System Architecture", "API Design"
            )
            if not new_api:
                new_api = "# API Design\n\n- Model output did not include an API Design section."
            set_artifact(run_id, "arch", new_arch)
            set_artifact(run_id, "api", new_api)
            _finish_step(run_id, step, "completed")
            if TEAMFLOW_SSE_AGENT_EVENTS:
                append_event(
                    run_id,
                    {
                        "type": "revision_completed",
                        "step": "tech",
                        "iteration": iteration,
                        "timestamp": int(time.time()),
                    },
                )

        # 6) Reviewer (final)
        if REVIEW_ENABLED:
            if get_run_status(run_id) == "cancelled":
                return
            step = "review"
            current_step = step
            _start_step(run_id, step)
            prd = get_artifact(run_id, "prd") or ""
            arch = get_artifact(run_id, "arch") or ""
            api = get_artifact(run_id, "api") or ""
            test_plan = get_artifact(run_id, "test") or ""
            risks = get_artifact(run_id, "risk") or ""
            stack = get_artifact(run_id, "stack") or ""
            template = _load_prompt("reviewer")
            prompt = _render_prompt(
                template,
                prd=prd,
                arch=arch,
                api=api,
                test=test_plan,
                risk=risks,
                stack=stack,
            )
            review = _run_agent(
                "Reviewer",
                prompt,
                run_id,
                step,
                iteration=TEAMFLOW_REVISION_CYCLES,
                reason="Final cross-artifact review after revisions",
            )
            review = _ensure_heading(review, "Review Notes")
            set_artifact(run_id, "review", review)
            _finish_step(run_id, step, "completed")
        else:
            set_step_status(run_id, "review", "skipped")

    except Exception as exc:
        # Best effort: mark the current step failed.
        _fail_step(run_id, current_step, exc)
        raise


@celery_app.task
def pm_step(run_id: str) -> None:
    step = "pm"
    _start_step(run_id, step)
    try:
        idea = get_idea(run_id) or ""
        logger.info("PM received idea for run_id=%s", run_id)
        _log_payload("Idea", idea)
        template = _load_prompt("pm")
        prompt = _render_prompt(template, idea=idea)
        content = _run_agent("Product Manager", prompt, run_id, step)
        content = _ensure_heading(content, "Product Requirements (PRD)")
        set_artifact(run_id, "prd", content)
        logger.info("PM -> TECH handoff prepared for run_id=%s", run_id)
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
        logger.info("TECH received PRD for run_id=%s", run_id)
        _log_payload("PRD input", prd)
        template = _load_prompt("tech")
        prompt = _render_prompt(template, prd=prd)
        content = _run_agent("Tech Lead", prompt, run_id, step)
        arch, api = _split_sections(content, "System Architecture", "API Design")
        if not api:
            api = "# API Design\n\n- Model output did not include an API Design section."
        set_artifact(run_id, "arch", arch)
        set_artifact(run_id, "api", api)
        logger.info("TECH -> QA handoff prepared for run_id=%s", run_id)
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
        logger.info("QA received artifacts for run_id=%s", run_id)
        _log_payload("Architecture input", arch)
        _log_payload("API input", api)
        template = _load_prompt("qa")
        prompt = _render_prompt(template, prd=prd, arch=arch, api=api)
        content = _run_agent("QA Engineer", prompt, run_id, step)
        test_plan, risks = _split_sections(content, "Test Plan", "Risk Analysis")
        if not risks:
            risks = "# Risk Analysis\n\n- Model output did not include a Risk Analysis section."
        set_artifact(run_id, "test", test_plan)
        set_artifact(run_id, "risk", risks)
        logger.info("QA -> REVIEW handoff prepared for run_id=%s", run_id)
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
        stack = get_artifact(run_id, "stack") or ""
        logger.info("REVIEW received artifacts for run_id=%s", run_id)
        _log_payload("PRD input", prd)
        _log_payload("Architecture input", arch)
        _log_payload("API input", api)
        _log_payload("Test plan input", test)
        _log_payload("Risk input", risk)
        _log_payload("Stack input", stack)
        template = _load_prompt("reviewer")
        prompt = _render_prompt(
            template, prd=prd, arch=arch, api=api, test=test, risk=risk, stack=stack
        )
        review = _run_agent("Reviewer", prompt, run_id, step)
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
        if get_run_status(run_id) == "cancelled":
            return
        parts = []
        for name in ("prd", "arch", "api", "test", "risk", "stack", "review"):
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
