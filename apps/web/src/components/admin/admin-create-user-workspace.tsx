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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adminQueryKeys } from '@/features/admin/hooks'
import { ApiError } from '@/lib/api-client'
import { adminService } from '@/services/admin.service'
import { useQueryClient } from '@tanstack/react-query'

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
]

export function AdminCreateUserWorkspace() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('IN')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error('First name, last name, email, and password are required.')
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
        country,
      })
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      toast.success('Investor created', {
        description: 'They can sign in on the existing login page.',
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
              hint="Same rules as registration: 10+ characters, upper, lower, number, and a special character."
            >
              <PasswordField
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <FormField label="Country">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <Button type="submit" size="sm" loading={saving} loadingText="Creating user">
              Create user
            </Button>
          </div>
        </AdminPanel>
      </form>
    </div>
  )
}
