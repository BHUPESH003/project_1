import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <ShieldX size={26} />
        </div>
        <h1 className="mt-6 text-title-lg font-extrabold text-text">Access denied</h1>
        <p className="mt-2 text-body text-text-2">
          This console is for platform administrators only. Your account does not have
          admin access.
        </p>
        <Button
          full
          size="lg"
          variant="secondary"
          className="mt-6"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          Back to sign in
        </Button>
      </div>
    </div>
  )
}
