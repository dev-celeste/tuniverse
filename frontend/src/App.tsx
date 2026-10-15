import { Navigate, Route, Routes } from 'react-router'

import Demo from './pages/Demo'
import Galaxy from './pages/Galaxy'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* The backend redirects here after a successful Spotify login */}
      <Route path="/galaxy" element={<Galaxy />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
