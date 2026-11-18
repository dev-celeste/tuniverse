import { Navigate, Route, Routes } from 'react-router'

import RequireSession from './components/RequireSession'
import Universe from './components/Universe'
import Galaxy from './pages/Galaxy'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      {/* One persistent 3D scene under all three pages, so moving between them flies the camera */}
      <Route element={<Universe />}>
        <Route index element={<Landing />} />
        <Route path="demo" element={<Galaxy source="demo" />} />
        {/* Needs a Spotify session */}
        <Route element={<RequireSession />}>
          <Route path="galaxy" element={<Galaxy source="live" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
