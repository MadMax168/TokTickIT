import { useState } from 'react'
import './App.css'

interface Category {
  id: number
  name: string
}

type SystemStatus = 'idle' | 'loading' | 'online' | 'offline'

function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('idle')
  const [categories, setCategories] = useState<Category[]>([])

  const checkSystem = async () => {
    setSystemStatus('loading')
    setCategories([])

    try {
      const [healthResponse, categoriesResponse] = await Promise.all([
        fetch('http://localhost:3000/api/health'),
        fetch('http://localhost:3000/api/categories'),
      ])
      const health = await healthResponse.json()
      const categoryList = await categoriesResponse.json()

      if (!healthResponse.ok || !categoriesResponse.ok || health.status !== 'ok') {
        throw new Error('Health check failed')
      }

      setCategories(categoryList)
      setSystemStatus('online')
    } catch {
      setSystemStatus('offline')
      setCategories([])
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
            <div className="mt-3">
              <p className="mb-2 text-success" role="status">System Status: Online</p>
              <p><strong>Supported Request Categories</strong></p>
              <ul>
                {categories.map((category) => <li key={category.id}>{category.name}</li>)}
              </ul>
            </div>
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
