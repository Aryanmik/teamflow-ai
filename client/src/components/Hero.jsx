import React from 'react'
import IdeaInput from './IdeaInput'

export default function Hero({ name, onNameChange, idea, onIdeaChange, onGreet }) {
  return (
    <header className="hero">
      <span className="badge">TeamFlow AI • Client UI</span>
      <h1>Multi-agent collaboration, mapped into one vivid workspace.</h1>
      <p>
        TeamFlow AI turns high-level ideas into coordinated product, technical,
        and QA plans through structured agent handoffs.
      </p>
      <div className="cta-row">
        <div className="input-wrap">
          <label htmlFor="name">Introduce yourself</label>
          <div className="input-row">
            <input
              id="name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Your name"
            />
            <button onClick={onGreet}>Send hello</button>
          </div>
        </div>
        <div className="chips">
          <span>PM • TL • QA • Review</span>
          <span>Structured outputs</span>
          <span>Exportable plans</span>
        </div>
      </div>
      <IdeaInput value={idea} onChange={onIdeaChange} />
    </header>
  )
}
