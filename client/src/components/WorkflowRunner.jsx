import React, { useEffect, useMemo, useRef, useState } from 'react'
import IdeaInput from './IdeaInput'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const EVENT_LIMIT = 12

export default function WorkflowRunner() {
  const [idea, setIdea] = useState('')
  const [runId, setRunId] = useState('')
  const [runStatus, setRunStatus] = useState('idle')
  const [steps, setSteps] = useState([])
  const [events, setEvents] = useState([])
  const [artifacts, setArtifacts] = useState({})
  const [finalDoc, setFinalDoc] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isNotebookDownloading, setIsNotebookDownloading] = useState(false)
  const [activeStep, setActiveStep] = useState('all')
  const eventCursorRef = useRef(0)
  const streamRef = useRef(null)
  const runStatusRef = useRef(runStatus)

  const stepStatuses = useMemo(() => {
    const statusMap = {}
    steps.forEach((step) => {
      statusMap[step.name] = step.status
    })
    return statusMap
  }, [steps])

  const filteredEvents =
    activeStep === 'all'
      ? events
      : events.filter((event) => event.step === activeStep)

  useEffect(() => {
    runStatusRef.current = runStatus
  }, [runStatus])

  useEffect(() => {
    eventCursorRef.current = 0
    setEvents([])
  }, [runId])

  useEffect(() => {
    const stored = localStorage.getItem('teamflow:lastIdea')
    if (!idea && stored) {
      setIdea(stored)
    }
    const handler = (event) => {
      const nextIdea = event?.detail?.idea
      if (typeof nextIdea === 'string' && nextIdea.trim()) {
        setIdea(nextIdea.slice(0, 1000))
      }
    }
    window.addEventListener('teamflow:prefillIdea', handler)
    return () => window.removeEventListener('teamflow:prefillIdea', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!runId) {
      return undefined
    }

    let isActive = true

    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/runs/${runId}`)
        if (!res.ok) {
          throw new Error(`Status failed (${res.status})`)
        }
        const data = await res.json()
        if (!isActive) {
          return
        }
        setRunStatus(data.status)
        setSteps(data.steps || [])
        setArtifacts(data.artifacts || {})
        if (data.status === 'completed' || data.status === 'failed') {
          return
        }
        setTimeout(pollStatus, 2000)
      } catch (err) {
        if (!isActive) {
          return
        }
        setError(err.message || 'Unable to fetch status.')
        setTimeout(pollStatus, 2500)
      }
    }

    pollStatus()

    return () => {
      isActive = false
    }
  }, [runId])

  useEffect(() => {
    if (!runId) {
      return undefined
    }
    let isActive = true

    const connectStream = () => {
      if (!isActive) {
        return
      }
      const startFrom = Math.max(0, eventCursorRef.current || 0)
      const stream = new EventSource(
        `${API_BASE_URL}/runs/${runId}/events?start=${startFrom}`
      )
      streamRef.current = stream

      stream.onmessage = (event) => {
        if (!event.data) {
          return
        }
        const lastId = Number(event.lastEventId)
        if (!Number.isNaN(lastId)) {
          eventCursorRef.current = lastId + 1
        } else {
          eventCursorRef.current += 1
        }
        try {
          const parsed = JSON.parse(event.data)
          setEvents((prev) => [parsed, ...prev].slice(0, EVENT_LIMIT))
        } catch (err) {
          setEvents((prev) =>
            [{ type: 'event_parse_error', raw: event.data }, ...prev].slice(
              0,
              EVENT_LIMIT
            )
          )
        }
      }

      stream.onerror = () => {
        stream.close()
        if (!isActive) {
          return
        }
        if (
          runStatusRef.current === 'completed' ||
          runStatusRef.current === 'failed'
        ) {
          return
        }
        setTimeout(connectStream, 1000)
      }
    }

    connectStream()

    return () => {
      isActive = false
      if (streamRef.current) {
        streamRef.current.close()
      }
    }
  }, [runId])

  const toSourceLines = (text) => {
    const normalized = text.replace(/\r\n/g, '\n')
    const parts = normalized.split('\n')
    return parts.map((line, index) =>
      index === parts.length - 1 ? line : `${line}\n`
    )
  }

  const markdownToNotebook = (markdown, metadata = {}) => {
    const blocks = markdown
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}---\n{2,}/g)
      .map((chunk) => chunk.trim())
      .filter(Boolean)

    const cells = blocks.map((block) => ({
      cell_type: 'markdown',
      metadata: {},
      source: toSourceLines(`${block}\n`),
    }))

    if (cells.length === 0) {
      cells.push({
        cell_type: 'markdown',
        metadata: {},
        source: ['# TeamFlow Export\n\n', 'No content was available.\n'],
      })
    }

    return {
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3',
        },
        language_info: { name: 'python' },
        ...metadata,
      },
      nbformat: 4,
      nbformat_minor: 5,
    }
  }

  const downloadTextFile = (contents, filename, mimeType) => {
    const blob = new Blob([contents], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const startRun = async () => {
    if (!idea.trim()) {
      setError('Add a product idea before starting.')
      return
    }
    setError('')
    setIsSubmitting(true)
    setFinalDoc('')
    setEvents([])
    setActiveStep('all')
    try {
      const res = await fetch(`${API_BASE_URL}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `Run creation failed (${res.status})`)
      }
      const data = await res.json()
      setRunId(data.id)
      setRunStatus(data.status || 'queued')
      localStorage.setItem('teamflow:lastIdea', idea.trim())
    } catch (err) {
      setError(err.message || 'Unable to start run.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelRun = async () => {
    if (!runId) {
      return
    }
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/runs/${runId}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `Cancel failed (${res.status})`)
      }
      const data = await res.json()
      setRunStatus(data.status || 'cancelled')
    } catch (err) {
      setError(err.message || 'Unable to cancel run.')
    }
  }

  const regenerateStep = async (step) => {
    if (!runId) {
      return
    }
    setError('')
    setFinalDoc('')
    try {
      const res = await fetch(
        `${API_BASE_URL}/runs/${runId}/steps/${step}/regenerate`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `Regenerate failed (${res.status})`)
      }
      const data = await res.json()
      setRunStatus(data.status || 'queued')
    } catch (err) {
      setError(err.message || 'Unable to regenerate step.')
    }
  }

  const fetchExport = async () => {
    if (!runId) {
      return
    }
    setIsExporting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/runs/${runId}/export?format=md`)
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `Export failed (${res.status})`)
      }
      const data = await res.text()
      setFinalDoc(data)
    } catch (err) {
      setError(err.message || 'Unable to export output.')
    } finally {
      setIsExporting(false)
    }
  }

  const getMarkdownText = async () => {
    if (finalDoc) {
      return finalDoc
    }
    const res = await fetch(`${API_BASE_URL}/runs/${runId}/export?format=md`)
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || `Export failed (${res.status})`)
    }
    return await res.text()
  }

  const downloadNotebook = async () => {
    if (!runId || runStatus !== 'completed') {
      return
    }
    setError('')
    setIsNotebookDownloading(true)
    try {
      const markdown = await getMarkdownText()
      setFinalDoc(markdown)
      const notebook = markdownToNotebook(markdown, {
        teamflow: { runId, exportedAt: new Date().toISOString() },
      })
      downloadTextFile(
        JSON.stringify(notebook, null, 2),
        `teamflow_${runId}.ipynb`,
        'application/x-ipynb+json'
      )
    } catch (err) {
      setError(err.message || 'Unable to download notebook.')
    } finally {
      setIsNotebookDownloading(false)
    }
  }

  return (
    <section id="workflow-runner" className="workflow-runner">
      <div className="runner-header">
        <div>
          <span className="eyebrow">Live workflow</span>
          <h2>Start a multi-agent run</h2>
          <p>
            Submit a product idea and watch PM, Tech, QA, Principal Engineer and Review agents
            coordinate in real time. Outputs are exportable as Markdown.
          </p>
          <ol className="runner-steps">
            <li>Describe your product scenario in one or two sentences.</li>
            <li>Click Start collaboration to launch the agent workflow.</li>
            <li>Track progress and export Markdown or .ipynb results.</li>
          </ol>
        </div>
        <div className="runner-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setIdea('')
              setError('')
              setActiveStep('all')
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="runner-grid">
        <div className="runner-card idea-card">
          <IdeaInput value={idea} onChange={setIdea} />
          <button
            className="btn-primary btn-block"
            type="button"
            onClick={startRun}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Starting…' : 'Start collaboration'}
          </button>
          <button
            className="btn-secondary btn-block"
            type="button"
            onClick={cancelRun}
            disabled={
              !runId || !['running', 'queued'].includes(runStatus) || isSubmitting
            }
          >
            Stop run
          </button>
          {runId ? (
            <div className="run-meta">
              <div>
                <span>Run ID</span>
                <strong>{runId}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong className={`status-pill ${runStatus}`}>{runStatus}</strong>
              </div>
            </div>
          ) : null}
          {error ? <p className="runner-error">{error}</p> : null}
        </div>

        <div className="runner-card agent-card">
          <h3>Agent progress</h3>
          <div className="step-list">
            {['pm', 'tech', 'qa', 'principal', 'review'].map((step) => (
              <div key={step} className="step-row">
                <div>
                  <button
                    type="button"
                    className={`step-select ${activeStep === step ? 'active' : ''
                      }`}
                    onClick={() => setActiveStep(step)}
                  >
                    {step.toUpperCase()}
                  </button>
                  <span className={`status-pill ${stepStatuses[step] || 'pending'}`}>
                    {stepStatuses[step] || 'pending'}
                  </span>
                </div>
                <button
                  type="button"
                  className="step-action"
                  onClick={() => regenerateStep(step)}
                  disabled={
                    !runId ||
                    isSubmitting ||
                    (step === 'review' && stepStatuses.review === 'skipped')
                  }
                >
                  Regenerate
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="runner-card live-events-card">
          <h3>Live events</h3>
          <div className="event-filters">
            {['all', 'pm', 'tech', 'qa', 'principal', 'review'].map((step) => (
              <button
                key={step}
                type="button"
                className={`event-filter ${activeStep === step ? 'active' : ''
                  }`}
                onClick={() => setActiveStep(step)}
              >
                {step === 'all' ? 'All' : step.toUpperCase()}
              </button>
            ))}
          </div>
          {filteredEvents.length === 0 ? (
            <p className="muted">
              {events.length === 0
                ? 'Events will appear here once the run starts.'
                : 'No events for this step yet.'}
            </p>
          ) : (
            <div className="event-log">
              {filteredEvents.map((event, index) => (
                <div key={`${event.type}-${index}`} className="event-row">
                  {event.type === 'agent_to' ? (
                    <>
                      <span>
                        Orchestrator → {event.to}
                        {typeof event.iteration !== 'undefined'
                          ? ` (iter ${event.iteration})`
                          : ''}
                      </span>
                      {event.step ? <span>• {event.step}</span> : null}
                      {event.reason ? <span>• {event.reason}</span> : null}
                    </>
                  ) : event.type === 'agent_from' ? (
                    <>
                      <span>
                        {event.from} → Orchestrator
                        {typeof event.iteration !== 'undefined'
                          ? ` (iter ${event.iteration})`
                          : ''}
                      </span>
                      {event.step ? <span>• {event.step}</span> : null}
                      {event.preview ? <span>• {event.preview}</span> : null}
                    </>
                  ) : event.type === 'revision_started' ? (
                    <>
                      <span>Revision cycle {event.iteration} started</span>
                      {event.step ? <span>• {event.step}</span> : null}
                    </>
                  ) : event.type === 'revision_completed' ? (
                    <>
                      <span>Revision cycle {event.iteration} completed</span>
                      {event.step ? <span>• {event.step}</span> : null}
                    </>
                  ) : (
                    <>
                      <span>{event.type}</span>
                      {event.step ? <span>• {event.step}</span> : null}
                      {event.error ? <span>• {event.error}</span> : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="artifact-chip-row">
            {Object.entries(artifacts).map(([name, present]) => (
              <span
                key={name}
                className={`artifact-chip ${present ? 'ready' : 'missing'}`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="runner-export">
        <div className="export-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={fetchExport}
            disabled={!runId || runStatus !== 'completed' || isExporting}
          >
            {isExporting ? 'Fetching…' : 'Fetch Markdown output'}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={downloadNotebook}
            disabled={
              !runId ||
              runStatus !== 'completed' ||
              isNotebookDownloading ||
              isExporting
            }
          >
            {isNotebookDownloading ? 'Preparing…' : 'Download .ipynb'}
          </button>
        </div>
        {finalDoc ? (
          <div className="export-preview">
            <h4>Export preview</h4>
            <pre>{finalDoc}</pre>
          </div>
        ) : null}
      </div>
    </section>
  )
}
