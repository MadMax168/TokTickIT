import { useState } from 'react'
import './App.css'

type SystemStatus = 'idle' | 'loading' | 'online' | 'offline'

function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('idle')

  const checkSystem = async () => {
    setSystemStatus('loading')

    try {
      const response = await fetch('http://localhost:3000/api/health')
      const health = await response.json()

      if (!response.ok || health.status !== 'ok') {
        throw new Error('Health check failed')
      }

      setSystemStatus('online')
    } catch {
      setSystemStatus('offline')
    }
  }

  return (
    <main className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="card-title mb-4">TokTickIT IT Service Desk</h1>
          <button
            className="btn btn-primary"
            disabled={systemStatus === 'loading'}
            onClick={checkSystem}
            type="button"
          >
            Check System
          </button>

          {systemStatus === 'loading' && (
            <p className="mt-3 mb-0 text-muted" role="status">⏳ Loading…</p>
          )}
          {systemStatus === 'online' && (
            <p className="mt-3 mb-0 text-success" role="status">System Status: Online</p>
          )}
          {systemStatus === 'offline' && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              <p className="mb-1">System Status: Offline</p>
              <p className="mb-0">Unable to connect to TokTickIT API</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
