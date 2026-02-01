import React, { useEffect, useState } from 'react'
import {
  DEMO_CREDENTIALS,
  setAuthenticated,
  validateCredentials,
} from '../utils/auth'

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setUsername('')
      setPassword('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateCredentials(username.trim(), password.trim())) {
      setError('Invalid credentials. Please try the demo login.')
      return
    }
    setAuthenticated(username.trim())
    setError('')
    if (onSuccess) {
      onSuccess(username.trim())
    }
    window.open('/chat', '_blank', 'noopener,noreferrer')
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="login-modal-backdrop" role="dialog" aria-modal="true">
      <div className="login-modal">
        <div className="login-modal-header">
          <div>
            <span className="eyebrow">TeamFlow Access</span>
            <h3>Log in to launch a live workflow</h3>
          </div>
          <button
            type="button"
            className="login-close"
            onClick={onClose}
            aria-label="Close login"
          >
            ×
          </button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
          />
          {error ? <p className="login-error">{error}</p> : null}
          <button className="btn-primary btn-block" type="submit">
            Log in &amp; open chat
          </button>
        </form>
        <p className="login-hint">
          Demo credentials: <strong>{DEMO_CREDENTIALS.username}</strong> /
          <strong>{DEMO_CREDENTIALS.password}</strong>
        </p>
      </div>
    </div>
  )
}
