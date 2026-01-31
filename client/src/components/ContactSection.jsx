import React, { useState } from 'react'

export default function ContactSection() {
  const [scenario, setScenario] = useState('')

  const handleSubmit = () => {
    if (!scenario.trim()) {
      return
    }
    localStorage.setItem('teamflow:lastIdea', scenario.trim())
    window.dispatchEvent(
      new CustomEvent('teamflow:prefillIdea', { detail: { idea: scenario.trim() } })
    )
    const section = document.getElementById('workflow-runner')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section id="contact" className="contact">
      <div className="contact-card">
        <div>
          <span className="badge">Get in touch</span>
          <h2>Ready to build your agent workflow?</h2>
          <p>
            Drop a product scenario and we will help you structure the output
            across product, tech, and QA.
          </p>
        </div>
        <form
          className="contact-form"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <div className="form-field">
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" placeholder="Ada Lovelace" />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="ada@teamflow.ai" />
          </div>
          <div className="form-field full">
            <label htmlFor="scenario">Product scenario</label>
            <textarea
              id="scenario"
              maxLength={1000}
              placeholder="Share the project idea, goals, and constraints..."
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            />
            <div className="char-count">
              <span>Max 1000 characters</span>
              <span>Structured outputs guaranteed</span>
            </div>
          </div>
          <button className="nav-cta" type="submit">
            Submit scenario
          </button>
        </form>
      </div>
    </section>
  )
}
