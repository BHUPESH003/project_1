import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/stores/toastStore'

const iconFor: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} className="text-success" />,
  error: <XCircle size={20} className="text-danger" />,
  info: <Info size={20} className="text-info" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
}

/** Bottom-anchored toast stack, constrained to the app container width. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-[380px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-surface-inverse px-4 py-3 shadow-float"
          >
            {iconFor[t.type]}
            <span className="flex-1 text-subhead font-medium text-on-inverse">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-on-inverse/60 hover:text-on-inverse" aria-label="Dismiss">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
