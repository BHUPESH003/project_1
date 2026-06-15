/* eslint-disable react-hooks/set-state-in-effect -- prefill local form state from fetched server data */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { StackHeader } from '@/components/layout/StackHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { useMe, useUpdateMe } from '@/api/hooks/useUser'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeStore, type ThemePref } from '@/stores/themeStore'
import { formatPhone } from '@/lib/format'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/cn'

const THEMES: { key: ThemePref; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const updateMe = useUpdateMe()
  const logout = useAuthStore((s) => s.logout)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled)
  const themePref = useThemeStore((s) => s.pref)
  const setThemePref = useThemeStore((s) => s.setPref)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (!me) return
    setName(me.name ?? '')
    setEmail(me.email ?? '')
  }, [me])

  const dirty = me ? name !== (me.name ?? '') || email !== (me.email ?? '') : false

  async function save() {
    try {
      await updateMe.mutateAsync({ name: name.trim() || undefined, email: email.trim() || undefined })
      toast.success('Profile updated')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <StackHeader title="Account" />

      <div className="px-4 pb-10">
        <h2 className="mb-2 mt-4 text-subhead font-bold uppercase tracking-wide text-text-2">
          Profile
        </h2>
        <div className="flex flex-col gap-4">
          <Field label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field label="Phone" value={me ? formatPhone(me.phone) : ''} disabled readOnly />
          {dirty && (
            <Button full loading={updateMe.isPending} onClick={save}>
              Save profile
            </Button>
          )}
        </div>

        <h2 className="mb-2 mt-7 text-subhead font-bold uppercase tracking-wide text-text-2">
          Notifications
        </h2>
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex items-center gap-2.5 text-subhead font-medium text-text">
            <Bell size={18} className="text-text-3" /> Alert sound on new orders
          </span>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label="Alert sound" />
        </div>

        <h2 className="mb-2 mt-7 text-subhead font-bold uppercase tracking-wide text-text-2">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setThemePref(key)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] py-3 transition-colors',
                themePref === key ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
              )}
            >
              <Icon size={20} className={themePref === key ? 'text-primary' : 'text-text-3'} />
              <span
                className={cn(
                  'text-caption font-semibold',
                  themePref === key ? 'text-on-primary-soft' : 'text-text-2',
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <Button
          full
          variant="ghost"
          icon={<LogOut size={17} />}
          className="mt-8 !text-danger"
          onClick={() => setConfirmLogout(true)}
        >
          Log out
        </Button>
      </div>

      <BottomSheet open={confirmLogout} onOpenChange={setConfirmLogout} title="Log out?">
        <p className="text-subhead text-text-2">You'll need to sign in again with your phone number.</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            full
            size="lg"
            variant="danger"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Log out
          </Button>
          <Button full size="md" variant="ghost" onClick={() => setConfirmLogout(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
