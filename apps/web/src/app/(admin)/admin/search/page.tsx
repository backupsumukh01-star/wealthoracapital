import { AdminGlobalSearchWorkspace } from '@/components/admin/admin-global-search-workspace'

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  return <AdminGlobalSearchWorkspace initialQuery={params.q ?? ''} />
}
