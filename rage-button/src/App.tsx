import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { RagePage } from './pages/RagePage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { logger } from './utils/logger'
import { startFPSTracking } from './utils/metrics'
import { getSessionId } from './utils/session'
import './index.css'

logger.intercept()
startFPSTracking()
getSessionId()

function App() {
  useEffect(() => {
    console.log('[RageTrigger] System initialized')
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <Routes>
          <Route path="/" element={<RagePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:id" element={<IncidentDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
