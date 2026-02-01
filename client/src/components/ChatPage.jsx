import React, { useState } from 'react'
import WorkflowRunner from './WorkflowRunner'
import {
  DEMO_CREDENTIALS,
  isAuthenticated,
  setAuthenticated,
  validateCredentials,
} from '../utils/auth'

const chatCards = [
  {
    title: 'Help me write a document',
    description: 'Create a new PRD or product planning doc.',
    icon: '📄',
  },
  {
    title: 'Improve an existing brief',
    description: 'Get expert feedback on your writing.',
    icon: '✨',
  },
  {
    title: 'Brainstorm new features',
    description: 'Generate roadmap-ready ideas.',
    icon: '🚀',
  },
  {
    title: 'Get feedback on my ideas',
    description: 'Receive insights on product concepts.',
    icon: '💬',
  },
]

export default function ChatPage() {
  const [isAuthed, setIsAuthed] = useState(() => isAuthenticated())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (event) => {
    event.preventDefault()
    if (!validateCredentials(username.trim(), password.trim())) {
      setError('Invalid credentials. Try the demo login.')
      return
    }
    setAuthenticated(username.trim())
    setIsAuthed(true)
    setError('')
  }

  if (!isAuthed) {
    return (
      <main className="chat-page">
        <div className="chat-gate">
          <div className="chat-gate-card">
            <span className="eyebrow">TeamFlow Access</span>
            <h1>Log in to access TeamFlow Chat</h1>
            <p>
              Use the demo credentials to unlock the chat workspace and live
              workflow experience.
            </p>
            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="chat-login-username">Username</label>
              <input
                id="chat-login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                required
              />
              <label htmlFor="chat-login-password">Password</label>
              <input
                id="chat-login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
              {error ? <p className="login-error">{error}</p> : null}
              <button className="btn-primary btn-block" type="submit">
                Log in
              </button>
            </form>
            <p className="login-hint">
              Demo credentials: <strong>{DEMO_CREDENTIALS.username}</strong> /
              <strong>{DEMO_CREDENTIALS.password}</strong>
            </p>
            <a className="chat-link" href="/">
              ← Back to TeamFlow
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="chat-page">
      <div className="chat-shell">
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <span className="eyebrow">Personal account</span>
            <button className="btn-primary btn-block" type="button">
              + Start New Chat
            </button>
          </div>
          <div className="sidebar-nav">
            <div className="nav-item active">Chats</div>
            <div className="nav-item">Documents</div>
            <div className="nav-item">Projects</div>
            <div className="nav-item">Templates</div>
          </div>
          <div className="sidebar-recent">
            <span className="eyebrow">Recent</span>
            <div className="recent-item">TeamFlow onboarding</div>
            <div className="recent-item">Product launch brief</div>
            <div className="recent-item">Workflow overview</div>
          </div>
        </aside>

        <section className="chat-main">
          <div className="chat-header">
            <h1>How can I help you today?</h1>
            <p>Tell TeamFlow what you want to build and we’ll guide the run.</p>
          </div>
          <div className="chat-card-grid">
            {chatCards.map((card) => (
              <div key={card.title} className="chat-card">
                <span className="chat-icon">{card.icon}</span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Describe the product you want TeamFlow to build..."
            />
            <button type="button" className="btn-primary">
              Send
            </button>
          </div>
        </section>
      </div>

      <section className="chat-workflow">
        <div className="chat-workflow-header">
          <h2>Live workflow</h2>
          <p>Launch a multi-agent run once you’re ready.</p>
        </div>
        <WorkflowRunner />
      </section>
    </main>
  )
}
