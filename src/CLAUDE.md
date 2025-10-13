# Backend (Node.js) Coding Rules

**This file is loaded automatically when working in `src/` directory.**
**For code examples, see: `docs/backend-patterns.md`**

---

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

### Error Handling Patterns
- Always use try-catch for async operations
- Provide meaningful error messages with context
- Log errors with enough detail for debugging
- Never swallow errors silently
- Use early returns for error conditions

### JSDoc for Type Safety
- Add JSDoc comments for function parameters and returns
- Document complex objects and data structures
- Helps IDEs provide better autocomplete

---

## API Integration Patterns

### HubSpot API
- Store API keys in `.env` file (never hardcode)
- Implement proper pagination for large datasets
- Use batch operations when possible (max 100 items per batch)
- Handle rate limiting with retry logic
- Log progress for long-running operations

**Key rules:**
- Pagination: Use `after` parameter, check `paging.next`
- Batch size: Max 100 items per request
- Properties: Request only needed properties
- Error handling: Wrap in try-catch with context

### Batch Processing
- Process large datasets in batches
- Use reasonable batch sizes (100-500 items)
- Log progress for visibility
- Handle partial failures gracefully

**Pattern:**
- Batch size: 500 for Supabase, 100 for HubSpot
- Log progress after each batch
- Track success/error counts
- Continue on partial failures (unless critical)

---

## Supabase Integration (Node.js)

### Client Initialization
- Use `@supabase/supabase-js` package (**NOT** `@supabase/ssr`)
- Initialize client once at app startup, reuse everywhere
- Use `SUPABASE_SERVICE_ROLE_KEY` for backend operations (has admin privileges)
- Never expose service role key to frontend

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # For server-side admin operations
```

### Database Operations
- Always check for `error` in response: `const { data, error } = await ...`
- Provide context in error messages
- Use meaningful log messages
- Handle edge cases (null, undefined, empty arrays)

### Batch Operations
- Use batch inserts for multiple records
- Recommended batch size: 500 records (max 1000)
- Handle batch failures gracefully
- Log progress for long operations

### Upsert Operations
- Use `upsert` for insert or update logic
- Specify conflict column(s) explicitly: `onConflict: 'hubspot_id'`
- Handle unique constraint violations

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

---

## Logging Standards

### Console Logging (без emojis в скриптах)
- Use clear, actionable log messages
- Include context: what, where, why it failed
- Use prefixes for visual scanning

**Patterns:**
```
✓ Success messages: "Successfully synced 150 contacts"
✗ Error messages: "Failed to create deal: {error.message}"
→ Progress: "Processing batch 3/10..."
=== Summary ===
```

### Error Messages
- Include operation context
- Show affected entities (IDs, counts)
- Provide actionable information

---

## Environment Configuration

### Validation
- Validate required env variables at startup
- Fail fast if critical config is missing
- Provide helpful error messages

### Configuration Constants
- Store constants in dedicated config file
- Use UPPER_SNAKE_CASE for constants
- Export as named exports

**Example:**
```javascript
export const BATCH_SIZE = 500;
export const API_TIMEOUT = 30000;
export const RETRY_ATTEMPTS = 3;
```

---

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
└── config.js         # Configuration constants
```

### File Naming
- Use kebab-case for files: `hubspot-api.js`, `sync-contacts.js`
- Use descriptive names that indicate purpose
- Group related files in directories
