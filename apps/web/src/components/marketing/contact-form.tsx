'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { SITE } from '@/lib/constants'

const CATEGORIES = [
  { value: 'account', label: 'Account' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
] as const

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  category: z.string().min(1, 'Select a category.'),
  message: z.string().trim().min(12, 'Please include a short message (12+ characters).'),
  /** Honeypot — bots fill this; humans leave it empty. */
  company: z.string().optional(),
})

type ContactInput = z.infer<typeof contactSchema>

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

/**
 * Honest contact flow — opens the user's mail client to SITE.supportEmail.
 * No fake “message received” without a backend inbox.
 */
export function ContactForm() {
  const [openedMail, setOpenedMail] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', category: '', message: '', company: '' },
  })

  async function onSubmit(values: ContactInput) {
    if (values.company) return
    const subject = encodeURIComponent(`[${categoryLabel(values.category)}] ${values.name}`)
    const body = encodeURIComponent(
      `Name: ${values.name}\nReply-to: ${values.email}\nCategory: ${categoryLabel(values.category)}\n\n${values.message}`,
    )
    window.location.href = `mailto:${SITE.supportEmail}?subject=${subject}&body=${body}`
    setOpenedMail(true)
  }

  if (openedMail) {
    return (
      <div
        className="flex min-h-[22rem] flex-col items-center justify-center px-2 py-8 text-center sm:min-h-[24rem]"
        role="status"
      >
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-accent-500/15 text-accent-200">
          <Mail className="size-7" aria-hidden />
        </span>
        <h2 className="text-heading-md text-fg">Continue in your email app</h2>
        <p className="mt-2 max-w-sm text-body-sm text-fg-muted">
          We opened a draft to{' '}
          <a
            href={`mailto:${SITE.supportEmail}`}
            className="break-all text-accent-300 underline-offset-4 hover:underline"
          >
            {SITE.supportEmail}
          </a>
          . If nothing appeared, copy that address and send your message manually.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-6"
          onClick={() => setOpenedMail(false)}
        >
          Edit message
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h2 className="text-heading-sm text-fg">Send a message</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          Submitting opens your email app with a draft to{' '}
          <a
            href={`mailto:${SITE.supportEmail}`}
            className="break-all text-accent-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base rounded-sm"
          >
            {SITE.supportEmail}
          </a>
          . Nothing is stored on this page until you hit send in your mail client.
        </p>
      </div>

      {errors.root ? (
        <Alert tone="danger" title="Could not open your email app">
          {errors.root.message}
        </Alert>
      ) : null}

      {/* Honeypot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" tabIndex={-1} autoComplete="off" {...register('company')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Name" required error={errors.name?.message}>
          <Input autoComplete="name" placeholder="Your name" {...register('name')} />
        </FormField>
        <FormField label="Email" required error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </FormField>
      </div>

      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <FormField label="Category" required error={errors.category?.message}>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
            </FormField>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <FormField
        label="Message"
        required
        error={errors.message?.message}
        hint="Include your account email if it differs from the address above."
      >
        <Textarea
          rows={5}
          placeholder="How can we help?"
          className="min-h-[8.5rem] resize-y"
          {...register('message')}
        />
      </FormField>

      <Button
        type="submit"
        size="lg"
        fullWidth
        className="sm:w-auto sm:min-w-[11rem]"
        loading={isSubmitting}
        loadingText="Opening…"
      >
        Open email draft
      </Button>
    </form>
  )
}
