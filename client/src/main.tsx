import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthApplication from './lab03/AuthApplication.tsx'
import RequesterApplication from './lab02/RequesterApplication.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname === '/legacy-requester' ? <RequesterApplication /> : <AuthApplication />}
  </React.StrictMode>,
)
