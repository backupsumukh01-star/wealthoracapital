import type { Metadata } from 'next'

import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Register', robots: { index: false } }

export default function RegisterPage() {
  return <RegisterForm />
}
