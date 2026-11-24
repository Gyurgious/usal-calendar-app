import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Styles first, in this order: Bootstrap, then the shared theme that restyles it. Feature stylesheets are
// imported by their components (through App below), so they load after both and can build on them.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
