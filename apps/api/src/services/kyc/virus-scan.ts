export type VirusScanResult = {
  status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'SKIPPED'
  engine: string
  scannedAt: string
}

/**
 * Virus scan interface — prepared for ClamAV / cloud scanner integration.
 * Phase 3 marks uploads as SKIPPED/CLEAN without blocking the flow.
 */
export interface VirusScanner {
  scan(buffer: Buffer, filename: string): Promise<VirusScanResult>
}

export class NoopVirusScanner implements VirusScanner {
  async scan(_buffer: Buffer, _filename: string): Promise<VirusScanResult> {
    return {
      status: 'SKIPPED',
      engine: 'noop',
      scannedAt: new Date().toISOString(),
    }
  }
}

export const virusScanner: VirusScanner = new NoopVirusScanner()
