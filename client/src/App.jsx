import React, { useState } from 'react'
import AboutSection from './components/AboutSection'
import ClaudeHero from './components/ClaudeHero'
import Navbar from './components/Navbar'
import Roadmap from './components/Roadmap'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'
import WorkflowTimeline from './components/WorkflowTimeline'
import UseCases from './components/UseCases'
import ChatPage from './components/ChatPage'
import LoginModal from './components/LoginModal'
import MockWorkflow from './components/MockWorkflow'

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const isChatRoute = window.location.pathname === '/chat'

  if (isChatRoute) {
    return (
      <div className="page">
        <ChatPage />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />

      <main className="container">
        <Navbar onLoginClick={() => setIsLoginOpen(true)} />
        <ClaudeHero onLoginClick={() => setIsLoginOpen(true)} />
        <MockWorkflow />
        <UseCases />
        <WorkflowTimeline />
        <AboutSection />
        <Roadmap />
        <ContactSection />
        <Footer />
      </main>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  )
}
