import React, { useEffect, useMemo, useState } from 'react'
import IdeaInput from './IdeaInput'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const EVENT_LIMIT = 8

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

  const stepStatuses = useMemo(() => {
    const statusMap = {}
    steps.forEach((step) => {
      statusMap[step.name] = step.status
    })
    return statusMap
  }, [steps])

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

    const stream = new EventSource(`${API_BASE_URL}/runs/${runId}/events`)

    stream.onmessage = (event) => {
      if (!event.data) {
        return
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
    }

    return () => {
      stream.close()
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
            Submit a product idea and watch PM, Tech, QA, and Review agents
            coordinate in real time. Outputs are exportable as Markdown.
          </p>
        </div>
        <div className="runner-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={startRun}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Starting…' : 'Start collaboration'}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setIdea('')
              setError('')
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="runner-grid">
        <div className="runner-card">
          <IdeaInput value={idea} onChange={setIdea} />
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

        <div className="runner-card">
          <h3>Agent progress</h3>
          <div className="step-list">
            {['pm', 'tech', 'qa', 'review'].map((step) => (
              <div key={step} className="step-row">
                <div>
                  <strong>{step.toUpperCase()}</strong>
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

        <div className="runner-card">
          <h3>Live events</h3>
          {events.length === 0 ? (
            <p className="muted">Events will appear here once the run starts.</p>
          ) : (
            <div className="event-log">
              {events.map((event, index) => (
                <div key={`${event.type}-${index}`} className="event-row">
                  <span>{event.type}</span>
                  {event.step ? <span>• {event.step}</span> : null}
                  {event.error ? <span>• {event.error}</span> : null}
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
