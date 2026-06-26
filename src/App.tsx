import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DocsPage from './pages/DocsPage'
import HomePage from './pages/HomePage'
import LabApp from './lab/LabApp'
import { DeviceStoreProvider } from './lab/devices/device_store'
import { GraphStoreProvider } from './lab/graphs/graph_store'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DeviceStoreProvider>
        <GraphStoreProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lab/*" element={<LabApp />} />
            <Route path="/docs/*" element={<DocsPage />} />
          </Routes>
        </GraphStoreProvider>
      </DeviceStoreProvider>
    </BrowserRouter>
  )
}

export default App
