'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** What failed, in the user's terms — "the equity chart", not "EquityChart". */
  label?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * A section-level boundary, for the places where one widget failing should not take the page
 * with it.
 *
 * On a financial dashboard this matters: if the chart throws, the balance beside it is still
 * correct and still worth showing. Next's route-level `error.tsx` is the coarser net above this.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Section failed to render', error, info)
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <Alert
        tone="danger"
        title={`We could not display ${this.props.label ?? 'this section'}`}
        action={
          <Button size="sm" variant="secondary" onClick={() => this.setState({ hasError: false })}>
            <RotateCcw aria-hidden />
            Retry
          </Button>
        }
      >
        The rest of this page is unaffected, and nothing about your balance has changed.
      </Alert>
    )
  }
}
