import React from 'react'

const RISKS = [
  'Inconsistent outputs → structured prompts.',
  'Latency → parallelization where possible.',
  'Hallucinations → reviewer agent feedback.',
  'API limits → caching and retries.',
]

const ROADMAP = [
  'Phase 2: custom agents, memory, GitHub/Jira.',
  'Phase 3: enterprise workflows and live collaboration.',
  'Plugin marketplace for extensibility.',
]

export default function Roadmap() {
  return (
    <section id="roadmap" className="roadmap">
      <div className="roadmap-card">
        <h3>Risks & mitigation</h3>
        <ul>
          {RISKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="roadmap-card accent">
        <h3>Future roadmap</h3>
        <ul>
          {ROADMAP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
