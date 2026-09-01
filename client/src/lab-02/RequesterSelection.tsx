import { useEffect, useState } from 'react'
import { type DevelopmentRequester, useRequesterContext } from './requester-context'
import './requester-selection.css'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function RequesterSelection() {
  const { selectRequester } = useRequesterContext()
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('loading')

  const loadRequesters = async () => {
    setLoadState('loading')
    setSelectedId('')

    try {
      const response = await fetch('/api/development-requesters')
      if (!response.ok) {
        throw new Error('Unable to load Development Requesters')
      }
      const data = await response.json() as { items?: DevelopmentRequester[] }
      const items = data.items ?? []
      setRequesters(items)
      setLoadState(items.length === 0 ? 'empty' : 'ready')
    } catch {
      setRequesters([])
      setLoadState('error')
    }
  }

  useEffect(() => {
    void loadRequesters()
  }, [])

  const selectedRequester = requesters.find((requester) => String(requester.id) === selectedId)

  return (
    <main className="requester-selection-page">
      <section className="requester-selection-card" aria-labelledby="requester-selection-title">
        <p className="requester-selection-eyebrow">TokTickIT</p>
        <h1 id="requester-selection-title">Choose a Development Requester</h1>
        <p>This selector is for Lab 2 testing only. It is not a sign-in screen.</p>

        {loadState === 'loading' && <p role="status">Loading Development Requesters…</p>}
        {loadState === 'empty' && <p>No active Development Requesters are available.</p>}
        {loadState === 'error' && <div role="alert">Unable to load Development Requesters.</div>}

        {(loadState === 'ready' || loadState === 'loading') && (
          <label className="requester-selection-field">
            Development Requester
            <select
              aria-label="Development Requester"
              value={selectedId}
              disabled={loadState !== 'ready'}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Select a Development Requester</option>
              {requesters.map((requester) => (
                <option key={requester.id} value={requester.id}>{requester.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="requester-selection-actions">
          {(loadState === 'error' || loadState === 'empty') && (
            <button type="button" onClick={() => void loadRequesters()}>Retry</button>
          )}
          <button type="button" onClick={() => setSelectedId('')} disabled={!selectedId}>Cancel</button>
          <button type="button" onClick={() => selectedRequester && selectRequester(selectedRequester)} disabled={!selectedRequester}>
            Continue
          </button>
        </div>
      </section>
    </main>
  )
}
