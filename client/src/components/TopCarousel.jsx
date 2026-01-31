import React, { useEffect, useState } from 'react'

const SLIDES = [
  {
    eyebrow: 'TeamFlow AI',
    title: 'A multi-agent studio for product planning.',
    description:
      'Collaborate with PM, Tech, QA, and Reviewer agents to turn ideas into structured plans.',
  },
  {
    eyebrow: 'Structured Outputs',
    title: 'PRD, architecture, API, and test plans.',
    description:
      'Generate consistent documents with clear handoffs and export-ready formatting.',
  },
  {
    eyebrow: 'Hackathon MVP',
    title: 'Fast orchestration, no login.',
    description:
      'Run sequential workflows in under 60 seconds and keep the output demo-ready.',
  },
]

const INTERVAL_MS = 5000

export default function TopCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length)
    }, INTERVAL_MS)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="carousel">
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {SLIDES.map((slide) => (
          <div className="carousel-slide" key={slide.title}>
            <span className="carousel-eyebrow">{slide.eyebrow}</span>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
          </div>
        ))}
      </div>
      <div className="carousel-dots" role="tablist" aria-label="Carousel slides">
        {SLIDES.map((slide, dotIndex) => (
          <button
            key={slide.title}
            type="button"
            className={dotIndex === index ? 'active' : ''}
            onClick={() => setIndex(dotIndex)}
            aria-label={`Go to slide ${dotIndex + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
