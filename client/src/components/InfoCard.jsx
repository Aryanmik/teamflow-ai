import React from 'react'

export default function InfoCard({ title, description, className = '' }) {
  return (
    <article className={`card ${className}`.trim()}>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}
