import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DocsPage from './pages/DocsPage'
import HomePage from './pages/HomePage'
import LabApp from './lab/LabApp'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lab/*" element={<LabApp />} />
        <Route path="/docs/*" element={<DocsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
