# TeamFlow IDE Agent Prompt

You are an engineering agent working inside an IDE. Use the provided TeamFlow outputs to begin implementation.

## Inputs
- `teamflow_output.md` (primary artifact bundle)
- `teamflow_output.ipynb` (same content, notebook format)

## Your job
1. Read the outputs and summarize the product scope and constraints.
2. Propose a concrete implementation plan (modules, endpoints, UI flows).
3. Identify any missing requirements and ask clarifying questions.
4. Start scaffolding the project structure and key files.
5. Keep the work aligned to the MVP scope.

## Output expectations
- Use actionable steps.
- Prefer small, testable increments.
- Call out risk areas (auth, data modeling, concurrency, cost, privacy).
- Avoid inventing requirements not present in the artifacts.

## Quick-start for Cursor / VS Code
1. Open the folder containing the downloaded ZIP.
2. Unzip it into a new workspace directory.
3. Open the workspace in your IDE.
4. Load `teamflow_output.md` and begin implementation.

---

# Product Requirements (PRD)

## 1) Product Overview
- Web-based B2B onboarding portal for HR teams to manage new hire onboarding in one place
- Collect required documents and forms from new hires with guided tasks
- Provide real-time progress tracking across hires, departments, and locations
- Sync completed onboarding data to payroll systems to reduce manual entry

## 2) Problem Statement
- HR teams chase documents via email/spreadsheets, causing delays and errors
- New hires lack clarity on what’s required and when, leading to incomplete onboarding
- Compliance-sensitive documents are stored inconsistently and are hard to audit
- Payroll setup is often duplicated manually, increasing time-to-first-pay risk

## 3) Goals & Success Metrics
- Reduce average onboarding completion time (e.g., days from offer accepted to “ready for payroll”)
- Increase on-time completion rate of required documents before start date
- Decrease HR time spent per hire on follow-ups and data entry
- Reduce payroll setup errors and first-pay issues attributable to onboarding data

## 4) Target Users
- HR admins/coordinators managing onboarding tasks and documents
- Hiring managers needing visibility into readiness (limited view)
- New hires completing tasks, uploading documents, and e-signing forms
- Payroll/finance admins receiving finalized data for payroll setup

## 5) Key Features
- Configurable onboarding checklists by role/location/employment type
- Secure document collection (upload, form completion, e-signature where applicable)
- Progress dashboard with statuses, due dates, and automated reminders
- Audit trail for submissions, approvals, and changes
- Payroll integration to export/sync key employee data and completed forms

## 6) User Flow
- HR creates onboarding package → assigns to new hire
- New hire receives invite → completes profile, tasks, and document uploads
- HR reviews submissions → requests corrections or approves
- Portal marks hire “ready” when requirements met → triggers payroll sync/export
- HR monitors overall progress via dashboard and reports

## 7) Functional Requirements
- HR can create/edit onboarding templates with required tasks, due dates, and rules
- New hires can securely submit documents/forms and see remaining tasks
- System sends configurable reminders and notifications to new hires and HR
- HR can review, approve/reject, comment, and track version history per document
- Payroll handoff supports mapping required fields and exporting/syncing completion status

## 8) Non-Functional Requirements
- Security: role-based access, encryption in transit/at rest, secure document storage
- Compliance: audit logs, retention controls, and access reporting
- Reliability: high availability during business hours; graceful handling of integration failures
- Usability: mobile-friendly new hire experience; accessible UI
- Scalability: support multiple client organizations with isolated data

## 9) MVP Scope
- HR onboarding templates + assignment to hires
- New hire task list with document upload and basic form capture
- HR review/approve workflow + progress dashboard
- Automated email reminders and status notifications
- Payroll export (file-based) for core fields + onboarding completion status

## 10) Future Roadmap
- Direct payroll integrations (bi-directional sync, multiple providers)
- Built-in e-signature and form library (e.g., tax, direct deposit, policy acknowledgments)
- Advanced reporting (bottlenecks, cohort analytics) and SLA tracking
- Manager onboarding tasks (equipment, accounts) and IT ticketing integrations
- Localization, multi-language support, and region-specific compliance packs

---

# System Architecture

# System Architecture

## Components (MVP, repo stack)
- **Web Frontend (SPA)**: HR/Admin + New Hire portals; Manager limited view.
- **Backend API**: FastAPI (REST) with RBAC guards + tenant scoping middleware.
- **Workers**: Celery + Redis broker for reminders, readiness recompute, exports, email retries, scan callbacks.
- **Storage**
  - **Postgres**: core data + append-only audit + idempotency keys.
  - **Object Storage (S3)**: encrypted (SSE-KMS) documents + exports; per-tenant prefixes.
  - **Redis**: Celery broker, rate limits, short-lived tokens.
- **Email**: SES/SendGrid.
- **Malware scanning (MVP hook)**: upload to **quarantine prefix**; scanner posts callback; only then copy/move to **clean prefix**.

## Hard requirements addressed
- **Tenant isolation**: tenant derived from JWT; never accepted from client. Data-access layer requires `tenant_id` for every query. Object keys always `t/{tenant_id}/...`.
- **Template version pinning**: assignment stores `template_id` + `template_version`; each `task_instance` stores both.
- **Document lifecycle + scan gating**
  - `document_versions.scan_status`: `UPLOADING -> UPLOADED -> SCANNING -> CLEAN|INFECTED`
  - Downloads blocked unless `CLEAN`.
- **Idempotency**: persisted per tenant+endpoint+key; safe retries for exports, resend-invite, reviews, complete-upload.
- **Readiness**: event-driven recompute (enqueue on task/doc/review changes) + nightly reconciliation job; store blocking reasons.

## Key tables (additions/changes)
- `tenants(id, name, timezone, settings_json)`
- `template_tasks(..., template_version)`
- `hire_assignments(id, tenant_id, hire_id, template_id, template_version, assigned_at)`
- `task_instances(..., template_id, template_version, status, due_date_utc, blocking_reason_json)`
- `document_versions(..., quarantine_key, clean_key, scan_status, scan_result_json, scanned_at)`
- `exports(..., status, storage_key, kms_key_id, created_by, created_at)`
- `idempotency_keys(id, tenant_id, endpoint, key, request_hash, response_json, status, created_at, expires_at)` with unique `(tenant_id, endpoint, key)`
- `audit_events(...)` append-only; include export download events.

## Worker flows (idempotent)
- **On upload complete**: mark `UPLOADED`, enqueue `scan_document(version_id)`.
- **On scan callback**: set `CLEAN/INFECTED`; if clean, move/copy to clean prefix; enqueue readiness recompute.
- **On task/review changes**: enqueue `recompute_hire_readiness(hire_id)` (dedup by hire_id+version counter).
- **Exports**: `create_export` enqueues job; job writes CSV to S3 (SSE-KMS), updates status; failures retry then DLQ.

---

# API Design

## Conventions
- Auth: `Authorization: Bearer <JWT>`; tenant from token.
- Idempotency: `Idempotency-Key` header required on selected POSTs (below). Server stores and replays response on retry.
- Pagination: `limit` + `cursor` (opaque). Responses: `{ items: [...], nextCursor: "..." }`.

## Auth & Invites
- `POST /auth/login`
- `POST /auth/invite/accept`
- `POST /hires/{hireId}/resend-invite` (HR) **requires `Idempotency-Key`**, throttled.

## Templates (versioned)
- `GET /templates?limit=&cursor=`
- `POST /templates`
- `PUT /templates/{id}` → creates new version (does not affect existing assignments)
- `GET /templates/{id}/versions?limit=&cursor=`

## Hires & Assignment
- `POST /hires`
- `GET /hires/{id}` (role-filtered)
- `GET /hires?status=&location=&limit=&cursor=`
- `POST /hires/{id}/assign-template`
  - Req: `{ "templateId":"...", "templateVersion": 3 }`
  - Pins version; instantiates tasks with `due_date_utc` computed using tenant timezone day boundaries.

## Tasks
- `GET /hires/{hireId}/tasks`
- `PATCH /tasks/{taskId}` (form data only; does not implicitly “submit”)
- `POST /tasks/{taskId}/submit` (explicit transition; validates required fields/docs present)

## Documents (upload, scan, download)
- `POST /tasks/{taskId}/documents/upload-url`
  - Returns presigned PUT to **quarantine_key**; creates `document` + `version` in `UPLOADING`.
- `POST /documents/{documentId}/complete-upload` **idempotent**
  - Req: `{ "versionId":"...", "sha256":"..." }`
  - Sets `UPLOADED`, enqueues scan; repeated call with same payload returns 200.
- `GET /documents/{documentId}` (metadata + versions incl. scan_status)
- `GET /documents/{documentId}/download-url?versionId=...`
  - **403/409** unless version `scan_status=CLEAN`; returns short-lived presigned GET to `clean_key`.

## Reviews (HR)
- `POST /tasks/{taskId}/review` **requires `Idempotency-Key`**
  - Req: `{ "decision":"APPROVE|REJECT|REQUEST_CHANGES", "comment":"..." }`
  - Valid only when task is `SUBMITTED`; emits audit; enqueues readiness recompute.

## Audit
- `GET /audit-events?entityType=&entityId=&limit=&cursor=`

## Payroll Export (file-based)
- `POST /exports/payroll` **requires `Idempotency-Key`**
  - Req: `{ "hireIds":[...], "format":"CSV", "fieldMapping":{...} }`
  - 202 with `{ exportId, status }`; audit `EXPORT_CREATED`.
- `GET /exports/{exportId}`
- `POST /exports/{exportId}/download-url`
  - Generates short-lived URL; audit `EXPORT_DOWNLOADED` (who/when/exportId). Only when `DONE`.

## Errors (selected)
- `409` invalid state transition (e.g., review when not SUBMITTED; download before CLEAN/DONE)
- `429` rate limited (login, upload-url, resend-invite, exports)
- `403` RBAC/tenant violations (including MANAGER blocked from document endpoints)

---

# API Design

- Model output did not include an API Design section.

---

# Test Plan

# Test Plan

- **Scope & environments**
  - MVP flows: templates → hire assignment → invite/accept → task completion (form + doc) → HR review → READY_FOR_PAYROLL → payroll export.
  - Envs: staging with real email sandbox, object storage, queue/worker, malware-scan callback stub; prod-like RBAC/tenant data.

- **Functional tests (API + UI)**
  - **Auth**
    - Login success/fail, token expiry, role claims honored.
    - Invite accept: valid/expired/reused token; password policy; user status transitions.
  - **Tenant isolation**
    - Cross-tenant access blocked for all endpoints (IDs guessed, list filters, download URLs, audit, exports).
    - Object storage prefix isolation: presigned upload/download cannot access other tenant keys.
  - **Templates**
    - Create template validation (required fields, task types, dueOffsetDays bounds).
    - Update creates new version; existing assignments keep prior version; optional 409 “locked” policy behavior.
  - **Hire + assignment**
    - Create hire (duplicate email handling per tenant), assign template instantiates correct task count and due dates.
    - Dashboard filters (status/location) and role-filtered fields in `GET /hires/{id}`.
  - **Tasks**
    - New hire sees only own tasks; HR sees all; manager limited view.
    - Form task `PATCH /tasks/{id}`: partial updates, validation, 403 for non-assignee.
    - Status transitions: PENDING→SUBMITTED (doc complete-upload), SUBMITTED→APPROVED/CHANGES_REQUESTED, CHANGES_REQUESTED→SUBMITTED (new version / resubmit).
  - **Document upload/versioning**
    - Upload-url: mime/size validation, rate limits, token TTL.
    - Complete-upload: sha256 required; 409 version mismatch; idempotency on retries.
    - Version history preserved; download-url requires RBAC; correct version served; URL expiry.
  - **Review workflow**
    - `POST /tasks/{id}/review` only when SUBMITTED; 409 otherwise.
    - REQUEST_CHANGES requires comment (if policy); audit events appended.
    - Optional second review: UNDER_REVIEW_2 gating; second reviewer cannot be same user (if policy).
  - **Readiness calculation**
    - Worker recalculates on task/doc/review events; READY_FOR_PAYROLL only when all required tasks approved/completed; optional tasks don’t block.
  - **Notifications**
    - Invite email sent on assignment; resend-invite throttling.
    - Reminder cadence: due soon/overdue; no reminders after completion; correct recipients (hire vs HR).
  - **Payroll export**
    - Field mapping validation (unknown paths, missing required fields, type coercion).
    - Async lifecycle: QUEUED→RUNNING→DONE/FAILED; download only when DONE (409 otherwise).
    - CSV correctness: headers, escaping, ordering, per-hire rows; includes completion status.

- **Reliability, retries, idempotency**
  - Worker retries with backoff for email send, export generation, readiness recalculation; DLQ on repeated failure.
  - Duplicate job enqueue: ensure idempotent outcomes (no duplicate exports/emails beyond policy).
  - Integration failures: email provider 5xx, object storage transient errors, malware-scan callback delayed/out-of-order.

- **Performance & concurrency**
  - Concurrency: multiple hires uploading simultaneously; HR bulk reviewing; export for large hireIds list.
  - Load targets (baseline): p95 API latency under expected business-hours load; export job completion within SLA.
  - Stress: large documents near max size; many task instances per hire; dashboard list pagination.

- **Security & privacy checks**
  - RBAC matrix for every endpoint (HR_ADMIN/COORDINATOR/MANAGER/NEW_HIRE/PAYROLL_ADMIN).
  - Presigned URL scope: single object key, short TTL, content-type/size constraints; no public ACLs.
  - Encryption in transit; at-rest settings verified (DB + object storage).
  - Audit log append-only behavior; access reporting endpoint authorization.
  - Rate limiting: login, upload-url, resend-invite, export creation; 429 behavior.

- **Edge cases & failure modes**
  - Start date changes after assignment: due date recalculation policy verified.
  - Hire email typo then corrected: invite/token behavior.
  - Document re-upload after approval: allowed/blocked per policy; audit correctness.
  - Timezone/DST effects on due dates and reminder scheduling.
  - Deleted/disabled users; manager missing; hire without user_id until invite accepted.

# Risk Analysis

- **Tenant isolation breach (DB or object storage)**
  - Mitigation: mandatory tenant scoping in data layer; automated cross-tenant tests; per-tenant storage prefixes + IAM conditions; security review.

- **Presigned URL misuse (exfiltration or overwrite)**
  - Mitigation: short TTL, single-key URLs, size/type constraints, server-side encryption, no list permissions; verify download requires API auth.

- **Audit log not truly immutable / incomplete**
  - Mitigation: append-only table constraints, no update/delete privileges, event coverage checklist per action, periodic export/verification.

- **Worker non-idempotency causing duplicate emails/exports or wrong readiness**
  - Mitigation: idempotency keys, unique constraints, job de-dup, deterministic readiness recompute, DLQ monitoring + replay tooling.

- **Document malware scanning gap (MVP hook only)**
  - Assumption: scanning callback exists; if not, risk of storing malicious files.
  - Mitigation: block download until scan pass; quarantine bucket; clear UI status.

- **Export correctness and PII leakage**
  - Mitigation: strict field mapping validation, per-role access (PAYROLL_ADMIN), export file encryption at rest, expiring download URLs, audit export access.

- **Reminder timing errors (timezone/DST)**
  - Mitigation: store dates in UTC + tenant timezone setting; test DST boundaries; deterministic scheduler windows.

- **Template versioning ambiguity**
  - Assumption: assignments pin template version at assignment time.
  - Mitigation: explicit version field on task_instances; UI shows version; prevent silent retroactive changes.

- **Scalability bottlenecks (dashboard queries, large audit/events)**
  - Mitigation: indexes on tenant_id/status/due_date, pagination, async aggregation later; load tests with realistic data volumes.

- **Access model gaps for Manager “limited view”**
  - Assumption: manager can only view status, not documents/PII.
  - Mitigation: explicit response shaping tests; deny document endpoints for MANAGER; security sign-off.

---

# Risk Analysis

- Model output did not include a Risk Analysis section.

---

# Tech Stack Recommendation

# Tech Stack Recommendation

- **Frontend**
  - **Framework**: React + TypeScript (Vite)
  - **Routing/Data**: React Router + TanStack Query
  - **Forms**: React Hook Form + Zod validation
  - **Styling/UI**: TailwindCSS + Headless UI (or Radix) for accessible primitives
  - **Build/Deploy**: Static assets on S3+CloudFront (or Vercel); environment-based config

- **Backend**
  - **Runtime/Framework**: Node.js (LTS) + NestJS (REST, DI, guards for RBAC)
  - **ORM/Migrations**: Prisma (or TypeORM); migrations in CI
  - **Deployment**: AWS ECS Fargate (or Kubernetes later); blue/green via CodeDeploy (optional)

- **Queue / Orchestration**
  - **MVP**: BullMQ (Redis-backed) for reminders, readiness recompute, exports, email retries
  - **Alternative**: AWS SQS + Lambda/worker (less ops on Redis; slightly more plumbing)

- **Storage**
  - **DB**: Postgres (RDS) with strict tenant scoping, row-level indexes, JSONB for rules/config
  - **Object storage**: S3 with SSE-KMS, per-tenant key prefixes, presigned PUT/GET
  - **Cache**: Redis (ElastiCache) for rate limits, job queue, short-lived tokens

- **Observability**
  - **Logging**: structured JSON logs (pino) to CloudWatch (or Datadog)
  - **Tracing/Metrics**: OpenTelemetry SDK; export to Datadog/Tempo+Prometheus
  - **Error reporting**: Sentry (frontend + backend)
  - **Audit export**: periodic job to write tenant-scoped audit extracts to S3

- **Security basics**
  - **Secrets**: AWS Secrets Manager + IAM roles (no static creds)
  - **Auth**: JWT access tokens + rotating refresh tokens (httpOnly cookie) for SPA
  - **RBAC**: centralized policy/guard layer; deny-by-default
  - **CORS/CSRF**: strict allowlist; if cookies used, add CSRF token
  - **Rate limiting**: Redis-backed (login, upload-url, resend-invite, exports)
  - **Uploads**: presigned PUT with size/type constraints; quarantine + malware scan before download

# Engineering Feedback

## Must fix
- **Document lifecycle + malware scanning**
  - Add explicit states: `UPLOADING -> UPLOADED -> SCANNING -> AVAILABLE` (or `REJECTED`)
  - Block `download-url` until scan passes; store scan result + timestamp in DB.
- **Idempotency**
  - Require `Idempotency-Key` for `POST /exports/payroll`, `resend-invite`, and review actions; persist keys per tenant+endpoint.
  - Make `complete-upload` idempotent (same versionId+sha256 returns 200).
- **Tenant isolation hardening**
  - Enforce tenant scoping in a single data-access layer; add DB constraints/indexes `(tenant_id, id)` patterns.
  - Consider Postgres RLS later; MVP at least add automated cross-tenant tests for every endpoint.
- **Template version pinning**
  - Persist `template_version` on assignment and on each `task_instance`; never infer from latest template.
- **Export security**
  - Exports should be encrypted at rest (SSE-KMS) and have short-lived download URLs.
  - Audit export creation + every download (who/when/which export).

## Nice to have
- **API clarity**
  - Add explicit task transitions endpoint or document submission endpoint to avoid implicit status changes.
  - Standardize pagination (`limit`, `cursor`) for dashboard lists and audit events.
- **Readiness calculation**
  - Prefer event-driven recompute (enqueue on task/doc/review changes) + periodic reconciliation job.
  - Store computed readiness reasons (which tasks blocking) for UI/debuggability.
- **Timezones**
  - Store tenant timezone; compute due dates/reminders using tenant-local day boundaries; persist computed `due_date_utc`.
- **Operational safeguards**
  - DLQ + replay tooling for workers; per-job attempt counters and alerting on failure rate.
  - Add unique constraints to prevent duplicates (e.g., one active invite token per hire, one export per idempotency key).