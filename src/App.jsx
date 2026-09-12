import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider, useSession } from './providers/SessionProvider'
import { ToastProvider } from './providers/ToastProvider'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import CrewGate from './pages/CrewGate'
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

function Placeholder() {
  const { signOut, profile } = useSession()
  return (
    <div className="gate"><div className="card">
      <span className="word">LINK<b>UP</b></span>
      <p>Signed in as {profile?.display_name}. Dashboards coming next.</p>
      <button className="btn ghost" onClick={signOut}>Sign out</button>
    </div></div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Gate>
          <Routes>
            <Route path="/" element={<Navigate to="/now" replace />} />
            <Route path="*" element={<Placeholder />} />
          </Routes>
        </Gate>
      </ToastProvider>
    </SessionProvider>
  )
}
