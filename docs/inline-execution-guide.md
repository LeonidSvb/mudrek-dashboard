# Inline Execution Guide

**Проблема:** Claude создает `check-*.js`, `test-*.js` файлы в root → захламление проекта

**Решение:** Выполнять код INLINE без создания файлов

---

## ✅ Правильные способы

### 1. One-liner (простые проверки)

```bash
# Проверить подключение к Supabase
node -e "const { createClient } = require('@supabase/supabase-js'); console.log('OK')"

# Посчитать строки в файле
node -e "console.log(require('fs').readFileSync('data.json', 'utf8').split('\n').length)"

# Проверить env переменные
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL ? 'OK' : 'Missing')"
```

### 2. Heredoc (multi-line код)

```bash
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .limit(5);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Found', data.length, 'deals');
    console.log('Columns:', Object.keys(data[0]));
  }
}

check().then(() => process.exit(0));
EOF
```

### 3. REPL (interactive)

```bash
# Запустить Node REPL с контекстом
node
> const { createClient } = require('@supabase/supabase-js')
> const supabase = createClient(...)
> // Интерактивно выполнять команды
```

---

## ❌ Неправильно

**НЕ делай так:**
```bash
# ❌ Создает файл check-schema.cjs в root
cat > check-schema.cjs << 'EOF'
const { createClient } = require('@supabase/supabase-js');
// ... code ...
EOF
node check-schema.cjs
```

**Последствия:**
- Захламление root директории
- Файлы попадают в gitignore но все равно мешают
- Нужно вручную удалять после каждой проверки

---

## 🔄 Когда НУЖНО создавать файл?

**Только если:**

1. **Скрипт будет использоваться многократно**
   → Создать в `scripts/utils/`
   ```bash
   scripts/utils/sync-contacts.js
   scripts/utils/generate-report.js
   ```

2. **Нужно сохранить для истории**
   → Создать в `scripts/discovery/` с датой
   ```bash
   scripts/discovery/2025-10-13-check-migration.cjs
   scripts/discovery/2025-10-13-analyze-contacts.cjs
   ```

3. **Production код**
   → Создать в `src/` или `frontend/`
   ```bash
   src/hubspot/sync.js
   frontend/lib/utils.ts
   ```

---

## 📋 Примеры использования

### Проверить schema таблицы

```bash
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .limit(1);

  console.log('Columns:', Object.keys(data[0]).sort().join(', '));
}

checkSchema().then(() => process.exit(0));
EOF
```

### Посчитать записи

```bash
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function countRecords() {
  const { count } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  console.log('Total deals:', count);
}

countRecords().then(() => process.exit(0));
EOF
```

### Проверить дубликаты

```bash
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicates() {
  const { data } = await supabase.rpc('check_duplicate_emails');
  console.log('Duplicates found:', data.length);
  if (data.length > 0) {
    console.log('Examples:', data.slice(0, 3));
  }
}

checkDuplicates().then(() => process.exit(0));
EOF
```

---

## 💡 Tips

### Сохранить команду в history

- Heredoc автоматически сохраняется в bash history
- Можно повторить через `Ctrl+R` или `history | grep node`
- Если нужно часто - создай alias или функцию в `.bashrc`

### Debug output

```bash
# Добавь подробный вывод
node << 'EOF'
console.log('Starting check...');
// ... код ...
console.log('Check completed!');
EOF
```

### Копировать вывод

```bash
# Сохранить результат в файл
node << 'EOF' > tmp/check-results.txt
// ... код ...
EOF

cat tmp/check-results.txt
```

---

## Summary

**✅ DO:**
- Use `node -e "..."` for one-liners
- Use heredoc for multi-line checks
- Save to `scripts/discovery/` if needed for history

**❌ DON'T:**
- Create `check-*.js`, `test-*.js` files in root
- Create temporary files that you'll delete anyway
- Clutter root directory with one-time scripts

**Result:** Clean root directory, fast checks, no manual cleanup needed.
