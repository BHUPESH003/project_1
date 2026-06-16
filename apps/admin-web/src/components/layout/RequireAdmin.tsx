import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * Gate for every route behind the AdminShell. Redirects to /login when there's
 * no session, and to /unauthorized when the authenticated user is not an ADMIN.
 * The role is re-validated here in addition to the OTP-verify check.
 */
export function RequireAdmin() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)

  useEffect(() => {
    if (!isAuthed) {
      navigate('/login', { replace: true })
    } else if (role && role !== 'ADMIN') {
      navigate('/unauthorized', { replace: true })
    }
  }, [isAuthed, role, navigate])

  if (!isAuthed || (role && role !== 'ADMIN')) return null
  return <Outlet />
}
