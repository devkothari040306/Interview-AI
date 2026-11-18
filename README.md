# Resume Builder / Interview AI

A web app for preparing for job interviews. Users can create an account, provide a resume or self-description and a job description, then generate and review an AI-assisted interview preparation report and tailored resume PDF.

## Production

- App: https://resume-builder-kappa-khaki.vercel.app
- API health: https://resume-builder-kappa-khaki.vercel.app/api/health

The frontend and Express API are deployed as Vercel services. The API uses MongoDB for user/report data and shared rate limits, and Google Gemini for AI-generated content. The API is designed to run across multiple serverless instances; configure database capacity and provider quotas for expected usage.

## Local development

Requirements: Node.js 24 and a reachable MongoDB instance.

1. Configure the backend:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

   Set `MONGO_URI`, `JWT_SECRET` (at least 32 bytes), and `GOOGLE_GENAI_API_KEY` in `backend\.env`. Keep real credentials out of Git.

2. Configure the frontend:

   ```powershell
   Copy-Item frontend\.env.example frontend\.env.local
   ```

   The example points `VITE_API_URL` to `http://localhost:3000`.

3. Install dependencies and run the backend and frontend in separate terminals:

   ```powershell
   npm --prefix backend ci
   npm --prefix backend run dev
   ```

   ```powershell
   npm --prefix frontend ci
   npm --prefix frontend run dev
   ```

## Validation

Run from the repository root:

```powershell
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Deployment

Configure production environment variables in Vercel; do not commit secrets. Use Vercel's remote build when deploying from Windows:

```powershell
vercel deploy --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for environment variables, database scaling, preview-environment guidance, and post-deployment checks.
