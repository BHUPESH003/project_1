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
    if (isAuthed) navigate('/', { replace: true })
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
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-lg"
      >
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-float"
          style={{ background: 'var(--grad-primary)' }}
        >
          <Store size={26} />
        </div>
        <h1 className="mt-6 text-display font-extrabold leading-tight tracking-[-0.02em] text-text">
          Admin Console
        </h1>
        <p className="mt-2 text-body text-text-2">
          Sign in to manage orders, sellers, content and payouts.
        </p>

        <div className="mt-7">
          <label className="mb-2 block text-subhead font-medium text-text-2">Phone number</label>
          <div className="flex items-center rounded-md border-[1.5px] border-border bg-surface focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]">
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

        <Button
          full
          size="lg"
          className="mt-6"
          disabled={!valid}
          loading={requestOtp.isPending}
          onClick={submit}
        >
          Continue
        </Button>
        <p className="mt-3 text-center text-caption text-text-3">
          Admin access only. Unauthorised use is prohibited.
        </p>
      </motion.div>
    </div>
  )
}
