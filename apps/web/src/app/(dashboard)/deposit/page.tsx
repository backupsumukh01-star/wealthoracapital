import { DepositWorkspace } from '@/components/dashboard/deposit-workspace'
import { KycFinanceLock } from '@/components/dashboard/kyc-finance-lock'

export default function DepositPage() {
  return (
    <KycFinanceLock action="deposit">
      <DepositWorkspace />
    </KycFinanceLock>
  )
}
