import { Navigate, Route, Routes } from 'react-router'

import RequireSession from './components/RequireSession'
import Demo from './pages/Demo'
import Galaxy from './pages/Galaxy'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/demo" element={<Demo />} />
      {/* Everything inside needs a Spotify session */}
      <Route element={<RequireSession />}>
        {/* The backend redirects here after a successful Spotify login */}
        <Route path="/galaxy" element={<Galaxy />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
