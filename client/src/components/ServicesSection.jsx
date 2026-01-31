import React from 'react'
import SectionHeader from './SectionHeader'

const SERVICES = [
  {
    title: 'Product planning',
    description:
      'Turn raw ideas into scoped PRDs, success metrics, and MVP slices.',
  },
  {
    title: 'System design',
    description:
      'Map data flow, APIs, and architecture with technical depth.',
  },
  {
    title: 'QA strategy',
    description:
      'Identify risks, edge cases, and non-functional requirements early.',
  },
  {
    title: 'Review & refine',
    description:
      'Unify output quality with consistency checks and feedback loops.',
  },
]

export default function ServicesSection() {
  return (
    <section className="services">
      <SectionHeader
        title="Services"
        subtitle="Specialized agents that collaborate like a full product team."
      />
      <div className="services-grid">
        {SERVICES.map((service) => (
          <article className="service-card" key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className="service-tag">Included in MVP</div>
          </article>
        ))}
      </div>
    </section>
  )
}
