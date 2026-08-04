import { Separator } from '@/components/ui/separator'

export function AuthDivider({ label = 'OR' }: { label?: string }) {
  return (
    <div className="relative py-1">
      <Separator />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-raised px-3 text-caption text-fg-subtle">
        {label}
      </span>
    </div>
  )
}
