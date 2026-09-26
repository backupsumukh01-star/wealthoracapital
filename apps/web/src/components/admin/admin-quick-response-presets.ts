import type { QuickResponsePreset } from '@/components/admin/admin-quick-response-field'

/** Manual deposit review / ops notes — not used for auto-confirmed OxaPay. */
export const DEPOSIT_REVIEW_PRESETS: readonly QuickResponsePreset[] = [
  { id: 'verified', label: 'Payment verified', text: 'Payment verified.' },
  {
    id: 'manual-verified',
    label: 'Deposit manually verified',
    text: 'Deposit manually verified.',
  },
  { id: 'not-received', label: 'Deposit not received', text: 'Deposit not received.' },
  { id: 'proof-invalid', label: 'Payment proof invalid', text: 'Payment proof invalid.' },
  {
    id: 'incorrect-details',
    label: 'Incorrect payment details',
    text: 'Incorrect payment details.',
  },
  { id: 'duplicate', label: 'Duplicate payment', text: 'Duplicate payment.' },
  { id: 'other', label: 'Other', text: '' },
] as const

export const WITHDRAWAL_APPROVE_PRESETS: readonly QuickResponsePreset[] = [
  {
    id: 'approved-processed',
    label: 'Approved and processed',
    text: 'Withdrawal approved and processed.',
  },
  {
    id: 'request-approved',
    label: 'Request approved',
    text: 'Withdrawal request approved.',
  },
  {
    id: 'payout-ok',
    label: 'Payout processed successfully',
    text: 'Payout processed successfully.',
  },
  { id: 'other', label: 'Other', text: '' },
] as const

export const WITHDRAWAL_REJECT_PRESETS: readonly QuickResponsePreset[] = [
  {
    id: 'incorrect-payout',
    label: 'Incorrect payout details',
    text: 'Incorrect payout details.',
  },
  {
    id: 'verification',
    label: 'Additional verification required',
    text: 'Additional verification required.',
  },
  {
    id: 'could-not-process',
    label: 'Could not be processed',
    text: 'Withdrawal could not be processed.',
  },
  { id: 'other', label: 'Other', text: '' },
] as const

export const WITHDRAWAL_NEED_INFO_PRESETS: readonly QuickResponsePreset[] = [
  {
    id: 'more-info',
    label: 'Provide additional information',
    text: 'Please provide additional information.',
  },
  {
    id: 'verify-payout',
    label: 'Verify payout details',
    text: 'Please verify your payout details.',
  },
  {
    id: 'additional-verification',
    label: 'Additional verification required',
    text: 'Additional verification is required.',
  },
  { id: 'other', label: 'Other', text: '' },
] as const

export const KYC_REJECT_PRESETS: readonly QuickResponsePreset[] = [
  {
    id: 'unclear',
    label: 'ID document unclear',
    text: 'ID document is unclear.',
  },
  {
    id: 'expired',
    label: 'ID document expired',
    text: 'ID document has expired.',
  },
  {
    id: 'mismatch',
    label: 'Information mismatch',
    text: 'Information does not match the account.',
  },
  {
    id: 'selfie',
    label: 'Selfie verification failed',
    text: 'Selfie verification could not be completed.',
  },
  {
    id: 'missing',
    label: 'Required document missing',
    text: 'Required document is missing.',
  },
  {
    id: 'unverified',
    label: 'Document could not be verified',
    text: 'Submitted document could not be verified.',
  },
  { id: 'other', label: 'Other', text: '' },
] as const

export const KYC_NEED_INFO_PRESETS: readonly QuickResponsePreset[] = [
  {
    id: 'clearer',
    label: 'Upload a clearer document',
    text: 'Please upload a clearer document.',
  },
  {
    id: 'missing-doc',
    label: 'Upload the missing document',
    text: 'Please upload the missing document.',
  },
  {
    id: 'new-selfie',
    label: 'Provide a new selfie',
    text: 'Please provide a new selfie.',
  },
  {
    id: 'correct-info',
    label: 'Correct submitted information',
    text: 'Please correct the submitted information.',
  },
  {
    id: 'additional',
    label: 'Additional verification required',
    text: 'Additional verification is required.',
  },
  { id: 'other', label: 'Other', text: '' },
] as const
