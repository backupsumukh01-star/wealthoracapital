import { WithdrawWorkspace } from '@/components/dashboard/withdraw-workspace'
import { KycFinanceLock } from '@/components/dashboard/kyc-finance-lock'

export default function WithdrawPage() {
  return (
    <KycFinanceLock action="withdraw">
      <WithdrawWorkspace />
    </KycFinanceLock>
  )
}
