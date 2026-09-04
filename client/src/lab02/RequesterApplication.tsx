import RequesterSelection from './RequesterSelection'
import { RequesterProvider, useRequesterContext } from './requester-context'
import './requester-application.css'

function RequesterApplicationContent() {
  const { requester, clearRequester } = useRequesterContext()

  if (!requester) {
    return <RequesterSelection />
  }

  return (
    <main className="requester-application-shell">
      <header className="requester-application-header">
        <strong>TokTickIT</strong>
        <div className="requester-application-context">
          <span>Development Requester: {requester.name}</span>
          <button type="button" onClick={clearRequester}>Change Requester</button>
        </div>
      </header>
      <section className="requester-application-content" aria-labelledby="requester-context-title">
        <h1 id="requester-context-title">Requester context selected</h1>
        <p>This temporary context is ready for the Lab 2 requester screens.</p>
      </section>
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
