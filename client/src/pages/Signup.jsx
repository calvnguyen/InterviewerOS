import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Account creation is handled by Google Sign-In on the login page.
export default function Signup() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/login', { replace: true })
  }, [navigate])
  return null
}
