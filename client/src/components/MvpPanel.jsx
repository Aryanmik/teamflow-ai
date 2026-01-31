import React from 'react'

const TAGS = ['3 agents', 'Sequential workflow', 'Web UI', 'Export Markdown']
const METRICS = [
  {
    title: 'Performance',
    description: 'Generate full workflow in under 60 seconds.',
  },
  {
    title: 'Reliability',
    description: 'Retry failed agent calls automatically.',
  },
  {
    title: 'Security',
    description: 'No permanent storage of user data.',
  },
  {
    title: 'Scalability',
    description: '10+ sessions for hackathons, 100+ future-ready.',
  },
]

export default function MvpPanel() {
  return (
    <section className="panel split">
      <div>
        <h2>MVP scope + non-functional requirements</h2>
        <p>
          Hackathon MVP focuses on speed, clarity, and demo-ready output with a
          no-login flow.
        </p>
        <div className="tag-row">
          {TAGS.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="metric-list">
        {METRICS.map((metric) => (
          <div key={metric.title}>
            <h4>{metric.title}</h4>
            <p>{metric.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
