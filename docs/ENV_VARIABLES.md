# Environment Variables — Growzy API

Copy `apps/api/.env.example` → `apps/api/.env`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `PORT` | No | `4000` | HTTP port |
| `APP_NAME` | No | `Growzy` | Brand used in emails |
| `APP_URL` | No | `http://localhost:3000` | Frontend origin (email links) |
| `API_URL` | No | `http://localhost:4000` | Public API origin |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | ≥ 32 chars |
| `JWT_REFRESH_SECRET` | **Yes** | — | ≥ 32 chars, distinct |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access JWT lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh cookie lifetime |
| `JWT_ISSUER` | No | `meridian-fx` | JWT `iss` |
| `JWT_AUDIENCE` | No | `meridian-fx-web` | JWT `aud` |
| `COOKIE_DOMAIN` | No | empty | Shared cookie domain |
| `COOKIE_SECURE` | No | `false` | Force `Secure` cookies |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allow-list |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt cost factor |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Global/auth window |
| `RATE_LIMIT_MAX` | No | `100` | Global max requests / window |
| `AUTH_RATE_LIMIT_MAX` | No | `20` | Auth routes max / window |
| `EMAIL_TRANSPORT` | No | `console` | `console` \| `smtp` |
| `SMTP_HOST` | No | `localhost` | SMTP host (architecture only) |
| `SMTP_PORT` | No | `1025` | SMTP port |
| `SMTP_USER` | No | empty | SMTP username |
| `SMTP_PASS` | No | empty | SMTP password |
| `SMTP_FROM_NAME` | No | `Growzy` | From display name |
| `SMTP_FROM_ADDRESS` | No | `noreply@localhost` | From address |
| `LOG_LEVEL` | No | `info` | Pino level |

Production rejects placeholder JWT secrets containing `change-me`.
