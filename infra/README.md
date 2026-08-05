# Infrastructure stubs

| Path | Purpose |
|------|---------|
| `nginx/` | Optional self-host reverse proxy (not used on Render) |
| `pm2/` | Deprecated — do not use; Render manages process lifecycle |
| `systemd/` | Optional Linux unit stubs (not used on Render) |
| `monitoring/` | Optional Prometheus scrape config |

For production on Render, see [`../DEPLOYMENT.md`](../DEPLOYMENT.md) and [`../render.yaml`](../render.yaml).
