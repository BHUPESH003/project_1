import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ban, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

/** Shown to an admin-suspended seller. No actions other than logout. */
export function SuspendedPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-[max(56px,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-1 flex-col items-center text-center"
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-danger-soft text-danger">
          <Ban size={38} />
        </div>
        <h1 className="mt-6 text-title-lg font-extrabold text-text">
          Your account is suspended
        </h1>
        <p className="mt-2 max-w-[300px] text-body text-text-2">
          Your shop has been temporarily suspended. Please contact support to
          resolve this and restore your account.
        </p>
        <a
          href="mailto:support@pelocal.com"
          className="mt-4 text-subhead font-semibold text-primary"
        >
          support@pelocal.com
        </a>
      </motion.div>

      <Button
        full
        variant="ghost"
        icon={<LogOut size={17} />}
        onClick={() => {
          logout()
          navigate('/login', { replace: true })
        }}
      >
        Log out
      </Button>
    </div>
  )
}
