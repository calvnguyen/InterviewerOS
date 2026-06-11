import { useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'

export default function Login() {
  const { signInWithGoogle } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await signInWithGoogle()
      if (authError) {
        setError('Sign-in failed. Please try again.')
        setLoading(false)
      }
      // On success, Supabase redirects the browser to Google — no navigation needed here.
    } catch {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>I</span>
          <span style={styles.brandName}>InterviewOS</span>
        </div>
        <h1 style={styles.title}>Your job search, organised</h1>
        <p style={styles.subtitle}>
          Sign in with Google to sync your Gmail inbox and manage your application pipeline.
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          data-testid="google-signin-button"
          style={{ ...styles.googleButton, ...(loading ? styles.buttonDisabled : {}) }}
        >
          <svg style={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting to Google...' : 'Sign in with Google'}
        </button>

        <p style={styles.note}>
          InterviewOS requests read-only Gmail access to import your job application emails.
          Your emails are never stored or shared.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: '24px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.06)',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '28px'
  },
  brandIcon: {
    width: '36px',
    height: '36px',
    background: '#6366f1',
    color: '#fff',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '18px'
  },
  brandName: {
    fontWeight: '800',
    fontSize: '20px',
    color: '#0f172a'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: '1.5'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px'
  },
  googleButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '13px 20px',
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'background 0.15s, box-shadow 0.15s'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  googleIcon: {
    flexShrink: 0
  },
  note: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.5'
  }
}
