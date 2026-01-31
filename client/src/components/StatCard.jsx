import React from 'react'

export default function StatCard({ label, value, caption }) {
  return (
    <div>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}
