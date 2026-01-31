import React from 'react'

const ITEMS = [
  'Hackathon-ready',
  'Multi-agent workflows',
  'No-login MVP',
  'Export to Markdown',
  'Structured handoffs',
  'Live orchestration',
]

export default function MarqueeBanner() {
  return (
    <div className="marquee">
      <div className="marquee-track">
        {ITEMS.concat(ITEMS).map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  )
}
