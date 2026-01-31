import React from 'react'

const TABS = ['Terminal', 'IDE', 'Web', 'Slack']

export default function ClaudeHero() {
  return (
    <section className="claude-hero">
      <div className="hero-copy">
        <span className="eyebrow">TeamFlow AI</span>
        <h1>AI-powered product planning for real teams.</h1>
        <p>
          Coordinate PM, Tech, QA, and Reviewer agents to turn a single idea
          into structured product, architecture, and test plans.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" type="button">
            Start collaboration
          </button>
          <button className="btn-secondary" type="button">
            View demo output
          </button>
        </div>
        <div className="hero-meta">
          <span>Fast setup</span>
          <span>No login</span>
          <span>Export Markdown</span>
        </div>
      </div>
      <div className="hero-panel">
        <div className="panel-tabs">
          {TABS.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={index === 0 ? 'active' : ''}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="panel-body">
          <div className="terminal">
            <div className="terminal-bar">
              <span />
              <span />
              <span />
            </div>
            <pre>
              <code>
{`$ teamflow start
> role: Product Manager
> goal: Convert idea to PRD

Drafting scope...
Identifying risks...
Compiling deliverables...

✓ PRD ready
✓ Architecture ready
✓ Test plan ready`}
              </code>
            </pre>
          </div>
          <div className="prompt-card">
            <span>Prompt</span>
            <p>
              "Build a hackathon-ready multi-agent workflow tool with a no-login
              MVP and exportable output."
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
