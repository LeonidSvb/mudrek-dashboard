import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('data/hubspot-full/contacts.json', 'utf8'));

console.log('=== CONTACTS JSON ANALYSIS ===\n');
console.log(`Total contacts: ${data.length}\n`);

// Check first 5 contacts
data.slice(0, 5).forEach((contact, i) => {
  const props = contact.properties || {};
  const propsCount = Object.keys(props).length;
  const hasPhone = !!props.phone;
  const hasMobile = !!props.mobilephone;

  console.log(`Contact ${i + 1}: ${contact.id}`);
  console.log(`  Name: ${props.firstname || 'N/A'} ${props.lastname || ''}`);
  console.log(`  Properties count: ${propsCount}`);
  console.log(`  Has phone: ${hasPhone} ${hasPhone ? '('+props.phone+')' : ''}`);
  console.log(`  Has mobilephone: ${hasMobile} ${hasMobile ? '('+props.mobilephone+')' : ''}`);
  console.log(`  Has associations: ${!!contact.associations}\n`);
});

// Statistics
const withPhone = data.filter(c => c.properties?.phone || c.properties?.mobilephone).length;
console.log(`\n📊 Phone coverage: ${withPhone}/${data.length} (${((withPhone/data.length)*100).toFixed(1)}%)`);

// Sample all property names from first contact
console.log(`\n📋 Sample properties (first 20):`);
const sampleProps = Object.keys(data[0].properties).slice(0, 20);
console.log(sampleProps.join(', '));
