import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider, useSession } from './providers/SessionProvider'
import { ToastProvider } from './providers/ToastProvider'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import CrewGate from './pages/CrewGate'
import Trips from './pages/Trips'
const Now = lazy(() => import('./pages/Now')) // keeps Mapbox out of the initial bundle
import './styles/auth.css'

function Splash() {
  return <div className="gate"><span className="word">LINK<b>UP</b></span></div>
}

// Gate order: session → onboarding → crew → app.
function Gate({ children }) {
  const { session, needsOnboarding, crews, activeCrew } = useSession()
  if (session === undefined) return <Splash />
  if (!session) return <Login />
  if (needsOnboarding) return <Onboarding />
  if (crews === null) return <Splash />
  if (!activeCrew) return <CrewGate />
  return children
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Gate>
          <Routes>
            <Route path="/" element={<Navigate to="/now" replace />} />
            <Route path="/now" element={<Suspense fallback={<Splash />}><Now /></Suspense>} />
            <Route path="/trips" element={<Trips />} />
            <Route path="*" element={<Navigate to="/now" replace />} />
          </Routes>
        </Gate>
      </ToastProvider>
    </SessionProvider>
  )
}
