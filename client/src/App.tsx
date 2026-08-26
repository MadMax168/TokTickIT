import { useEffect, useState } from 'react'
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
        fetch('/api/health'),
        fetch('/api/categories'),
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('autoCheck')) {
      void checkSystem()
    }
  }, [])

  return (
    <main className="service-desk">
      <div className="desk-shell">
        <header className="brand mb-5"><span className="brand-mark">✓</span>TokTickIT</header>
        <section className="row g-4 align-items-center">
          <div className="col-lg-7 hero-copy">
            <p className="eyebrow">IT Service Desk</p>
            <h1 className="hero-title">TokTickIT IT Service Desk</h1>
            <p className="hero-promise">Support that keeps work moving.</p>
            <p className="hero-description">Check live service availability and discover the request categories our team can help with.</p>
            <div className="row g-3 mt-4">
              <div className="col-sm-6"><article className="info-card"><div className="info-number">24/7</div><h2 className="info-title">Always available</h2><p className="info-copy">Quick visibility into your support service.</p></article></div>
              <div className="col-sm-6"><article className="info-card"><div className="info-number">4</div><h2 className="info-title">Request areas</h2><p className="info-copy">Get help with access, hardware, software, and networks.</p></article></div>
            </div>
          </div>
          <div className="col-lg-5">
            <section className="panel" aria-label="System connection">
              <div className="panel-head">
                <p className="eyebrow">Service monitor</p>
                <h2 className="panel-title">Connect to TokTickAPI</h2>
                <p className="panel-copy">Verify the API and load available support categories.</p>
                <button className="check-button mt-4" disabled={systemStatus === 'loading'} onClick={checkSystem} type="button">{systemStatus === 'loading' ? 'Checking service...' : 'Check System'}</button>
              </div>
              {systemStatus === 'loading' && <p className="status-box status-loading" role="status">⏳ Loading…</p>}
              {systemStatus === 'online' && <><div className="status-box status-online" role="status"><p className="status-label">System Status: Online</p><p className="status-detail">TokTickAPI is connected and ready.</p></div><h3 className="category-heading">Supported Request Categories</h3><ul className="category-list" aria-label="Supported Request Categories">{categories.map((category) => <li className="category-item" key={category.id}><span className="category-icon">{String(category.id).padStart(2, '0')}</span>{category.name}</li>)}</ul></>}
              {systemStatus === 'offline' && <div className="status-box status-offline" role="alert"><p className="status-label">System Status: Offline</p><p className="status-detail">Unable to connect to TokTickIT API</p><p className="status-detail">Start the server and try again.</p></div>}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
