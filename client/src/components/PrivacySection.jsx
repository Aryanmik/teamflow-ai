import React from 'react'

export default function PrivacySection() {
  return (
    <section id="privacy" className="privacy">
      <div className="privacy-card">
        <span className="eyebrow">Privacy</span>
        <h2>Privacy and data handling</h2>
        <p>
          TeamFlow AI is a prototype workflow assistant. We only use the data
          you submit to generate your PRD, architecture, test plan, and review
          outputs. A full privacy notice is included below.
        </p>
        <div className="privacy-grid">
          <div>
            <h4>What we collect</h4>
            <ul>
              <li>Product ideas and prompts you submit.</li>
              <li>Generated outputs (PRD, architecture, tests, review).</li>
              <li>Operational metadata (timestamps, run IDs, errors).</li>
            </ul>
          </div>
          <div>
            <h4>How we use it</h4>
            <ul>
              <li>Run the multi-agent workflow and export artifacts.</li>
              <li>Improve reliability and performance of the system.</li>
              <li>Support issue investigation when you reach out.</li>
            </ul>
          </div>
          <div>
            <h4>What to avoid</h4>
            <ul>
              <li>Don’t submit passwords, secrets, or private keys.</li>
              <li>Avoid confidential customer or company data.</li>
              <li>Redact PII before sharing if possible.</li>
            </ul>
          </div>
        </div>
        <div className="privacy-doc">
          <h3>Privacy Notice (MVP)</h3>
          <p className="privacy-updated">Last updated: February 1, 2026</p>
          <h4>What we collect</h4>
          <ul>
            <li>Product ideas and prompts you submit.</li>
            <li>Generated outputs (PRD, architecture, API, tests, review).</li>
            <li>Operational metadata (timestamps, run IDs, step status).</li>
          </ul>
          <h4>How we use data</h4>
          <ul>
            <li>To run the workflow and produce outputs.</li>
            <li>To improve reliability, performance, and quality.</li>
            <li>To troubleshoot when you contact support.</li>
          </ul>
          <h4>What to avoid submitting</h4>
          <ul>
            <li>Passwords, private keys, or secrets.</li>
            <li>Confidential customer data or regulated data.</li>
            <li>Personal data you do not have permission to share.</li>
          </ul>
          <h4>Where data lives</h4>
          <ul>
            <li>Run data is stored in Redis with a TTL.</li>
            <li>Logs may include prompt/output previews when enabled.</li>
          </ul>
          <h4>Retention and deletion</h4>
          <ul>
            <li>Data expires based on the configured Redis TTL.</li>
            <li>Contact support for earlier deletion.</li>
          </ul>
          <h4>Third-party processing</h4>
          <ul>
            <li>Model requests are sent to OpenAI via API.</li>
            <li>Provider policies may apply to submitted data.</li>
          </ul>
          <h4>Contact</h4>
          <p>
            Questions or deletion requests:{" "}
            <a href="mailto:support@teamflow.ai">support@teamflow.ai</a>
          </p>
        </div>
      </div>
    </section>
  )
}
