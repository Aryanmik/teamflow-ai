import React, { useState } from 'react'
import FeatureGrid from './components/FeatureGrid'
import Hero from './components/Hero'
import KeyFeatures from './components/KeyFeatures'
import MvpPanel from './components/MvpPanel'
import Roadmap from './components/Roadmap'
import TargetUsersPanel from './components/TargetUsersPanel'
import WorkflowTimeline from './components/WorkflowTimeline'

export default function App() {
  const [name, setName] = useState('')
  const [idea, setIdea] = useState('')

  return (
    <div className="page">
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />

      <main className="container">
        <Hero
          name={name}
          onNameChange={setName}
          idea={idea}
          onIdeaChange={setIdea}
          onGreet={() => alert(`Hello ${name || 'friend'}`)}
        />
        <FeatureGrid />
        <TargetUsersPanel />
        <KeyFeatures />
        <WorkflowTimeline />
        <MvpPanel />
        <Roadmap />
      </main>
    </div>
  )
}
