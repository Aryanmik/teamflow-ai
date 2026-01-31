import React from 'react'
import SectionHeader from './SectionHeader'

const PLATFORMS = [
  'Agent Studio',
  'Workflow Canvas',
  'Output Vault',
  'Review Layer',
  'Export Hub',
  'Metrics Desk',
]

export default function PlatformsSection() {
  return (
    <section className="platforms">
      <SectionHeader
        title="Platforms"
        subtitle="A modular suite for orchestrating specialized AI roles."
      />
      <div className="platform-grid">
        {PLATFORMS.map((platform) => (
          <div className="platform-card" key={platform}>
            <span>{platform}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
