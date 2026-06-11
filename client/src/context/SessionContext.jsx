import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [providerToken, setProviderToken] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      // provider_token is only present on SIGNED_IN after OAuth redirect; capture it in memory
      if (event === 'SIGNED_IN' && newSession?.provider_token) {
        setProviderToken(newSession.provider_token)
      }
      if (event === 'SIGNED_OUT') {
        setProviderToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user,
    loading,
    providerToken,
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.readonly',
          queryParams: { access_type: 'offline', prompt: 'consent' },
          redirectTo: `${window.location.origin}/pipeline`
        }
      }),
    signOut: () => supabase.auth.signOut()
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return ctx
}
