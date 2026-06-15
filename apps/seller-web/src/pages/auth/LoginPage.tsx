import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRequestOtp } from '@/api/hooks/useAuth'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const [raw, setRaw] = useState('')
  const requestOtp = useRequestOtp()

  useEffect(() => {
    if (isAuthed) navigate('/dashboard', { replace: true })
  }, [isAuthed, navigate])

  const digits = raw.replace(/\D/g, '').slice(0, 10)
  const display = digits.replace(/(\d{5})(\d{0,5})/, (_, a, b) => (b ? `${a} ${b}` : a))
  const valid = digits.length === 10

  async function submit() {
    if (!valid) return
    const phone = `+91${digits}`
    try {
      await requestOtp.mutateAsync(phone)
      navigate('/verify-otp', { state: { phone } })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-[max(48px,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-1 flex-col"
      >
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl text-on-primary shadow-float"
          style={{ background: 'var(--grad-primary)' }}
        >
          <Store size={26} />
        </div>
        <h1 className="mt-7 text-display font-extrabold leading-tight tracking-[-0.02em] text-text">
          Seller Console
        </h1>
        <p className="mt-2 text-body text-text-2">
          Receive orders, manage your catalog, and track earnings — all from your phone.
        </p>

        <div className="mt-9">
          <label className="mb-2 block text-subhead font-medium text-text-2">Phone number</label>
          <div className="flex items-center gap-0 rounded-md border-[1.5px] border-border bg-surface px-0 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]">
            <span className="flex items-center gap-1.5 px-3.5 text-body text-text">
              <span className="text-[18px]">🇮🇳</span>
              <span className="mono-num">+91</span>
            </span>
            <span className="my-3 w-px self-stretch bg-border" />
            <input
              autoFocus
              inputMode="tel"
              placeholder="98765 43210"
              value={display}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="min-h-[50px] flex-1 border-none bg-transparent px-3 text-body text-text outline-none mono-num placeholder:text-text-3 placeholder:font-sans"
            />
          </div>
        </div>
      </motion.div>

      <div className="mt-6">
        <Button full size="lg" disabled={!valid} loading={requestOtp.isPending} onClick={submit}>
          Continue
        </Button>
        <p className="mt-3 text-center text-caption text-text-3">
          By continuing, you agree to our <span className="text-primary">Terms</span> and{' '}
          <span className="text-primary">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
