import { LoadingScreen } from '@/components/auth/loading-screen'

/** Quiet route fallback with Growzy mark. */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-base">
      <LoadingScreen label="Loading Growzy…" />
    </div>
  )
}
