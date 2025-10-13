# Backend Code Patterns & Examples

Это reference файл с примерами кода для backend разработки.
**НЕ загружается автоматически** - используй только по необходимости.

---

## JavaScript/Node.js Patterns

### Function Structure

```javascript
// Top-level functions
async function getAllContacts(limit = 100) {
  const contacts = await fetchContacts(limit);
  return processContacts(contacts);
}

// Helper at the end
function processContacts(contacts) {
  return contacts.map(formatContact);
}
```

### Error Handling

```javascript
// Good - with context
try {
  const data = await hubspotApi.getContacts();
  console.log(`✓ Fetched ${data.length} contacts`);
  return data;
} catch (error) {
  console.error('✗ Failed to fetch HubSpot contacts:', error.message);
  throw new Error(`HubSpot sync failed: ${error.message}`);
}
```

---

## HubSpot API Integration

### Pagination Pattern

```javascript
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

```javascript
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

---

## Supabase Integration (Node.js)

### Client Setup

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
```

### Database Operations

```javascript
// Insert with error handling
const { data, error } = await supabase
  .from('hubspot_contacts')
  .insert(contacts);

if (error) {
  console.error('✗ Failed to insert contacts:', error.message);
  throw new Error(`Supabase insert failed: ${error.message}`);
}

console.log(`✓ Inserted ${data.length} contacts`);
return data;
```

### Batch Operations

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

### Upsert Pattern

```javascript
const { data, error } = await supabase
  .from('hubspot_contacts')
  .upsert(contactData, {
    onConflict: 'hubspot_id',
    ignoreDuplicates: false
  });
```

---

## Environment Validation

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

---

## JSDoc Examples

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
