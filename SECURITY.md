# Security

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, report them privately via [GitHub's private vulnerability reporting](https://github.com/hugodelahousse/arkhana/security/advisories/new).

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You'll receive a response within 72 hours. Please allow reasonable time to address the issue before public disclosure.

## Production hardening checklist

Before deploying to production, verify the following:

### Environment

- [ ] `NODE_ENV=production`
- [ ] `BETTER_AUTH_URL` uses `https://` — never `http://` in production
- [ ] `BETTER_AUTH_SECRET` is a randomly generated string of at least 32 characters (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` uses a connection string with a non-default password
- [ ] Secrets are stored in environment variables or a secrets manager — not in code or version control

### Infrastructure

- [ ] TLS/HTTPS terminated at the load balancer or reverse proxy (Nginx, Caddy, etc.)
- [ ] Database not publicly accessible (firewall or private network)
- [ ] `POSTGRES_PASSWORD` changed from the default in `docker-compose.yml` (override via env)

### Headers

The app sets these headers on every response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

For additional hardening, consider adding via your reverse proxy:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS — only add after confirming HTTPS works)
- `Content-Security-Policy` — requires tuning for your deployment's asset origins

### Auth

- Auth endpoints are rate-limited to 10 requests per minute per IP (configured in `server/auth.ts`)
- Sessions expire after 30 days

## What data is public

- Public profiles at `/u/:username` expose a user's display name and card collection statistics
- Individual pulls at `/share/:pullId` expose the card drawn, rarity, and orientation
- No email addresses, passwords, or auth tokens are ever exposed publicly
