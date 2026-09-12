import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider, useSession } from './providers/SessionProvider'
import { ToastProvider } from './providers/ToastProvider'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Reset from './pages/auth/Reset'
import UpdatePassword from './pages/auth/UpdatePassword'
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
  const location = useLocation()
  if (session === undefined) return <Splash />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (needsOnboarding) return <Onboarding />
  if (crews === null) return <Splash />
  if (!activeCrew) return <CrewGate />
  return children
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/signup" element={<Public><Signup /></Public>} />
          <Route path="/reset" element={<Public><Reset /></Public>} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="*" element={<Gate><AppRoutes /></Gate>} />
        </Routes>
      </ToastProvider>
    </SessionProvider>
  )
}

// Auth screens bounce signed-in users into the app.
function Public({ children }) {
  const { session } = useSession()
  if (session === undefined) return <Splash />
  if (session) return <Navigate to="/now" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/now" replace />} />
      <Route path="/now" element={<Suspense fallback={<Splash />}><Now /></Suspense>} />
      <Route path="/trips" element={<Trips />} />
      <Route path="/trips/day" element={<Trips />} />
      <Route path="/trips/photos" element={<Trips />} />
      <Route path="*" element={<Navigate to="/now" replace />} />
    </Routes>
  )
}
