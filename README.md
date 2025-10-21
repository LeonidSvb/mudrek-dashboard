This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## HubSpot Sync

### Automatic Incremental Sync

Incremental sync runs automatically **every hour** via GitHub Actions (`.github/workflows/incremental-sync.yml`).

- Fetches only new/modified records since last sync
- Duration: ~10-20 seconds
- Handles rate limits with retry logic
- Works perfectly on Vercel serverless

### Manual Full Sync

Full sync fetches ALL data from HubSpot (30,000+ contacts, deals, calls).

**Important**: Full sync takes ~10 minutes and **CANNOT run on Vercel** due to serverless timeout limits (10 seconds on Hobby, 60 seconds on Pro).

**When to use**:
- Initial data load
- Data recovery after issues
- Major schema changes

**How to run locally**:

```bash
# Start dev server
npm run dev

# In another terminal, trigger full sync
curl -X POST "http://localhost:3000/api/sync?mode=full"
```

**Note**: Incremental sync captures all changes hourly, so full sync is rarely needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
