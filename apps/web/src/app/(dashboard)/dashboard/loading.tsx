import { LoadingScreen } from '@/components/auth/loading-screen'

/**
 * Mirrors quiet branded loading — Growzy mark while the dashboard route resolves.
 */
export default function DashboardLoading() {
  return <LoadingScreen label="Preparing your wealth desk…" className="min-h-[60vh]" />
}
