# Cashbook

A React + TypeScript + Vite app for tracking cash books and business transactions.

## Deploy to GitHub Pages

The app is configured for GitHub Pages deployment.

### Automatic deployment

1. Push your changes to the `master` branch.
2. GitHub Actions will build and publish the app to GitHub Pages.
3. Open the deployed site at:
   `https://<your-username>.github.io/Cashbook/`

### Manual deployment

Run:

```bash
npm run deploy
```

This builds the app and publishes the contents of the `dist` folder to the `gh-pages` branch.

## Environment variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co 
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The `.env` file is already excluded in `.gitignore`, so your credentials will not be committed.

For GitHub Pages deployment, add the same values to GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then push to `master` or trigger the workflow.

## Development

```bash
npm install
npm run dev
```
