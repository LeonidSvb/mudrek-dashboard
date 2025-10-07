 Claude Coding Guidelines

# Core Principles

## Simplicity First
- Always prefer simple solutions over complex ones
- Avoid over-engineering or premature optimization
- Choose straightforward implementations that are easy to understand and maintain

## DRY (Don't Repeat Yourself)
- Avoid duplication of code whenever possible
- Before writing new functionality, check for similar existing code in the codebase
- Refactor common patterns into reusable utilities or components
- Share logic across components rather than duplicating it

## Environment Awareness
- Write code that works consistently across different environments: dev, test, and prod
- Use environment variables for configuration differences
- Avoid hardcoding values that might differ between environments
- Test code behavior in all target environments

## Focused Changes
- Only make changes that are requested or directly related to the task at hand
- Be confident that changes are well understood and necessary
- Avoid scope creep or tangential improvements unless explicitly requested

## Conservative Technology Choices
- When fixing issues or bugs, exhaust all options within the existing implementation first
- Avoid introducing new patterns or technologies without strong justification
- If new patterns are introduced, ensure old implementations are properly removed to prevent duplicate logic
- Maintain consistency with existing codebase patterns

# Code Organization

## Clean Codebase
- Keep the codebase very clean and organized
- Follow existing file structure and naming conventions
- Group related functionality together
- Remove unused code and imports

## File Management & One-time Scripts

### Production Code Structure
```
project/
├── src/              # Production source code
├── migrations/       # Database migrations (keep all)
├── scripts/
│   ├── discovery/    # One-time discovery scripts (archived)
│   └── utils/        # Reusable utility scripts
├── tests/            # Test files
└── check-*.js        # Only if reusable utilities
```

### One-time Scripts Policy
**Discovery/testing scripts должны быть перемещены после использования:**

**ARCHIVE (не DELETE):**
- Discovery scripts (check-*, verify-*, test-*)
- Migration helpers (run-migration-*.js, execute-migration.js)
- Data analysis scripts
→ Переместить в `scripts/discovery/` с README

**KEEP in root:**
- Reusable utilities (e.g., `check-sync-status.js`)
- Scripts используемые в CI/CD
- Скрипты упомянутые в документации

**DELETE:**
- Temporary debugging files
- Scripts с hardcoded credentials
- Duplicate functionality

### When Creating Scripts
1. Задай вопрос: "Будет ли этот скрипт использоваться более 1 раза?"
2. Если НЕТ → создай в `scripts/discovery/` сразу
3. Если ДА → создай в корне или `scripts/utils/`
4. После использования discovery scripts → переместить с git mv

### Example Workflow
```bash
# During discovery
node scripts/discovery/check-data.js

# After session - cleanup
git mv check-*.js scripts/discovery/
git commit -m "chore: Archive discovery scripts"
```

## File Size Limits
- Keep files under 200-300 lines of code
- Refactor larger files by splitting them into smaller, focused modules
- Break down complex components into smaller, composable pieces

## Naming Conventions
- Use descriptive, self-documenting names for variables, functions, and files
- Follow language/framework conventions (camelCase for JS, PascalCase for components, etc.)
- Avoid abbreviations unless they're industry standard
- Use consistent naming patterns across the project

# Data and Testing

## No Fake Data in Production
- Mocking data is only acceptable for tests
- Never add stubbing or fake data patterns that affect dev or prod environments
- Use real data sources and proper error handling for development and production

## Environment Files
- Never overwrite `.env` files without explicit permission and confirmation
- Always ask before modifying environment configuration
- Back up existing environment files when changes are necessary

# Git and Version Control

## Commit Standards
- Write clear, descriptive commit messages: "fix user login bug", not "fix"
- Make atomic commits - one commit = one feature/fix
- Review changes before committing via git diff
- Never commit secrets, .env files, or temporary files

## Branch Management
- Use descriptive branch names: feature/add-auth, fix/login-crash
- One branch = one task, don't mix different features
- Delete merged branches to keep repository clean
- For solo projects can work in main, but make frequent commits

# Code Quality

## Error Handling
- Always wrap API calls in try-catch blocks
- Write meaningful error messages: "Failed to save user data", not "Error 500"
- Don't swallow errors - log them or show to user
- Fail fast and clearly - don't let app hang in unknown state

## Performance Considerations
- Optimize for readability first, performance second
- Don't add libraries without necessity - each one adds weight
- Profile before optimizing, don't guess at bottlenecks
- For small projects: readability > performance

# Batch Processing Optimization

Where possible, make massive batches first. See what needs to be changed, then change everything massively to make it as fast as possible.

- Plan changes in advance - what needs to be changed across all files
- Make massive changes in one batch, not file by file
- Use find/replace, regex for mass edits
- Commit batches of changes, not each file separately

# Project-Specific Guidelines

## JavaScript/Node.js Best Practices

### Code Style
- Use ES6+ features (const/let, arrow functions, destructuring, template literals)
- Prefer `const` over `let`, never use `var`
- Use async/await instead of callbacks or raw Promises
- Descriptive variable names with auxiliary verbs: `isLoading`, `hasError`, `shouldRetry`

### Function Structure
- Use `function` keyword for top-level functions
- Arrow functions for callbacks and inline functions
- One export per file for main functionality
- Place helper functions at the end of file

```javascript
// ✅ Good
async function getAllContacts(limit = 100) {
  const contacts = await fetchContacts(limit);
  return processContacts(contacts);
}

// Helper at the end
function processContacts(contacts) {
  return contacts.map(formatContact);
}
```

### Error Handling Patterns
- Always use try-catch for async operations
- Provide meaningful error messages with context
- Log errors with enough detail for debugging
- Never swallow errors silently
- Use early returns for error conditions

```javascript
// ✅ Good - with context
try {
  const data = await hubspotApi.getContacts();
  console.log(`✓ Fetched ${data.length} contacts`);
  return data;
} catch (error) {
  console.error('✗ Failed to fetch HubSpot contacts:', error.message);
  throw new Error(`HubSpot sync failed: ${error.message}`);
}

// ❌ Bad - no context
try {
  const data = await api.get();
  return data;
} catch (e) {
  console.log(e);
}
```

### JSDoc for Type Safety (without TypeScript)
- Add JSDoc comments for function parameters and returns
- Document complex objects and data structures
- Helps IDEs provide better autocomplete

```javascript
/**
 * Получить все контакты из HubSpot
 * @param {number} limit - Максимум контактов за запрос
 * @param {string[]} properties - Массив свойств для получения
 * @returns {Promise<Object[]>} Массив объектов контактов
 * @throws {Error} Если API запрос провалился
 */
async function getAllContacts(limit = 100, properties = []) {
  // implementation
}
```

## API Integration Patterns

### HubSpot API
- Store API keys in `.env` file (never hardcode)
- Implement proper pagination for large datasets
- Use batch operations when possible (max 100 items per batch)
- Handle rate limiting with retry logic
- Log progress for long-running operations

```javascript
// ✅ Good - pagination handled
async function getAllContacts(limit = 100) {
  let allContacts = [];
  let after = null;
  let hasMore = true;

  while (hasMore) {
    let endpoint = `/crm/v3/objects/contacts?limit=${limit}`;
    if (after) endpoint += `&after=${after}`;

    const response = await makeRequest(endpoint);
    allContacts = allContacts.concat(response.results);

    if (response.paging?.next) {
      after = response.paging.next.after;
      console.log(`→ Fetched ${allContacts.length} contacts, continuing...`);
    } else {
      hasMore = false;
    }
  }

  return allContacts;
}
```

### Batch Processing
- Process large datasets in batches
- Use reasonable batch sizes (100-500 items)
- Log progress for visibility
- Handle partial failures gracefully

```javascript
// ✅ Good - batch with progress
const BATCH_SIZE = 500;
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);

  try {
    await processBatch(batch);
    console.log(`✓ Processed ${i + batch.length}/${records.length}`);
  } catch (error) {
    console.error(`✗ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
    // Continue or throw based on requirements
  }
}
```

## Supabase Integration (Node.js)

### Client Initialization
- Use `@supabase/supabase-js` package (NOT `@supabase/ssr`)
- Initialize client once at app startup, reuse everywhere
- Use `SUPABASE_SERVICE_ROLE_KEY` for backend operations (has admin privileges)
- Never expose service role key to frontend

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
```

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...              # For client-side (if needed)
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # For server-side admin operations
```

### Database Operations
- Always check for `error` in response
- Provide context in error messages
- Use meaningful log messages
- Handle edge cases (null, undefined, empty arrays)

```javascript
// ✅ Good - proper error handling
const { data, error } = await supabase
  .from('hubspot_contacts')
  .insert(contacts);

if (error) {
  console.error('✗ Failed to insert contacts:', error.message);
  throw new Error(`Supabase insert failed: ${error.message}`);
}

console.log(`✓ Inserted ${data.length} contacts`);
return data;

// ❌ Bad - no error handling
const { data } = await supabase.from('contacts').insert(contacts);
return data;
```

### Batch Operations
- Use batch inserts for multiple records
- Recommended batch size: 500 records (max 1000)
- Handle batch failures gracefully
- Log progress for long operations

```javascript
const BATCH_SIZE = 500;
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);

  const { data, error } = await supabase
    .from('hubspot_contacts')
    .insert(batch);

  if (error) {
    console.error(`✗ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
    errorCount += batch.length;
  } else {
    console.log(`✓ Inserted batch ${i}-${i + BATCH_SIZE}`);
    successCount += batch.length;
  }
}

console.log(`\n=== Summary ===`);
console.log(`✓ Success: ${successCount}`);
console.log(`✗ Errors: ${errorCount}`);
```

### Upsert Operations
- Use `upsert` for insert or update logic
- Specify conflict column(s) explicitly
- Handle unique constraint violations

```javascript
const { data, error } = await supabase
  .from('hubspot_contacts')
  .upsert(contactData, {
    onConflict: 'hubspot_id',
    ignoreDuplicates: false
  });
```

### Row Level Security (RLS)
- Enable RLS on tables with sensitive data
- Use service role key to bypass RLS for admin operations
- Create policies for different access levels
- Test policies thoroughly before production

### Best Practices
- Initialize Supabase client once at startup
- Validate data before sending to Supabase
- Handle PostgreSQL constraints gracefully
- Use proper data types matching schema
- Implement retry logic for transient failures
- Use transactions for related operations

## Logging Standards

### Console Logging with Emojis
- Use clear, actionable log messages
- Include context: what, where, why it failed
- Use prefixes for visual scanning

```javascript
// Success
console.log('✓ Successfully synced 150 contacts');

// Error
console.error('✗ Failed to create deal:', error.message);

// Info/Progress
console.log('→ Processing batch 3/10...');
console.log('🔍 Fetching contact properties...');

// Summary
console.log('\n=== RESULTS ===');
console.log(`Total processed: ${total}`);
```

### Error Messages
- Include operation context
- Show affected entities (IDs, counts)
- Provide actionable information

```javascript
// ✅ Good
console.error(`✗ Failed to sync contact ${contactId}:`, error.message);
throw new Error(`HubSpot API request failed for /contacts: ${error.message}`);

// ❌ Bad
console.log('error');
throw new Error('Failed');
```

## File Organization

### Project Structure
```
src/
├── hubspot/          # HubSpot API integration
│   ├── api.js        # API functions
│   └── sync.js       # Sync logic
├── supabase/         # Supabase integration
│   └── client.js     # Supabase client
├── utils/            # Shared utilities
│   ├── errors.js     # Custom error classes
│   ├── logger.js     # Logging utilities
│   └── validate.js   # Validation functions
├── scripts/          # One-time scripts
└── config.js         # Configuration constants
```

### File Naming
- Use kebab-case for files: `hubspot-api.js`, `sync-contacts.js`
- Use descriptive names that indicate purpose
- Group related files in directories

## Environment Configuration

### Validation
- Validate required env variables at startup
- Fail fast if critical config is missing
- Provide helpful error messages

```javascript
// utils/validate-env.js
export function validateEnv() {
  const required = [
    'HUBSPOT_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file`
    );
  }
}
```

### Configuration Constants
- Store constants in dedicated config file
- Use UPPER_SNAKE_CASE for constants
- Export as named exports

```javascript
// src/config.js
export const BATCH_SIZE = 500;
export const API_TIMEOUT = 30000;
export const RETRY_ATTEMPTS = 3;
export const MAX_CONTACTS_PER_REQUEST = 100;
```

---

# React/Next.js Frontend Guidelines

## TypeScript Standards

### Core Principles
- TypeScript for ALL frontend code
- **Prefer `interface` over `type`** for object shapes
- Avoid enums; use const objects or literal types
- Always define proper types for props and state

```typescript
// ✅ Good - interface
interface MetricCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral';
  onChange?: (value: number) => void;
}

export function MetricCard({ title, value, trend }: MetricCardProps) {
  // Component logic
}

// ❌ Avoid - type for objects
type MetricCardProps = {
  title: string;
  // ...
}

// ❌ Avoid - enums
enum Trend { Up, Down, Neutral }

// ✅ Good - const object
const TREND = {
  UP: 'up',
  DOWN: 'down',
  NEUTRAL: 'neutral'
} as const;

type Trend = typeof TREND[keyof typeof TREND];
```

### Type Safety
- Type hints for all function signatures
- No `any` types (use `unknown` if truly needed)
- Proper return types for functions
- Discriminated unions for complex types

```typescript
// Function with proper types
function calculateMetric(deals: Deal[]): MetricResult {
  return { total: deals.length, value: deals.reduce(...) };
}

// Discriminated union
interface SuccessResult {
  success: true;
  data: MetricData;
}

interface ErrorResult {
  success: false;
  error: string;
}

type ApiResult = SuccessResult | ErrorResult;
```

---

## Next.js App Router

### React Server Components (RSC)
- **Minimize `'use client'`** - use Server Components by default
- `'use client'` only for Web API access in small components
- Avoid for data fetching or state management
- Wrap client components in Suspense with fallback

```typescript
// ✅ Server Component (default)
async function DashboardPage() {
  const metrics = await fetchMetrics();
  return <MetricsDashboard data={metrics} />;
}

// ✅ Client Component (minimal)
'use client';
export function InteractiveChart({ data }: ChartProps) {
  const [selected, setSelected] = useState<string | null>(null);
  // Only client-side logic
}
```

### File Structure
- Place Server Components in `app/` directory
- Client Components in `components/` with `'use client'`
- Shared utilities in `lib/`
- Types in `types/` or colocated with components

```
frontend/
├── app/
│   ├── page.tsx              # Server Component
│   ├── dashboard/
│   │   └── page.tsx          # Server Component
│   └── api/
│       └── metrics/route.ts  # API Route
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

```typescript
import { cn } from "@/lib/utils";

export function Button({ variant, isLoading, children }: ButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md font-medium",
        variant === 'primary' && "bg-blue-600 text-white",
        variant === 'secondary' && "bg-gray-200 text-gray-900",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
```

### shadcn/ui Components
- Use shadcn/ui + Radix UI for all UI components
- Follow shadcn/ui conventions
- Customize components in `components/ui/`
- Never modify node_modules

```bash
# Add components
npx shadcn@latest add button card dialog select

# Usage
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

---

## Data Fetching

### Server-Side (Recommended)
- Server Components for data fetching
- Proper error handling and loading states
- React Suspense for async components

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

async function DashboardPage() {
  const metrics = await fetch('http://localhost:3000/api/metrics', {
    cache: 'no-store'  // Always fresh data
  });

  const data = await metrics.json();

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MetricsDashboard data={data} />
    </Suspense>
  );
}
```

### Client-Side (When Needed)
- Use SWR or TanStack Query
- Proper caching strategies
- Handle loading and error states

```typescript
'use client';
import useSWR from 'swr';

export function LiveMetrics() {
  const { data, error, isLoading } = useSWR('/api/metrics', fetcher, {
    refreshInterval: 60000  // Refresh every minute
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <MetricsView data={data} />;
}
```

---

## Supabase Integration (Next.js)

### Critical Rules
- Use `@supabase/ssr` (NOT `@supabase/supabase-js`)
- Use ONLY `getAll()` and `setAll()` methods
- NEVER use deprecated `get()`, `set()`, `remove()` methods

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

### Usage in Server Components
```typescript
import { createClient } from '@/lib/supabase/server';

async function MetricsPage() {
  const supabase = await createClient();
  const { data: metrics } = await supabase
    .from('metrics_view')
    .select('*');

  return <MetricsDisplay data={metrics} />;
}
```

### Usage in Client Components
```typescript
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function LiveData() {
  const [data, setData] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('metrics').select('*');
      setData(data);
    }
    fetchData();
  }, []);

  return <div>{/* render */}</div>;
}
```

---

## Performance Optimization

### Images
- Use Next.js Image component
- WebP format, size data
- Lazy loading for images

```typescript
import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={200}
      height={50}
      priority  // For above-the-fold images
    />
  );
}
```

### Code Splitting
- Dynamic imports for heavy components
- Lazy loading for non-critical components

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false  // Client-only component
});
```

---

## State Management

### Local State
- `useState` for truly local UI state only
- Avoid `useEffect` when possible
- Use Server Components for data fetching

```typescript
'use client';
export function FilterPanel() {
  const [filter, setFilter] = useState<string>('all');

  return (
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
    </select>
  );
}
```

### URL State
- `nuqs` for URL search parameter state
- Share state across components via URL

```typescript
import { useQueryState } from 'nuqs';

export function DateRangePicker() {
  const [startDate, setStartDate] = useQueryState('start');
  const [endDate, setEndDate] = useQueryState('end');

  return <DatePicker start={startDate} end={endDate} onChange={...} />;
}
```

### Global State (if needed)
- Zustand for complex global state
- Keep state minimal
- Prefer Server Components for data

---

## Component Patterns

### Component Structure
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Types/Interfaces first
interface MetricCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down';
}

// Main Component
export function MetricCard({ title, value, trend }: MetricCardProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);

  // Event handlers
  const handleClick = () => setIsExpanded(!isExpanded);

  // Render
  return (
    <div onClick={handleClick}>
      <h3>{title}</h3>
      <p>{formatValue(value)}</p>
      {trend && <TrendIndicator direction={trend} />}
    </div>
  );
}

// Helper functions at the end
function formatValue(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
```

### Naming Conventions
- Components: PascalCase (`MetricCard.tsx`)
- Directories: kebab-case (`metric-cards/`)
- Variables: camelCase (`isLoading`, `hasError`)
- Constants: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRIES`)
- Props interfaces: ComponentNameProps (`MetricCardProps`)

---

## API Routes (Backend Integration)

### Pattern for HubSpot Proxy
```typescript
// app/api/hubspot/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get data from request
    const body = await request.json();

    // Call HubSpot API (server-side, API key hidden)
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
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

## Testing (Frontend)

### Component Tests
- Test user interactions
- Test data display
- Test error states

```typescript
// __tests__/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricCard } from '@/components/MetricCard';

describe('MetricCard', () => {
  it('displays metric value', () => {
    render(<MetricCard title="Sales" value={1000} />);
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
});
```

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

