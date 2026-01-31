import React from 'react'
import StatCard from './StatCard'

const USER_FLOW = [
  'Idea input (1000 chars)',
  'Select agents',
  'Start collaboration',
  'Review + regenerate',
  'Export PDF / Markdown',
]

const STATS = [
  { label: 'Completion', value: '> 90%', caption: 'End-to-end success' },
  { label: 'Response time', value: '< 45s', caption: 'Average target' },
  { label: 'Satisfaction', value: '> 4/5', caption: 'User rating' },
]

export default function TargetUsersPanel() {
  return (
    <section className="panel">
      <div>
        <h2>Target users & core workflow.</h2>
        <p>
          Built for software engineers, startup founders, product managers, and
          students preparing for interviews. Users enter an idea, select agents,
          and launch a guided collaboration.
        </p>
        <div className="pill-grid">
          {USER_FLOW.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="stat-grid">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  )
}
