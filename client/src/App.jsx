import React from 'react'
import AboutSection from './components/AboutSection'
import ClaudeHero from './components/ClaudeHero'
import Navbar from './components/Navbar'
import Roadmap from './components/Roadmap'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'
import WorkflowTimeline from './components/WorkflowTimeline'
import UseCases from './components/UseCases'

export default function App() {
  return (
    <div className="page">
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />

      <main className="container">
        <Navbar />
        <ClaudeHero />
        <UseCases />
        <WorkflowTimeline />
        <AboutSection />
        <Roadmap />
        <ContactSection />
        <Footer />
      </main>
    </div>
  )
}
