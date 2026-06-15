import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, LogOut, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useSellerProfile } from '@/api/hooks/useSeller'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

/** Shown to a registered-but-unverified seller. Polls /sellers/me every 60s. */
export function PendingApprovalPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const { data: seller, isLoading } = useSellerProfile({ pollMs: 60_000 })

  useEffect(() => {
    if (!seller) return
    if (seller.isSuspended) {
      navigate('/suspended', { replace: true })
    } else if (seller.isVerified) {
      toast.success('Your shop has been approved! 🎉')
      navigate('/dashboard', { replace: true })
    }
  }, [seller, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-[max(56px,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-1 flex-col items-center text-center"
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="grid h-20 w-20 place-items-center rounded-full bg-warning-soft text-warning"
        >
          <Clock size={38} />
        </motion.div>
        <h1 className="mt-6 text-title-lg font-extrabold text-text">
          Your shop is under review
        </h1>
        <p className="mt-2 max-w-[300px] text-body text-text-2">
          We're verifying your details. This usually takes 24–48 hours. We'll
          notify you the moment you're approved.
        </p>

        {seller && (
          <div className="mt-6 w-full rounded-xl border border-border bg-surface p-4 text-left">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-3">
              Submitted shop
            </p>
            <p className="mt-1 text-body font-bold text-text">{seller.shopName}</p>
            <p className="text-subhead text-text-2">{seller.address}</p>
          </div>
        )}
      </motion.div>

      <div className="flex flex-col gap-2.5">
        <Button
          full
          variant="secondary"
          icon={<Pencil size={17} />}
          onClick={() => navigate('/register', { state: { edit: true } })}
        >
          Edit profile
        </Button>
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
    </div>
  )
}
