import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider, useSession } from './providers/SessionProvider'
import { ToastProvider } from './providers/ToastProvider'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import CrewGate from './pages/CrewGate'
import Trips from './pages/Trips'
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
            <Route path="/" element={<Navigate to="/trips" replace />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="*" element={<Navigate to="/trips" replace />} />
          </Routes>
        </Gate>
      </ToastProvider>
    </SessionProvider>
  )
}
