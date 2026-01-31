import React, { useState } from 'react'

export default function App() {
  const [name, setName] = useState('')

  return (
    <div className="container">
      <h1>teamflow-ai — Client UI</h1>
      <p>Simple UI to begin building user interactions with the Django backend.</p>
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={() => alert(`Hello ${name || 'friend'}`)}>
          Greet
        </button>
      </div>
    </div>
  )
}
