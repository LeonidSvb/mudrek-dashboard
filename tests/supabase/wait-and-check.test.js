import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectId = 'pimcijqzezvlhicurbkq';

async function checkProjectStatus() {
  console.log('Проверяю статус проекта mudrek...\n');

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch('https://api.supabase.com/v1/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const projects = await response.json();
        const mudrek = projects.find(p => p.id === projectId);

        if (mudrek) {
          console.log(`[${new Date().toLocaleTimeString()}] Статус: ${mudrek.status}`);

          if (mudrek.status === 'ACTIVE_HEALTHY') {
            console.log('\n✓ Проект активен!');
            console.log(`URL: https://pimcijqzezvlhicurbkq.supabase.co`);
            console.log(`Database Host: ${mudrek.database.host}`);
            break;
          } else if (mudrek.status === 'COMING_UP') {
            console.log('  Проект запускается, ожидаю 30 секунд...');
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else {
            console.log(`  Неожиданный статус: ${mudrek.status}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Ошибка:', error.message);
    }
  }
}

checkProjectStatus();
