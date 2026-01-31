import React from 'react'
import InfoCard from './InfoCard'

const FEATURES = [
  {
    title: 'Product overview',
    description:
      'A multi-agent collaboration platform for structured product, system, and QA planning.',
    className: 'gradient-a',
  },
  {
    title: 'Problem',
    description:
      'Teams need a faster way to turn vague ideas into scoped plans, architecture, and risks.',
    className: 'gradient-b',
  },
  {
    title: 'Solution',
    description:
      'Specialized agents collaborate with handoffs and feedback loops to deliver complete outputs.',
    className: 'gradient-c',
  },
]

export default function FeatureGrid() {
  return (
    <section className="feature-grid">
      {FEATURES.map((feature) => (
        <InfoCard key={feature.title} {...feature} />
      ))}
    </section>
  )
}
