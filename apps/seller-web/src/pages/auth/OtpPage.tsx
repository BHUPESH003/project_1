import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { ArrowLeft, ChevronLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OtpInput } from '@/components/ui/OtpInput'
import { useRequestOtp, useVerifyOtp } from '@/api/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { formatPhone } from '@/lib/format'

const RESEND_DELAY = 30

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const phone = (location.state as { phone?: string } | null)?.phone

  const login = useAuthStore((s) => s.login)
  const verifyOtp = useVerifyOtp()
  const requestOtp = useRequestOtp()
  const controls = useAnimationControls()

  const [otp, setOtp] = useState('')
  const [error, setError] = useState(false)
  const [timer, setTimer] = useState(RESEND_DELAY)
  const submitting = useRef(false)

  useEffect(() => {
    if (!phone) navigate('/login', { replace: true })
  }, [phone, navigate])

  useEffect(() => {
    if (timer <= 0) return
    const t = setInterval(() => setTimer((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [timer])

  async function submit(code: string) {
    if (!phone || code.length !== 6 || submitting.current) return
    submitting.current = true
    setError(false)
    try {
      const res = await verifyOtp.mutateAsync({ phone, otp: code })
      login({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user })
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(true)
      setOtp('')
      controls.start({ x: [0, -10, 10, -8, 8, 0], transition: { duration: 0.4 } })
      toast.error(getErrorMessage(e, 'Incorrect code. Please try again.'))
    } finally {
      submitting.current = false
    }
  }

  async function resend() {
    if (timer > 0 || !phone) return
    try {
      await requestOtp.mutateAsync(phone)
      setTimer(RESEND_DELAY)
      setOtp('')
      setError(false)
      toast.success('OTP resent successfully')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (!phone) return null

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-[max(20px,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-1 flex-col"
      >
        <button
          onClick={() => navigate('/login')}
          aria-label="Back"
          className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2"
        >
          <ArrowLeft size={22} />
        </button>

        <h1 className="mt-4 text-display font-extrabold tracking-[-0.02em] text-text">
          Enter verification code
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-body text-text-2">
          Sent to <b className="text-text mono-num">{formatPhone(phone)}</b>
          <button onClick={() => navigate('/login')} className="inline-flex items-center text-primary font-semibold">
            <ChevronLeft size={14} /> Edit
          </button>
        </p>

        <motion.div animate={controls} className="mt-8">
          <OtpInput value={otp} onChange={setOtp} error={error} autoFocus onComplete={submit} />
        </motion.div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-subhead font-medium text-danger">
            <AlertTriangle size={15} /> Incorrect code. Please try again.
          </p>
        )}

        <div className="mt-5 text-subhead text-text-2">
          {timer > 0 ? (
            <span>
              Resend code in{' '}
              <span className="mono-num font-semibold text-text">
                0:{timer.toString().padStart(2, '0')}
              </span>
            </span>
          ) : (
            <button onClick={resend} className="font-semibold text-primary" disabled={requestOtp.isPending}>
              Resend code
            </button>
          )}
        </div>
      </motion.div>

      <Button
        full
        size="lg"
        disabled={otp.length !== 6}
        loading={verifyOtp.isPending}
        onClick={() => submit(otp)}
      >
        Verify
      </Button>
    </div>
  )
}
