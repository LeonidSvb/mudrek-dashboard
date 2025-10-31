#!/usr/bin/env tsx
/**
 * Генерирует TypeScript и Markdown из metrics-schema.yaml
 *
 * Запуск: npm run docs:generate
 *
 * Генерирует:
 * - lib/metric-definitions.ts (для runtime)
 * - docs/METRICS_GUIDE.md (для документации)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface Metric {
  title: string;
  description: string;
  source: string;
  sql?: string;
  interpretation?: string;
  goodBenchmark?: string;
  ifZero?: string;
}

interface Category {
  title: string;
  metrics: Record<string, Metric>;
}

interface Schema {
  categories: Record<string, Category>;
}

function generateTypeScript(schema: Schema): string {
  let ts = `/**
 * Centralized metric definitions with explanations
 *
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from: docs/metrics-schema.yaml
 * Run: npm run docs:generate
 */

export interface MetricDefinition {
  description: string;
  source: string;
  interpretation?: string;
  ifZero?: string;
  sql?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {\n`;

  for (const [categoryKey, category] of Object.entries(schema.categories)) {
    ts += `  // ============================================================\n`;
    ts += `  // ${category.title.toUpperCase()}\n`;
    ts += `  // ============================================================\n`;

    for (const [metricKey, metric] of Object.entries(category.metrics)) {
      ts += `  ${metricKey}: {\n`;
      ts += `    description: "${metric.description}",\n`;
      ts += `    source: "${metric.source}",\n`;

      if (metric.sql) {
        // Экранируем SQL для TypeScript строки
        const sqlEscaped = metric.sql.trim().replace(/\n/g, '\\n').replace(/"/g, '\\"');
        ts += `    sql: "${sqlEscaped}",\n`;
      }

      if (metric.interpretation) {
        ts += `    interpretation: "${metric.interpretation}",\n`;
      }

      if (metric.ifZero) {
        ts += `    ifZero: "${metric.ifZero}",\n`;
      }

      ts += `  },\n\n`;
    }
  }

  ts += `};\n\n`;

  // Добавляем helper функции
  ts += `/**
 * Format metric definition into tooltip text
 */
export function formatMetricHelp(definition: MetricDefinition): string {
  let help = \`\${definition.description}\\n\\nSource: \${definition.source}\`;

  if (definition.interpretation) {
    help += \`\\n\\n\${definition.interpretation}\`;
  }

  if (definition.ifZero) {
    help += \`\\n\\n⚠️ \${definition.ifZero}\`;
  }

  return help;
}

/**
 * Get metric definition by key
 */
export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key];
}
`;

  return ts;
}

function generateMarkdown(schema: Schema): string {
  let md = `# Metrics Guide for Sales Managers

Complete guide to understanding and using metrics in Mudrek Dashboard.

⚠️ **AUTO-GENERATED FILE** - Do not edit manually.
📝 **Source**: \`docs/metrics-schema.yaml\`
🔄 **Update**: Run \`npm run docs:generate\`

---

## Table of Contents

`;

  // Генерируем TOC
  for (const [categoryKey, category] of Object.entries(schema.categories)) {
    md += `- [${category.title}](#${categoryKey})\n`;
  }

  md += `\n---\n\n`;

  // Генерируем секции
  for (const [categoryKey, category] of Object.entries(schema.categories)) {
    md += `## ${category.title}\n\n`;

    for (const [metricKey, metric] of Object.entries(category.metrics)) {
      md += `### ${metric.title}\n\n`;
      md += `**What it shows**: ${metric.description}\n\n`;
      md += `**Source**: ${metric.source}\n\n`;

      if (metric.goodBenchmark) {
        md += `**Good benchmark**: ${metric.goodBenchmark}\n\n`;
      }

      if (metric.interpretation) {
        md += `**Interpretation**: ${metric.interpretation}\n\n`;
      }

      if (metric.sql) {
        md += `**SQL Query**:\n\`\`\`sql\n${metric.sql.trim()}\n\`\`\`\n\n`;
      }

      if (metric.ifZero) {
        md += `⚠️ **Why might it be 0?**: ${metric.ifZero}\n\n`;
      }

      md += `**Code reference**: \`METRIC_DEFINITIONS.${metricKey}\`\n\n`;
      md += `---\n\n`;
    }
  }

  // Footer
  md += `\n## Metadata\n\n`;
  md += `- **Generated**: ${new Date().toISOString()}\n`;
  md += `- **Source**: \`docs/metrics-schema.yaml\`\n`;
  md += `- **TypeScript**: \`lib/metric-definitions.ts\`\n`;

  return md;
}

async function main() {
  console.log('🚀 Generating TypeScript and Markdown from YAML...\n');

  // Читаем YAML
  const yamlPath = path.join(process.cwd(), 'docs', 'metrics-schema.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const schema: Schema = yaml.parse(yamlContent);

  // Генерируем TypeScript
  const tsContent = generateTypeScript(schema);
  const tsPath = path.join(process.cwd(), 'lib', 'metric-definitions.generated.ts');
  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  console.log(`✅ Generated: ${tsPath}`);

  // Генерируем Markdown
  const mdContent = generateMarkdown(schema);
  const mdPath = path.join(process.cwd(), 'docs', 'METRICS_GUIDE.generated.md');
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✅ Generated: ${mdPath}`);

  console.log('\n✨ Done! Import from lib/metric-definitions.generated.ts in your code.');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
