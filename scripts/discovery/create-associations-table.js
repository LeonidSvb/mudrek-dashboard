import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const sql = `
-- Create call_associations table
CREATE TABLE IF NOT EXISTS call_associations (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT NOT NULL,
  object_type VARCHAR(50) NOT NULL,
  object_id BIGINT NOT NULL,
  association_type VARCHAR(100),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, object_type, object_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_associations_call_id ON call_associations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_associations_object ON call_associations(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_call_associations_synced ON call_associations(synced_at);
`;

async function createTable() {
  console.log('\n=== CREATING call_associations TABLE ===\n');

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await client.query(sql);
    console.log('✓ Table created successfully');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'call_associations'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n=== DONE ===\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTable();
