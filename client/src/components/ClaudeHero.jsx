import React, { useState } from 'react'

const TABS = ['Terminal', 'Web']
const TAB_CONTENT = {
  Terminal: {
    transcript: `./teamflow start --idea "Build a weather app for web and iOS."
> role: Product Manager
> goal: Convert idea to PRD

Drafting scope...
Identifying risks...
Compiling deliverables...

✓ PRD ready
✓ Architecture ready
✓ Test plan ready`,
    prompt:
      'Build a weather app for web and iOS.',
  },
  Web: {
    transcript: `POST /runs
{ "idea": "Launch a new product planning flow." }

GET /runs/{id}
status: running

GET /runs/{id}/export?format=md
status: completed`,
    prompt:
      'Start a run from the web UI and stream progress to the dashboard.',
  },
}

export default function ClaudeHero() {
  const [activeTab, setActiveTab] = useState('Terminal')
  const handleStart = () => {
    const section = document.getElementById('workflow-runner')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleDemo = () => {
    const demoIdea =
      'Build a hackathon-ready multi-agent workflow tool with a no-login MVP and exportable output.'
    window.dispatchEvent(
      new CustomEvent('teamflow:prefillIdea', { detail: { idea: demoIdea } })
    )
    handleStart()
  }

  const activeContent = TAB_CONTENT[activeTab]

  return (
    <section id="overview" className="claude-hero">
      <div className="hero-copy">
        <span className="eyebrow">TeamFlow AI</span>
        <h1>AI-powered product planning for real teams.</h1>
        <p>
          Coordinate PM, Tech, QA, Principal Engineer, and Reviewer agents to turn a single idea
          into structured product, architecture, and test plans.
        </p>
        <div className="hero-actions">
          <button
            className="btn-primary btn-hero"
            type="button"
            onClick={handleStart}
          >
            Start Planning and building
          </button>
          <button className="btn-secondary" type="button" onClick={handleDemo}>
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
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === activeTab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
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
                {activeContent.transcript}
              </code>
            </pre>
          </div>
          <div className="prompt-card">
            <span>Prompt</span>
            <p>"{activeContent.prompt}"</p>
          </div>
        </div>
      </div>
    </section>
  )
}
