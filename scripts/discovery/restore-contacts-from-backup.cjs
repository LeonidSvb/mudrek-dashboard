/**
 * Восстановление контактов из JSON бэкапа
 *
 * Использование:
 *   node restore-contacts-from-backup.cjs
 *
 * Что делает:
 *   1. Читает data/hubspot-useful/contacts.json
 *   2. Проверяет сколько контактов сейчас в Supabase
 *   3. Загружает недостающие контакты (UPSERT)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentContacts() {
  console.log('Проверяю текущее количество контактов в Supabase...');

  const { count, error } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  console.log(`Сейчас в базе: ${count} контактов`);
  return count;
}

async function loadBackupFile() {
  console.log('Читаю файл бэкапа...');

  const filePath = './data/hubspot-useful/contacts.json';

  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const contacts = JSON.parse(fileContent);

  console.log(`В бэкапе найдено: ${contacts.length} контактов`);

  return contacts;
}

function transformContact(hubspotContact) {
  const props = hubspotContact.properties || {};

  return {
    hubspot_id: hubspotContact.id,
    email: props.hs_full_name_or_email || props.email || null,
    phone: props.phone || null,
    createdate: props.createdate ? new Date(props.createdate).toISOString() : null,
    lifecyclestage: props.lifecyclestage || null,
    hubspot_owner_id: props.hubspot_owner_id || null,
    sales_script_version: props.sales_script_version || null,
    vsl_watched: props.vsl_watched === 'true' || props.vsl_watched === true,
    raw_json: hubspotContact,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function restoreContacts() {
  try {
    // Шаг 1: Проверить текущее состояние
    const currentCount = await checkCurrentContacts();

    // Шаг 2: Загрузить бэкап
    const backupContacts = await loadBackupFile();

    console.log(`\nРазница: ${backupContacts.length - currentCount} контактов нужно восстановить`);

    if (backupContacts.length <= currentCount) {
      console.log('✓ Все контакты на месте! Восстановление не требуется.');
      return;
    }

    // Шаг 3: Подтверждение
    console.log('\n⚠️  ВНИМАНИЕ: Сейчас начнётся восстановление данных');
    console.log(`Будет восстановлено: ${backupContacts.length} контактов`);
    console.log('Нажми Ctrl+C в течение 5 секунд чтобы отменить...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Шаг 4: Трансформация
    console.log('Трансформирую данные...');
    const transformedContacts = backupContacts.map(transformContact);

    // Шаг 5: UPSERT батчами
    console.log('Загружаю в Supabase (батчами по 500)...\n');

    const BATCH_SIZE = 500;
    let restored = 0;
    let errors = 0;

    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      const batch = transformedContacts.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('hubspot_contacts_raw')
        .upsert(batch, {
          onConflict: 'hubspot_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`✗ Ошибка в батче ${i}-${i + BATCH_SIZE}:`, error.message);
        errors += batch.length;
      } else {
        restored += batch.length;
        console.log(`✓ Восстановлено ${restored}/${transformedContacts.length} контактов`);
      }
    }

    // Шаг 6: Финальная проверка
    console.log('\nФинальная проверка...');
    const finalCount = await checkCurrentContacts();

    console.log('\n=== РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ ===');
    console.log(`Было: ${currentCount} контактов`);
    console.log(`Стало: ${finalCount} контактов`);
    console.log(`Восстановлено: ${finalCount - currentCount} контактов`);
    console.log(`Ошибок: ${errors}`);

    if (finalCount >= backupContacts.length * 0.95) {
      console.log('\n✓ УСПЕШНО! Все данные восстановлены!');
    } else {
      console.log('\n⚠️  Предупреждение: Восстановлено меньше контактов чем ожидалось');
    }

  } catch (error) {
    console.error('\n✗ ОШИБКА:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Запуск
console.log('=== ВОССТАНОВЛЕНИЕ КОНТАКТОВ ИЗ БЭКАПА ===\n');
restoreContacts();
