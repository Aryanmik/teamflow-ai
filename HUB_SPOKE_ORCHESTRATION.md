# Hub-and-Spoke Orchestration (Revision Loop)

This document describes how to evolve TeamFlow AI from a linear “one agent per step” workflow into a **hub-and-spoke orchestrator** that:

- Runs PM → Tech Lead → QA → Principal Engineer → Reviewer
- Performs **1 (default) configurable revision cycle**
- Produces final artifacts and a consolidated Markdown export
- Emits **traceable, readable back-and-forth collaboration logs** (server logs only; no new API endpoints)

## Goals

- **Iteration:** Agents should critique and revise outputs (not just hand off once).
- **Bounded runtime:** Keep the loop small (default 1 cycle; optional 2 via env).
- **Transparency:** Log who asked what, who responded, and what changed.
- **Minimal API surface change:** Keep existing endpoints; use Redis for ephemeral state.

## Pattern: Hub (Orchestrator) + Spokes (Specialists)

We use a single **Orchestrator** task that coordinates specialist agents:

- **Product Manager** (PM): PRD
- **Tech Lead** (TL): Architecture + API
- **QA Engineer** (QA): Test plan + risks
- **Principal Engineer** (PE): Tech stack recommendation + engineering critique
- **Reviewer** (RV): Cross-artifact consistency review and final issues list

“Hub-and-spoke” means the orchestrator decides what to run next and what to revise, using specialist agents as callable workers.

## Inputs / Outputs

### Inputs
- User idea (`run:{id}:idea`)

### Stored artifacts (Redis, TTL’d)
- `prd`: Product Requirements
- `arch`: System Architecture
- `api`: API Design
- `test`: Test Plan
- `risk`: Risk Analysis
- `stack`: Tech stack recommendation (from Principal Engineer)
- `review`: Review Notes (from Reviewer)
- `final`: Consolidated Markdown export

### Step statuses
- `pm`, `tech`, `qa`, `principal`, `review`, `finalize`

## Revision cycle (default 1)

At a high level:

1. **PM** produces PRD from idea.
2. **Tech Lead** produces Architecture + API from PRD.
3. **QA** produces Test Plan + Risks from PRD + Arch + API.
4. **Principal Engineer** produces:
   - Recommended stack (frontend/backend/storage/hosting/CI)
   - Engineering concerns & suggested changes
5. **Revision loop (N=1 by default):**
   - Tech Lead revises Architecture + API using QA + PE feedback.
   - (Fast mode) QA/PE are not re-run; their initial outputs are treated as feedback inputs for the revision.
6. **Reviewer** runs on PRD + (revised) Arch/API + QA + Stack to produce final review notes.
7. **Finalize** concatenates artifacts into the export.

### Why revise Tech (and not PM)?

For MVP runtime and simplicity: most actionable feedback from QA/PE maps to architecture and APIs. PM revisions can be added later as an extra loop if needed.

## Logging “conversation”

We don’t add a new endpoint for transcripts; we log to server logs only (Celery worker logs).

For every agent call, we log:

- `iteration=<n> from=<orchestrator> to=<agent> reason=<why>`
- Prompt “context snapshot” (truncated)
- Agent output (truncated)

This gives you readable “back-and-forth” evidence in `logs/celery.log`.

Optionally, the same items can also be appended as SSE events using the existing `/events` stream, but that is not required.

## Configuration (env vars)

- `TEAMFLOW_REVISION_CYCLES` (default `1`)
  - number of revision loops (recommended 1–2)
- `TEAMFLOW_LOG_AGENT_PAYLOADS`, `TEAMFLOW_LOG_MAX_CHARS`, `TEAMFLOW_AGENT_LOG_LEVEL`
  - control how much “conversation” appears in logs

## Regenerate behavior

When regenerating a step:

- Clear downstream artifacts from that step onward.
- Re-run the orchestrator starting at that step.

Example:
- Regenerate `qa` clears `test`, `risk`, `stack`, `review`, `final`.
- Orchestrator resumes from QA, then re-does PE, revision loop, Reviewer, Finalize.

## Implementation sketch

- Replace the current Celery `chain(pm_step → tech_step → qa_step → review_step → finalize)` with:
  - `orchestrate_run(run_id, start_step="pm")`
  - `finalize(run_id)`

Where `orchestrate_run`:
- Determines what to run based on `start_step`
- Calls the Agents SDK for each specialist
- Persists artifacts and step statuses
- Runs the revision loop
