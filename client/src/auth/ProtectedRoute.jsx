import { Navigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.text}>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '12px'
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  text: {
    color: '#64748b',
    fontSize: '14px'
  }
}
