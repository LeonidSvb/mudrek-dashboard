const https = require('https');

const KAVKOM_API_KEY = '73caab2e-bd41-4eef-9e6f-3ca9214eebda';
const KAVKOM_API_HOST = 'api.kavkom.com';

class KavkomAPI {
  constructor(apiKey = KAVKOM_API_KEY) {
    this.apiKey = apiKey;
  }

  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: KAVKOM_API_HOST,
        path: path,
        method: method,
        headers: {
          'X-API-TOKEN': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`API Error ${res.statusCode}: ${json.message || data}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async getCDRList(domainUuid, options = {}) {
    const {
      limit = 100,
      page = 1,
      startDate = null,
      endDate = null,
      callResult = null,
      callerIdNumber = null,
      destinationNumber = null
    } = options;

    let path = `/api/pbx/v1/cdr/list?domain_uuid=${domainUuid}&limit=${limit}&page=${page}`;

    const filter = {};
    if (startDate) filter.start_date = startDate;
    if (endDate) filter.end_date = endDate;
    if (callResult) filter.call_result = callResult;
    if (callerIdNumber) filter.caller_id_number = callerIdNumber;
    if (destinationNumber) filter.destination_number = destinationNumber;

    if (Object.keys(filter).length > 0) {
      return this.request('POST', path.replace('?', ''), { filter });
    }

    return this.request('GET', path);
  }

  async getAllCDRs(domainUuid, options = {}) {
    const allRecords = [];
    let page = 1;
    let hasMore = true;
    const limit = options.limit || 100;

    console.log('Начинаем скачивание звонков...');

    while (hasMore) {
      try {
        const response = await this.getCDRList(domainUuid, { ...options, limit, page });

        if (response.data && response.data.length > 0) {
          allRecords.push(...response.data);
          console.log(`Загружено ${allRecords.length} записей (страница ${page})...`);

          if (response.data.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Ошибка на странице ${page}:`, error.message);
        hasMore = false;
      }
    }

    console.log(`\nВсего загружено: ${allRecords.length} записей`);
    return allRecords;
  }

  async downloadRecording(filename, outputPath) {
    return new Promise((resolve, reject) => {
      const path = `/api/pbx/v1/cdr/download?file=${encodeURIComponent(filename)}`;

      const options = {
        hostname: KAVKOM_API_HOST,
        path: path,
        method: 'GET',
        headers: {
          'X-API-TOKEN': this.apiKey
        }
      };

      const file = require('fs').createWriteStream(outputPath);

      const req = https.request(options, (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }

        res.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    });
  }

  async getFileLink(uuid, domainUuid) {
    const path = `/api/pbx/v1/cdr/get_file_link?uuid=${uuid}&domain_uuid=${domainUuid}`;
    return this.request('GET', path);
  }
}

if (require.main === module) {
  const domainUuid = process.argv[2];

  if (!domainUuid) {
    console.error('\nИспользование:');
    console.error('  node kavkom-api.js <DOMAIN_UUID> [start_date] [end_date]');
    console.error('\nПример:');
    console.error('  node kavkom-api.js xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    console.error('  node kavkom-api.js xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx "2025-01-01 00:00" "2025-10-25 23:59"');
    console.error('\nГде найти DOMAIN_UUID:');
    console.error('  1. Войдите в https://shadi-mudrek.kavkom.com');
    console.error('  2. Нажмите шестеренку внизу слева → Advanced Settings');
    console.error('  3. Перейдите в Manage Users');
    console.error('  4. Скопируйте domain_uuid\n');
    process.exit(1);
  }

  const startDate = process.argv[3] || null;
  const endDate = process.argv[4] || null;

  const api = new KavkomAPI();

  api.getAllCDRs(domainUuid, { startDate, endDate })
    .then(records => {
      const fs = require('fs');
      const filename = `kavkom-calls-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(records, null, 2));
      console.log(`\nДанные сохранены в: ${filename}`);

      console.log('\n=== Статистика ===');
      console.log(`Всего звонков: ${records.length}`);

      if (records.length > 0) {
        console.log('\nПример первой записи:');
        console.log(JSON.stringify(records[0], null, 2));
      }
    })
    .catch(error => {
      console.error('\nОшибка:', error.message);
      process.exit(1);
    });
}

module.exports = KavkomAPI;
