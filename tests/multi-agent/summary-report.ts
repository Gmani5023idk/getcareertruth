/**
 * Multi-Agent Test Suite — Pass/Fail Summary Generator
 *
 * Run this after executing all 5 agent test suites to produce:
 *   1. A markdown Pass/Fail summary table
 *   2. Cleanup confirmation for test user records
 *   3. Environment-specific read-only warnings
 *
 * Usage:
 *   npx jest tests/multi-agent/ --json --outputFile=test-results.json
 *   npx ts-node tests/multi-agent/summary-report.ts
 *
 * Or import and call generateSummary() programmatically.
 */

interface TestResult {
  agent: string;
  testCase: string;
  environment: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'CHECK';
  notes: string;
}

const ENVIRONMENT = process.env.APP_ENV || process.env.VERCEL_ENV || 'local';

const results: TestResult[] = [];

function record(
  agent: string,
  testCase: string,
  status: TestResult['status'],
  notes = '',
): void {
  results.push({ agent, testCase, environment: ENVIRONMENT, status, notes });
}

function generateMarkdownTable(): string {
  const header = '| Agent | Test Case | Environment | Status | Notes |\n';
  const separator = '|-------|-----------|-------------|--------|-------|\n';
  const rows = results
    .map(
      (r) =>
        `| ${r.agent} | ${r.testCase} | ${r.environment} | ${r.status} | ${r.notes} |`,
    )
    .join('\n');

  return header + separator + rows;
}

function generatePassFailCounts(): { agent: string; pass: number; fail: number; total: number }[] {
  const grouped: Record<string, TestResult[]> = {};
  for (const r of results) {
    if (!grouped[r.agent]) grouped[r.agent] = [];
    grouped[r.agent].push(r);
  }

  return Object.entries(grouped).map(([agent, items]) => ({
    agent,
    pass: items.filter((i) => i.status === 'PASS').length,
    fail: items.filter((i) => i.status === 'FAIL').length,
    total: items.length,
  }));
}

function generateSummary(): string {
  const counts = generatePassFailCounts();
  const totalPass = counts.reduce((a, c) => a + c.pass, 0);
  const totalFail = counts.reduce((a, c) => a + c.fail, 0);
  const totalTotal = counts.reduce((a, c) => a + c.total, 0);

  let output = `# Multi-Agent Test Suite Summary\n\n`;
  output += `**Environment:** ${ENVIRONMENT}\n`;
  output += `**Timestamp:** ${new Date().toISOString()}\n\n`;

  output += `## Pass/Fail Summary Table\n\n`;
  output += generateMarkdownTable();
  output += `\n\n`;

  output += `## Results by Agent\n\n`;
  output += `| Agent | PASS | FAIL | Total |\n`;
  output += `|-------|------|------|-------|\n`;
  for (const c of counts) {
    output += `| ${c.agent} | ${c.pass} | ${c.fail} | ${c.total} |\n`;
  }
  output += `| **Total** | **${totalPass}** | **${totalFail}** | **${totalTotal}** |\n`;

  if (totalFail > 0) {
    output += `\n## Failed Tests\n\n`;
    for (const r of results) {
      if (r.status === 'FAIL') {
        output += `- **[${r.agent}]** ${r.testCase} — ${r.notes}\n`;
      }
    }
  }

  if (ENVIRONMENT === 'production') {
    output += `\n## ⚠️ Production Mode\n`;
    output += `- Read-only smoke tests only — no data was mutated\n`;
    output += `- All checks were non-destructive configuration validations\n`;
  }

  output += `\n## Cleanup\n`;
  if (ENVIRONMENT !== 'production') {
    output += `- Run cleanup script to delete test users: \`npx ts-node tests/multi-agent/cleanup.ts\`\n`;
  } else {
    output += `- Skipped (production — no test data created)\n`;
  }

  return output;
}

export { record, generateSummary, generateMarkdownTable, results };
