import { useState } from 'react'
import { Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useMe, useUpdateMe } from '@/api/hooks/useUser'
import { useThemeStore, type ThemePref } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { UserProfile } from '@/types/api'

const THEMES: { key: ThemePref; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const { data, isLoading } = useMe()

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-title-lg font-bold text-text">Settings</h1>
        <p className="text-subhead text-text-2">Your profile and appearance</p>
      </div>
      {isLoading || !data ? (
        <div className="grid place-items-center py-16 text-text-3">
          <Spinner size={28} />
        </div>
      ) : (
        <ProfileForm key={data.id} profile={data} />
      )}
      <AppearanceCard />
      <LogoutCard />
    </div>
  )
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const update = useUpdateMe()
  const [name, setName] = useState(profile.name ?? '')
  const [email, setEmail] = useState(profile.email ?? '')

  const dirty = name !== (profile.name ?? '') || email !== (profile.email ?? '')

  async function save() {
    try {
      await update.mutateAsync({ name: name || undefined, email: email || undefined })
      toast.success('Profile updated')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-title font-semibold text-text">Profile</h2>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <Field label="Phone" value={formatPhone(profile.phone)} disabled />
        <div className="flex justify-end">
          <Button loading={update.isPending} disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

function AppearanceCard() {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-title font-semibold text-text">Appearance</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const Icon = t.icon
          const active = pref === t.key
          return (
            <button
              key={t.key}
              onClick={() => setPref(t.key)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-[1.5px] p-4 transition-colors',
                active
                  ? 'border-primary bg-primary-soft text-on-primary-soft'
                  : 'border-border text-text-2 hover:bg-surface-2',
              )}
            >
              <Icon size={22} />
              <span className="text-subhead font-medium">{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LogoutCard() {
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title font-semibold text-text">Sign out</h2>
          <p className="text-subhead text-text-2">End your admin session on this device.</p>
        </div>
        <Button variant="danger" icon={<LogOut size={16} />} onClick={() => setOpen(true)}>
          Logout
        </Button>
      </div>
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title="Sign out"
        danger
        confirmLabel="Sign out"
        message="Are you sure you want to sign out?"
        onConfirm={() => logout()}
      />
    </div>
  )
}
