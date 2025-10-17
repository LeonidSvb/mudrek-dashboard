# Frontend (React/Next.js) Coding Rules

**This file is loaded automatically when working in `frontend/` directory.**
**For code examples, see: `docs/frontend-patterns.md`**

---

## TypeScript Standards

### Core Principles
- TypeScript for ALL frontend code
- **Prefer `interface` over `type`** for object shapes
- Avoid enums; use const objects or literal types
- Always define proper types for props and state

### Type Safety
- Type hints for all function signatures
- No `any` types (use `unknown` if truly needed)
- Proper return types for functions
- Discriminated unions for complex types

**Rules:**
- Objects → `interface UserProps { ... }`
- Unions → `type Status = 'active' | 'inactive'`
- Enums → Use `const STATUSES = { ACTIVE: 'active' } as const`
- Unknown data → `unknown`, not `any`

---

## Next.js App Router

### React Server Components (RSC)
- **Minimize `'use client'`** - use Server Components by default
- `'use client'` only for Web API access in small components (useState, useEffect, browser APIs)
- Avoid `'use client'` for data fetching or state management
- Wrap client components in Suspense with fallback

### File Structure
- Place Server Components in `app/` directory
- Client Components in `components/` with `'use client'`
- Shared utilities in `lib/`
- Types in `types/` or colocated with components

```
frontend/
├── app/
│   ├── page.tsx              # Server Component
│   ├── dashboard/page.tsx    # Server Component
│   └── api/metrics/route.ts  # API Route
├── components/
│   ├── MetricCard.tsx        # Client Component
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── types/
    └── metrics.ts
```

---

## UI and Styling

### Tailwind CSS
- Tailwind for ALL styles; avoid CSS files
- Desktop-first approach (NOT mobile-first for this project)
- `cn()` utility from `lib/utils.ts` for conditional classes

### shadcn/ui Components
- Use shadcn/ui + Radix UI for all UI components
- Follow shadcn/ui conventions
- Customize components in `components/ui/`
- Never modify node_modules

**Installation:**
```bash
npx shadcn@latest add button card dialog select
```

---

## Data Fetching

### Server-Side (Recommended)
- Server Components for data fetching
- Proper error handling and loading states
- React Suspense for async components
- Use `cache: 'no-store'` for always fresh data

### Client-Side (When Needed)
- Use SWR or TanStack Query
- Proper caching strategies
- Handle loading and error states

**When to use client-side:**
- Real-time data updates
- User interactions requiring immediate feedback
- WebSocket connections

---

## Supabase Integration (Next.js)

### Critical Rules
- Use `@supabase/ssr` (**NOT** `@supabase/supabase-js`)
- Use ONLY `getAll()` and `setAll()` methods
- **NEVER** use deprecated `get()`, `set()`, `remove()` methods

### Browser Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );
}
```

### Environment Variables
```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Server-only (no NEXT_PUBLIC prefix)
HUBSPOT_API_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
```

---

## Performance Optimization

### Images
- Use Next.js Image component
- WebP format, specify width/height
- Lazy loading for images
- `priority` for above-the-fold images

### Code Splitting
- Dynamic imports for heavy components
- Lazy loading for non-critical components
- `ssr: false` for client-only components

---

## State Management

### Local State
- `useState` for truly local UI state only
- Avoid `useEffect` when possible
- Use Server Components for data fetching

### URL State
- `nuqs` for URL search parameter state
- Share state across components via URL
- Great for filters, pagination, date ranges

### Global State (if needed)
- Zustand for complex global state
- Keep state minimal
- Prefer Server Components for data

---

## Component Patterns

### Component Structure Order
1. Types/Interfaces first
2. Main Component
3. Helper functions at the end

### Naming Conventions
- Components: PascalCase (`MetricCard.tsx`)
- Directories: kebab-case (`metric-cards/`)
- Variables: camelCase (`isLoading`, `hasError`)
- Constants: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRIES`)
- Props interfaces: ComponentNameProps (`MetricCardProps`)

---

## API Routes (Backend Integration)

### Pattern for HubSpot Proxy
- Create API routes in `app/api/`
- Handle authentication server-side
- Never expose API keys to client
- Proper error handling and status codes

**Key rules:**
- Environment variables without `NEXT_PUBLIC` are server-only
- Return proper HTTP status codes
- Use `NextRequest` and `NextResponse` types
- Handle errors gracefully

---

## Prisma ORM Integration

### Overview
- Package: `@prisma/client` + `prisma` CLI
- Purpose: Type-safe database queries with autocomplete
- Works with: PostgreSQL (Supabase)
- Cost: FREE, open-source

### Setup
```bash
# Pull schema from Supabase (when DB changes)
cd frontend && npx prisma db pull

# Generate TypeScript types
npx prisma generate
```

### When to Use Prisma vs Supabase
- ✅ **Prisma:** NEW metrics API, complex queries, need type safety & autocomplete
- ✅ **Supabase:** Auth, RLS, existing sync code
- ✅ **Hybrid approach:** Use both together

---

## Key Conventions

### Do's ✅
- Use Server Components by default
- Fetch data on server when possible
- Use TypeScript interfaces for all props
- Follow shadcn/ui patterns
- Keep components under 200 lines
- Use `cn()` for conditional classes
- Proper error boundaries

### Don'ts ❌
- Don't use `'use client'` unnecessarily
- Don't fetch data in useEffect (use Server Components)
- Don't use `any` type
- Don't use enums (use const objects)
- Don't modify shadcn/ui components in node_modules
- Don't expose API keys to client
- Don't use deprecated Supabase methods (`get`, `set`, `remove`)
