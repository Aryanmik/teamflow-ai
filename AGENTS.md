# TeamFlow AI – Agents

This document defines the multi-agent roles and handoff flow used to generate the PRD and related artifacts.

## Agent Roster

### 1) Product Manager (PM)
**Goal:** Convert the user idea into a clear, scoped PRD.
**Responsibilities:**
- Define problem, users, goals, constraints
- Specify features, user flows, success metrics
- Produce structured PRD output
**Inputs:** User idea, constraints
**Outputs:** PRD draft (Markdown)

### 2) Tech Lead (TL)
**Goal:** Design the system architecture and technical plan.
**Responsibilities:**
- Propose high-level architecture and components
- Define data flow, APIs, and storage approach
- Identify scalability, reliability, and security considerations
**Inputs:** PM PRD output
**Outputs:** Architecture + API outline (Markdown)

### 3) QA Engineer (QA)
**Goal:** Define test strategy and edge cases.
**Responsibilities:**
- Produce test plan aligned to requirements
- Identify risks, failure modes, and coverage gaps
- Propose non-functional test cases
**Inputs:** PM PRD + TL architecture
**Outputs:** Test plan + risk list (Markdown)

### 4) Reviewer (RV)
**Goal:** Validate completeness and consistency across artifacts.
**Responsibilities:**
- Review PM/TL/QA outputs
- Point out inconsistencies, missing requirements, and risks
- Suggest refinements and consolidation
**Inputs:** PM + TL + QA outputs
**Outputs:** Review notes + final consolidated plan

## Workflow
1. User submits idea
2. PM generates PRD
3. TL designs system architecture
4. QA creates test plan
5. Reviewer validates and improves
6. System consolidates final output

## Output Structure (Required)
- Product Requirements (PRD)
- System Architecture
- API Design
- Test Plan
- Risk Analysis

## Notes
- Each agent must reference prior outputs
- Maintain consistent formatting and headings
- Prefer bullet points and short sections for clarity
