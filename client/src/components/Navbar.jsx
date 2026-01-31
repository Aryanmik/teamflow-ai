import React from 'react'

const LINKS = [
  { label: 'Overview', target: 'overview' },
  { label: 'Use cases', target: 'use-cases' },
  { label: 'Workflow', target: 'workflow-runner' },
  { label: 'Roadmap', target: 'roadmap' },
  { label: 'Contact', target: 'contact' },
]

export default function Navbar() {
  const scrollToTarget = (target) => {
    const el = document.getElementById(target)
    if (!el) {
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="nav">
      <div className="logo">
        <span>TeamFlow</span>
        <strong>AI</strong>
      </div>
      <div className="nav-links">
        {LINKS.map((link) => (
          <button
            className="nav-link"
            key={link.label}
            type="button"
            onClick={() => scrollToTarget(link.target)}
          >
            {link.label}
          </button>
        ))}
      </div>
      <button
        className="nav-cta"
        type="button"
        onClick={() => scrollToTarget('workflow-runner')}
      >
        Start collaboration
      </button>
    </nav>
  )
}
