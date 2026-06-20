import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMe, useUpdateMe } from '@/api/hooks/useUser'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { formatPhone } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'

export function EditProfilePage() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const updateMe = useUpdateMe()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (me) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(me.name ?? '')
      setEmail(me.email ?? '')
    }
  }, [me])

  async function save() {
    try {
      await updateMe.mutateAsync({ name: name.trim() || undefined, email: email.trim() || undefined })
      toast.success('Profile updated')
      navigate(-1)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-3">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg font-bold text-text">Edit profile</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <Field label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <label className="mb-2 block text-subhead font-medium text-text-2">Phone number</label>
          <div className="flex min-h-12.5 items-center rounded-md border-[1.5px] border-border bg-surface-2 px-3.5 text-body text-text-3 mono-num">
            {me?.phone ? formatPhone(me.phone) : ''}
          </div>
        </div>
      </div>

      <Button full size="lg" loading={updateMe.isPending} onClick={save}>
        Save changes
      </Button>
    </div>
  )
}
