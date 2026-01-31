import React from 'react'

export default function AboutSection() {
  return (
    <section className="about">
      <div>
        <h2>About TeamFlow AI</h2>
        <p>
          TeamFlow AI demonstrates how coordinated multi-agent workflows can
          replace fragmented planning processes through structured handoffs and
          verification loops.
        </p>
      </div>
      <div className="about-metrics">
        <div>
          <span>Avg completion</span>
          <strong>90%+</strong>
        </div>
        <div>
          <span>Latency target</span>
          <strong>&lt; 60s</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>10+</strong>
        </div>
      </div>
    </section>
  )
}
