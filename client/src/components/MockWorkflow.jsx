import React from 'react'

const mockEvents = [
  'Orchestrator → Product Manager (iter 0) • Generate initial PRD from user idea',
  'step_started: pm',
  'step_completed: pm',
  'Orchestrator → Tech Lead (iter 0) • Generate architecture + API outline',
  'step_started: tech',
  'Orchestrator → QA Engineer (iter 0) • Draft test plan & risks',
  'step_completed: tech',
  'step_completed: qa',
  'Orchestrator → Reviewer (iter 0) • Consolidate final outputs',
]

const mockSteps = [
  { name: 'PM', status: 'completed' },
  { name: 'TECH', status: 'running' },
  { name: 'QA', status: 'completed' },
  { name: 'PRINCIPAL', status: 'completed' },
  { name: 'REVIEW', status: 'pending' },
]

const mockArtifacts = ['PRD', 'ARCH', 'API', 'TEST', 'RISK', 'STACK', 'REVIEW', 'FINAL']

export default function MockWorkflow() {
  return (
    <section id="workflow-preview" className="workflow-runner mock-workflow">
      <div className="runner-header">
        <div>
          <span className="eyebrow">Workflow preview</span>
          <h2>See a multi-agent run before you start</h2>
          <p>
            This mock run illustrates how TeamFlow coordinates PM, Tech, QA, and
            Review agents. Sign in to start a live workflow.
          </p>
        </div>
        <div className="runner-actions">
          <button className="btn-secondary" type="button" disabled>
            Start collaboration
          </button>
        </div>
      </div>

      <div className="runner-grid">
        <div className="runner-card idea-card">
          <div className="idea-input">
            <label htmlFor="idea-preview">Product scenario</label>
            <textarea
              id="idea-preview"
              value="Build a pokedex app with search, favorites, and shareable profiles."
              readOnly
            />
            <div className="char-count">
              <span>981 characters remaining</span>
              <span>Max 1000</span>
            </div>
          </div>
          <div className="run-meta">
            <div>
              <span>Run ID</span>
              <strong>run_0ce7f338f3bc4e95853e64e0c9f175a1</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className="status-pill running">running</strong>
            </div>
          </div>
        </div>

        <div className="runner-card agent-card">
          <h3>Agent progress</h3>
          <div className="step-list">
            {mockSteps.map((step) => (
              <div key={step.name} className="step-row">
                <div>
                  <strong>{step.name}</strong>
                  <span className={`status-pill ${step.status}`}>
                    {step.status}
                  </span>
                </div>
                <button type="button" className="step-action" disabled>
                  Regenerate
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="runner-card live-events-card">
          <h3>Live events</h3>
          <div className="event-filters">
            {['All', 'PM', 'TECH', 'QA', 'PRINCIPAL', 'REVIEW'].map((label) => (
              <button
                key={label}
                type="button"
                className={`event-filter ${label === 'All' ? 'active' : ''}`}
                disabled
              >
                {label}
              </button>
            ))}
          </div>
          <div className="event-log">
            {mockEvents.map((event) => (
              <div key={event} className="event-row">
                <span>{event}</span>
              </div>
            ))}
          </div>
          <div className="artifact-chip-row">
            {mockArtifacts.map((artifact) => (
              <span key={artifact} className="artifact-chip ready">
                {artifact}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
