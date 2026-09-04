import { useState } from 'react'
import CreateTicket from './CreateTicket'
import MyTickets from './MyTickets'
import RequesterSelection from './RequesterSelection'
import { RequesterProvider, useRequesterContext } from './requester-context'
import './requester-application.css'

function RequesterApplicationContent() {
  const { requester, clearRequester } = useRequesterContext()
  const [page, setPage] = useState<'home' | 'create' | 'tickets'>('tickets')

  if (!requester) {
    return <RequesterSelection />
  }

  return (
    <main className="requester-application-shell">
      <header className="requester-application-header">
        <strong>TokTickIT</strong>
        <div className="requester-application-context">
          <span>Development Requester: {requester.name}</span>
          <button type="button" onClick={() => { setPage('home'); clearRequester() }}>Change Requester</button>
        </div>
      </header>
      <nav className="requester-application-nav" aria-label="Requester navigation">
        <button type="button" aria-current={page === 'tickets' ? 'page' : undefined} onClick={() => setPage('tickets')}>My Tickets</button>
        <button type="button" aria-current={page === 'create' ? 'page' : undefined} onClick={() => setPage('create')}>Create Ticket</button>
      </nav>
      <main className="requester-application-content">
        {page === 'create' ? <CreateTicket onBack={() => setPage('tickets')} /> : page === 'tickets' ? <MyTickets onCreateTicket={() => setPage('create')} /> : (
          <section aria-labelledby="requester-context-title">
            <h1 id="requester-context-title">Requester context selected</h1>
            <p>This temporary context is ready for the Lab 2 requester screens.</p>
          </section>
        )}
      </main>
    </main>
  )
}

export default function RequesterApplication() {
  return (
    <RequesterProvider>
      <RequesterApplicationContent />
    </RequesterProvider>
  )
}
