'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { PasswordField } from '@/components/auth/password-field'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { adminQueryKeys } from '@/features/admin/hooks'
import { ApiError } from '@/lib/api-client'
import { adminService } from '@/services/admin.service'
import { useQueryClient } from '@tanstack/react-query'

export function AdminCreateUserWorkspace() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [accountOpened, setAccountOpened] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error('First name, last name, email, and password are required.')
      return
    }

    const countryCode = country.trim().toUpperCase()
    if (countryCode && countryCode.length !== 2) {
      toast.error('Country must be a 2-letter ISO code, for example IN.')
      return
    }

    setSaving(true)
    try {
      const user = await adminService.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(countryCode ? { country: countryCode } : {}),
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
        ...(accountOpened ? { accountOpened } : {}),
      })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      toast.success('Investor created', {
        description: 'KYC is skipped. They can sign in on the existing login page.',
      })
      router.push(ROUTES.admin.user(user.id))
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not create user',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Create user"
        description="Creates a normal investor in the existing account system. They sign in on the existing login page."
        eyebrow={
          <Link href={ROUTES.admin.users} className="hover:text-fg">
            ← Users
          </Link>
        }
      />

      <form onSubmit={(e) => void handleCreate(e)}>
        <AdminPanel glow>
          <AdminPanelHeader title="Account" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="First name" required>
              <Input
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>
            <FormField label="Last name" required>
              <Input
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField
              label="Password"
              required
              hint="Same rules as registration: 8+ characters, upper, lower, number, and a special character."
            >
              <PasswordField
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Phone" hint="Optional">
              <Input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <FormField label="Country" hint="Optional ISO code, for example IN">
              <Input
                autoComplete="country"
                maxLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </FormField>
            <FormField label="Referral code" hint="Optional existing member code">
              <Input
                autoComplete="off"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </FormField>
            <FormField
              label="Account opened"
              hint="Optional. The existing referral page uses this as the join date."
            >
              <Input
                type="datetime-local"
                value={accountOpened}
                onChange={(e) => setAccountOpened(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <Button type="submit" size="sm" loading={saving} loadingText="Creating user">
              Create user
            </Button>
          </div>
        </AdminPanel>
      </form>
    </div>
  )
}
