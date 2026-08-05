# Production Monitoring

**Endpoint:** `GET /api/v1/admin/health` (requires `dashboard.view`)  
**UI:** Admin → System Health (`/admin/system-health`)  
**Auto-refresh:** 30s

## Widgets (real probes / DB aggregates)

| Widget | Source |
|--------|--------|
| API status | Process uptime + DB readiness |
| Database | `SELECT 1` latency |
| Redis | `PING` (or `disabled` if no `REDIS_URL`) |
| Queue | BullMQ job counts per group, or in-memory failed counter |
| Storage | Local `UPLOAD_ROOT` access or S3 `HeadBucket` |
| Email Queue | `email_outbox` QUEUED / SENDING / FAILED / SENT today |
| Failed Jobs | BullMQ `failed` sum (or memory driver counter) |
| CPU | `os.loadavg()` + cores |
| Memory | `process.memoryUsage()` + system free/total |
| Visitors | Distinct `activity_logs.userId` (24h / today UTC) |
| Active Users | Non-revoked, non-expired sessions |
| Deposits Today | Count + sum amount (UTC day) |
| Withdrawals Today | Count + sum amount (UTC day) |
| KYC Pending | Submissions in PENDING / SUBMITTED / UNDER_REVIEW / NEED_MORE_INFO |
| Failed Payments | Deposits + withdrawals `REJECTED` today |
| System Logs | In-process ring buffer |
| Audit Logs | Latest `audit_logs` rows |
| Error Logs | Buffered 5xx / job failures |

Prometheus scrapes remain at `GET /api/metrics` when `METRICS_ENABLED=true`.
