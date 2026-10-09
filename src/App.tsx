import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { DemoProvider } from './context/DemoContext'
import { JalNyayPage } from './pages/JalNyayPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { OverviewPage } from './pages/OverviewPage'
import { ScenarioLabPage } from './pages/ScenarioLabPage'
import { TurnTrackerPage } from './pages/TurnTrackerPage'
import type { PageId } from './types'

function Dashboard() {
  const [page, setPage] = useState<PageId>('overview')

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {page === 'overview' ? <OverviewPage onNavigate={setPage} /> : null}
      {page === 'jalnyay' ? <JalNyayPage /> : null}
      {page === 'scenario' ? <ScenarioLabPage /> : null}
      {page === 'turns' ? <TurnTrackerPage /> : null}
      {page === 'maintenance' ? <MaintenancePage /> : null}
    </AppShell>
  )
}

function App() {
  return (
    <DemoProvider>
      <Dashboard />
    </DemoProvider>
  )
}

export default App
