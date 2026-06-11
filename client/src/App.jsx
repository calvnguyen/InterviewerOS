import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Pipeline from './pages/Pipeline.jsx'

function RootRedirect() {
  const { session, loading } = useSession()
  if (loading) return null
  return session ? <Navigate to="/pipeline" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/login"
        element={
          <ErrorBoundary>
            <Login />
          </ErrorBoundary>
        }
      />

      <Route
        path="/signup"
        element={
          <ErrorBoundary>
            <Signup />
          </ErrorBoundary>
        }
      />

      <Route
        path="/pipeline"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Pipeline />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
