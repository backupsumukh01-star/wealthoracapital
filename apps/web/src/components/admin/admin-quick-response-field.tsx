'use client'

import { useId } from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'

export type QuickResponsePreset = { id: string; label: string; text: string }

type Props = {
  label?: string
  hint?: string
  value: string
  onChange: (next: string) => void
  presets: readonly QuickResponsePreset[]
  placeholder?: string
  className?: string
  rows?: number
  required?: boolean
}

/**
 * Preset → populates editable reason field. Final submitted text is always `value`
 * (admin may edit after selecting a preset). Preset never locks the field.
 */
export function AdminQuickResponseField({
  label = 'Reason / note',
  hint = 'Optional preset — edit freely before submit.',
  value,
  onChange,
  presets,
  placeholder,
  className,
  rows = 3,
  required,
}: Props) {
  const fieldId = useId()

  function applyPreset(presetId: string) {
    if (presetId === '__none') return
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    if (preset.id === 'other' || preset.text.trim() === '') {
      onChange(value)
      return
    }
    onChange(preset.text)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-preset`}>Quick response</Label>
        <Select onValueChange={applyPreset}>
          <SelectTrigger id={`${fieldId}-preset`} className="border-white/10 bg-white/[0.04]">
            <SelectValue placeholder="Select a preset (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select a preset…</SelectItem>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </Label>
        {hint ? <p className="text-caption text-fg-subtle">{hint}</p> : null}
        <Textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
    </div>
  )
}
