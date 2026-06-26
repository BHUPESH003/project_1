import { useState } from 'react'
import { Bell, Megaphone, Info, Package, Users, User } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { toast } from '@/stores/toastStore'
import {
  useSendNotification,
  type NotificationTarget,
  type AdminNotificationType,
} from '@/api/hooks/useAdminNotifications'

const TYPES: { value: AdminNotificationType; label: string; icon: typeof Bell; desc: string }[] = [
  {
    value: 'MARKETING',
    label: 'Marketing',
    icon: Megaphone,
    desc: 'Promotions, offers, and campaigns',
  },
  {
    value: 'SYSTEM',
    label: 'System',
    icon: Info,
    desc: 'App updates, policy changes',
  },
  {
    value: 'ORDER_UPDATE',
    label: 'Order update',
    icon: Package,
    desc: 'Manual order status messages',
  },
]

function ResultBanner({ sent, target }: { sent: number; target: NotificationTarget }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-success-border bg-success-soft px-4 py-3 text-success">
      <Bell size={18} className="shrink-0" />
      <p className="text-subhead font-semibold">
        {target === 'broadcast'
          ? `Broadcast sent to ${sent} user${sent !== 1 ? 's' : ''}`
          : 'Notification sent to user'}
      </p>
    </div>
  )
}

export function NotificationsPage() {
  const send = useSendNotification()

  const [target, setTarget] = useState<NotificationTarget>('broadcast')
  const [userId, setUserId] = useState('')
  const [type, setType] = useState<AdminNotificationType>('MARKETING')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [lastResult, setLastResult] = useState<{ sent: number; target: NotificationTarget } | null>(null)

  const titleMax = 80
  const bodyMax = 300

  function reset() {
    setTitle('')
    setBody('')
    setUserId('')
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required')
      return
    }
    if (target === 'user' && !userId.trim()) {
      toast.error('User ID is required for single-user notifications')
      return
    }
    try {
      const result = await send.mutateAsync({
        target,
        userId: target === 'user' ? userId.trim() : undefined,
        type,
        title: title.trim(),
        body: body.trim(),
      })
      setLastResult({ sent: result.sent, target: result.target })
      reset()
    } catch {
      toast.error('Failed to send notification')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Push Notifications</h1>
        <p className="mt-1 text-subhead text-text-2">
          Compose and send in-app notifications. They appear in users' notification inboxes instantly.
        </p>
      </div>

      {lastResult && (
        <div className="mb-6">
          <ResultBanner sent={lastResult.sent} target={lastResult.target} />
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-border bg-surface p-6">
        {/* Target */}
        <div>
          <p className="mb-2.5 text-subhead font-semibold text-text">Send to</p>
          <div className="flex gap-3">
            {(
              [
                { value: 'broadcast', label: 'All users', Icon: Users },
                { value: 'user', label: 'Specific user', Icon: User },
              ] as { value: NotificationTarget; label: string; Icon: typeof Users }[]
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setTarget(value); setLastResult(null) }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border-[1.5px] py-2.5 text-subhead font-semibold transition-colors',
                  target === value
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-bg text-text-2 hover:border-text-3',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {target === 'user' && (
            <div className="mt-3">
              <Field
                label="User ID"
                placeholder="Enter the user's ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <p className="mb-2.5 text-subhead font-semibold text-text">Notification type</p>
          <div className="grid grid-cols-3 gap-2.5">
            {TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border-[1.5px] px-3 py-2.5 text-left transition-colors',
                  type === value
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-bg text-text-2 hover:border-text-3',
                )}
              >
                <span className="flex items-center gap-1.5 text-subhead font-semibold">
                  <Icon size={14} />
                  {label}
                </span>
                <span className="text-caption opacity-75">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <Field
            label={`Title (${title.length}/${titleMax})`}
            placeholder="Short, attention-grabbing headline"
            value={title}
            maxLength={titleMax}
            onChange={(e) => { setTitle(e.target.value); setLastResult(null) }}
          />
        </div>

        {/* Body */}
        <div>
          <label className="flex flex-col gap-1.75">
            <span className="text-subhead font-medium text-text-2">
              Message ({body.length}/{bodyMax})
            </span>
            <span className="flex min-h-30 rounded-md border-[1.5px] border-border bg-surface px-3.5 py-3 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]">
              <textarea
                rows={4}
                maxLength={bodyMax}
                placeholder="Full notification message shown in the inbox…"
                value={body}
                onChange={(e) => { setBody(e.target.value); setLastResult(null) }}
                className="flex-1 resize-none bg-transparent text-body text-text outline-none placeholder:text-text-3"
              />
            </span>
          </label>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-lg border border-border-faint bg-bg p-4">
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-3">
              Preview
            </p>
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
                {type === 'MARKETING' ? (
                  <Megaphone size={16} />
                ) : type === 'ORDER_UPDATE' ? (
                  <Package size={16} />
                ) : (
                  <Info size={16} />
                )}
              </span>
              <div>
                <p className="text-body font-bold text-text">{title || '—'}</p>
                <p className="text-caption text-text-2">{body || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          full
          size="lg"
          loading={send.isPending}
          disabled={!title.trim() || !body.trim() || (target === 'user' && !userId.trim())}
          onClick={handleSend}
        >
          <Bell size={17} />
          {target === 'broadcast' ? 'Broadcast to all users' : 'Send to user'}
        </Button>
      </div>
    </div>
  )
}
