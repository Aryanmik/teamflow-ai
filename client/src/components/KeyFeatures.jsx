import React from 'react'
import SectionHeader from './SectionHeader'

const FEATURE_GROUPS = [
  {
    title: 'Multi-agent roles',
    items: [
      'Product Manager defines scope and features.',
      'Tech Lead designs system architecture.',
      'QA Engineer builds test plans.',
      'Reviewer validates and improves output.',
    ],
  },
  {
    title: 'Interactive dashboard',
    items: [
      'Live agent activity view.',
      'Step-by-step progress tracking.',
      'Chat with individual agents.',
      'Regenerate specific steps.',
    ],
  },
  {
    title: 'Structured outputs',
    items: [
      'PRD, Architecture, API Design.',
      'Test Plan and Risk Analysis.',
      'Consistent formatting.',
      'Export as PDF or Markdown.',
    ],
  },
]

export default function KeyFeatures() {
  return (
    <section className="stack">
      <SectionHeader
        title="Key features"
        subtitle="Role clarity, interactive orchestration, and structured output."
      />
      <div className="stack-grid">
        {FEATURE_GROUPS.map((group) => (
          <article className="card glass" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
