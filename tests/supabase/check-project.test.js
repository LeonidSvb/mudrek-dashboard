import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

console.log('Проверка проектов Supabase...\n');
console.log('Access Token:', accessToken ? accessToken.substring(0, 15) + '...' : 'НЕ НАЙДЕН');

async function checkProjects() {
  try {
    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\nСтатус ответа:', response.status, response.statusText);

    if (response.ok) {
      const projects = await response.json();
      console.log('\nВаши проекты Supabase:');
      console.log(JSON.stringify(projects, null, 2));

      if (projects.length > 0) {
        projects.forEach(project => {
          console.log(`\n- ${project.name}`);
          console.log(`  ID: ${project.id}`);
          console.log(`  Region: ${project.region}`);
          console.log(`  Status: ${project.status}`);
          console.log(`  URL: https://${project.ref}.supabase.co`);
        });
      } else {
        console.log('У вас нет активных проектов');
      }
    } else {
      const errorText = await response.text();
      console.error('Ошибка:', errorText);
    }
  } catch (error) {
    console.error('Ошибка при запросе:', error.message);
  }
}

checkProjects();
