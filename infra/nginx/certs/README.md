# TLS certificates for self-hosted Nginx (docker-compose.production.yml)

Place Let's Encrypt (or equivalent) files here before starting Nginx:

- `fullchain.pem` — certificate + chain
- `privkey.pem` — private key

Quick bootstrap (local / staging only — replace with real certs for production):

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=localhost"
```

Render / managed PaaS: TLS is terminated at the platform edge; this directory is unused there.

Never commit real private keys.
