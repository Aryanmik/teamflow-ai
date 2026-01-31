import React from 'react'

const LINKS = ['Overview', 'Platforms', 'Services', 'Workflow', 'Contact']

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="logo">
        <span>TeamFlow</span>
        <strong>AI</strong>
      </div>
      <div className="nav-links">
        {LINKS.map((link) => (
          <button className="nav-link" key={link} type="button">
            {link}
          </button>
        ))}
      </div>
      <button className="nav-cta" type="button">
        Start collaboration
      </button>
    </nav>
  )
}
