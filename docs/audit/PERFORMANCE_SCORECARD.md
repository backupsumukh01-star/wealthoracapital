# PERFORMANCE SCORECARD — Growzy

**Date:** 2026-08-05  
**Overall performance score: 7.0 / 10**

## API

| Metric | Assessment | Score |
|--------|------------|------:|
| Hot-path design | Prisma + indexed lookups; wallet row locks | 8 |
| N+1 risk | Snapshot-all + distribution notify loops | 5 |
| Caching | Redis/memory + namespaced helpers | 7 |
| Payload size | Generally envelope JSON; OpenAPI large | 7 |
| Rate limits | Nginx + express-rate-limit | 7 |

## Workers / queues

| Metric | Assessment | Score |
|--------|------------|------:|
| Queue split by domain | Per-group BullMQ queues | 8 |
| Concurrency control | `WORKER_CONCURRENCY` wired | 7 |
| Throughput headroom | ~19 parallel jobs single worker process (est.) | 6 |
| Failure modes | In-process fallback can hide Redis outages | 5 |

## Frontend

| Metric | Assessment | Score |
|--------|------------|------:|
| Next standalone output | Enabled | 8 |
| Package import optimization | lucide/recharts/framer | 8 |
| Images | AVIF/WebP formats | 7 |
| Bundle discipline | Feature folders; monitor admin charts weight | 7 |

## Database

| Metric | Assessment | Score |
|--------|------------|------:|
| Indexes on finance/KYC/CMS | Strong | 8 |
| Connection pooling | Default Prisma; no PgBouncer | 5 |
| Heavy jobs | Daily snapshot loops — watch under load | 6 |

## Capacity (estimate)

| | |
|--|--|
| Concurrent users | 150–400 |
| Sustained RPS | 50–150 |
| p95 target (suggested) | < 300 ms read, < 800 ms money POST |

## Top performance actions

1. Batch portfolio snapshots / avoid per-user chatty queries  
2. Add PgBouncer before scaling API replicas  
3. Remove in-process job fallback in production  
4. Cache leaderboard/performance endpoints via Redis namespaces  
5. Run k6 scripts from QA phase against staging with Redis on  
