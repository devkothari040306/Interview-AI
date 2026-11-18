# Production deployment

## Vercel setup

The root `vercel.json` deploys the Vite frontend and Express API as services in one Vercel project. The API function is capped at 60 seconds to fit Vercel Hobby limits; AI requests have shorter bounded timeouts and one retry.

Configure these values in the Vercel project's **Production** environment. Never commit them or paste them into chat:

- `MONGO_URI`: production MongoDB connection string for a least-privilege application user.
- `JWT_SECRET`: a randomly generated secret with at least 32 bytes.
- `GOOGLE_GENAI_API_KEY`: a current, active Google AI API key. Rotate any key that has been exposed.
- `CORS_ORIGINS`: optional comma-separated frontend origins when the Vercel-provided deployment origins are insufficient (for example, a custom domain).
- `COOKIE_SAME_SITE`: use `none` when the frontend and API are cross-site; production cookies are secure and HTTP-only.
- `COOKIE_DOMAIN`: optional; leave unset when using one Vercel domain.
- `TRUST_PROXY`: only override when the deployment's proxy topology requires it.
- `DNS_SERVERS`: optional; leave unset to use the platform's DNS configuration.

Do not use production database credentials or AI keys for Preview deployments. Add separate Preview values before enabling authenticated preview testing.

## Database and capacity

The API reuses its MongoDB connection within a warm function instance and limits each instance's connection pool. Vercel can run multiple instances concurrently; set MongoDB Atlas capacity and quotas accordingly. Authentication and AI request limits use a shared MongoDB collection, so counters remain consistent across instances. The AI provider's rate limits and the Vercel plan's function/concurrency limits still apply and cannot be bypassed by application code.

MongoDB creates indexes for per-user report listing and expiration of logged-out tokens. Ensure the production database user can create indexes, or create the indexes from the model schemas during deployment preparation.

## Validate and deploy

From the repository root:

```powershell
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
vercel build --prod
vercel deploy --prebuilt --prod
```

After deployment, verify `https://<production-domain>/api/health`, registration/login, report generation, and resume download. Keep production credentials in Vercel's encrypted environment variables.
