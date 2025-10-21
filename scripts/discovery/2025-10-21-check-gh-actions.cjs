const fs = require('fs');
const https = require('https');

const url = 'https://api.github.com/repos/LeonidSvb/mudrek-dashboard/actions/runs?per_page=10';

https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);

    console.log('\n📊 ПОСЛЕДНИЕ 10 ЗАПУСКОВ GITHUB ACTIONS:\n');
    console.log('Total runs:', json.total_count);
    console.log('='.repeat(80));

    json.workflow_runs.forEach((run, idx) => {
      const status = run.conclusion === 'success' ? '✅' :
                     run.conclusion === 'failure' ? '❌' :
                     run.status === 'in_progress' ? '⏳' : '⚠️';

      const date = new Date(run.created_at);
      const moscowDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);

      console.log(`
${idx + 1}. ${status} ${run.name}
   Run #: ${run.run_number}
   Status: ${run.status} / ${run.conclusion || 'N/A'}
   Time: ${moscowDate.toISOString().replace('T', ' ').slice(0, 19)} (UTC+5)
   Event: ${run.event}
   URL: ${run.html_url}
      `);
    });
  });
}).on('error', err => console.error('Error:', err));
