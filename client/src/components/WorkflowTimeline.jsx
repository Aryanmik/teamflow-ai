import React from 'react'
import SectionHeader from './SectionHeader'

const STEPS = [
  {
    label: '01',
    title: 'PM agent',
    description: 'Generates PRD and success metrics.',
  },
  {
    label: '02',
    title: 'Tech agent',
    description: 'Designs architecture, APIs, and data flow.',
  },
  {
    label: '03',
    title: 'QA agent',
    description: 'Produces test plan, risks, and coverage gaps.',
  },
  {
    label: '04',
    title: 'Principal Engineer',
    description: 'Recommends tech stack and flags engineering risks.',
  },
  {
    label: '05',
    title: 'Reviewer',
    description: 'Validates consistency and improves output.',
  },
]

export default function WorkflowTimeline() {
  return (
    <section id="workflow" className="timeline">
      <SectionHeader
        title="Coordinated workflow"
        subtitle="Sequential handoffs with feedback loops built in."
      />
      <div className="timeline-steps">
        {STEPS.map((step) => (
          <div key={step.label}>
            <span>{step.label}</span>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
