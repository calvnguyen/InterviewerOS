import { useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import Logo from '../components/Logo.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-[420px] shadow-lg">
        <CardContent className="pt-10 pb-10 px-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-7">
            <Logo size={48} />
            <span className="font-extrabold text-xl text-slate-900">InterviewerOS</span>
          </div>

          <h1 className="text-[22px] font-bold text-slate-900 mb-2">Your job search, organised</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Sign in with Google to sync your Gmail inbox and manage your application pipeline.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            data-testid="google-signin-button"
            variant="outline"
            className="w-full h-11 text-sm font-semibold gap-3"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Redirecting to Google...' : 'Sign in with Google'}
          </Button>

          <p className="mt-5 text-xs text-slate-400 leading-relaxed">
            InterviewerOS requests read-only Gmail access to import your job application emails.
            Your emails are never stored or shared.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
