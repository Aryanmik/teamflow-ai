import React from 'react'

const CARDS = [
  {
    title: 'Product Scenarios',
    description:
      'Drop a 1000-character idea and get a full PRD, architecture, and QA plan.',
  },
  {
    title: 'System Design',
    description:
      'Structured handoffs map data flow, APIs, and risks with clarity.',
  },
  {
    title: 'Interview Prep',
    description:
      'Practice realistic planning workflows with role-based AI feedback.',
  },
]

export default function UseCases() {
  return (
    <section id="use-cases" className="use-cases">
      <div className="section-header">
        <h2>Use TeamFlow where you work.</h2>
        <p>From idea input to export-ready artifacts in minutes.</p>
      </div>
      <div className="use-grid">
        {CARDS.map((card) => (
          <article className="use-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
