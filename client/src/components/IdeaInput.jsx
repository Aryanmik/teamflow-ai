import React from 'react'

const MAX_LENGTH = 1000

export default function IdeaInput({ value, onChange }) {
  const remaining = MAX_LENGTH - value.length

  return (
    <div className="idea-input">
      <label htmlFor="idea">Product scenario</label>
      <textarea
        id="idea"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_LENGTH))}
        placeholder="Describe your project idea, goals, and constraints..."
        maxLength={MAX_LENGTH}
      />
      <div className="char-count">
        <span>{remaining} characters remaining</span>
        <span>Max {MAX_LENGTH}</span>
      </div>
    </div>
  )
}
