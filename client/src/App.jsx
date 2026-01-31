import React, { useState } from 'react'

export default function App() {
  const [name, setName] = useState('')

  return (
    <div className="page">
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />

      <main className="container">
        <header className="hero">
          <span className="badge">TeamFlow AI • Client UI</span>
          <h1>Design your team flow in vivid color.</h1>
          <p>
            A playful, high-signal workspace to experiment with new interactions
            before wiring in the Django backend.
          </p>
          <div className="cta-row">
            <div className="input-wrap">
              <label htmlFor="name">Introduce yourself</label>
              <div className="input-row">
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
                <button onClick={() => alert(`Hello ${name || 'friend'}`)}>
                  Send hello
                </button>
              </div>
            </div>
            <div className="chips">
              <span>Realtime</span>
              <span>Guided flows</span>
              <span>Multi-agent ready</span>
            </div>
          </div>
        </header>

        <section className="feature-grid">
          <article className="card gradient-a">
            <h3>Live orchestration</h3>
            <p>Coordinate roles, flows, and approvals with a single timeline.</p>
          </article>
          <article className="card gradient-b">
            <h3>Signal-rich UI</h3>
            <p>Surface the right context with layered color and motion cues.</p>
          </article>
          <article className="card gradient-c">
            <h3>Confident handoffs</h3>
            <p>Package outputs with clarity for PM, TL, QA, and review.</p>
          </article>
        </section>

        <section className="panel">
          <div>
            <h2>Multi-agent flow, one canvas.</h2>
            <p>
              Build a collaborative view that highlights task ownership, status,
              and decisions. Every card is designed to pop with color, while
              keeping the hierarchy clean.
            </p>
          </div>
          <div className="stat-grid">
            <div>
              <span className="stat-label">Latency</span>
              <strong>120ms</strong>
              <small>Target response</small>
            </div>
            <div>
              <span className="stat-label">Coverage</span>
              <strong>98%</strong>
              <small>Plan completeness</small>
            </div>
            <div>
              <span className="stat-label">Momentum</span>
              <strong>4.9</strong>
              <small>Team pulse</small>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
