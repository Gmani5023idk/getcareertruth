/**
 * AGENT 1: DB Connectivity Inspector
 * Tests PostgreSQL (Neon) database connectivity and connection pooling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { generateTestId, cleanupTestUsers, maskEmail } from '../helpers/db-helpers';

const prisma = new PrismaClient();

// Test state
const testResults: Record<string, any> = {
  checks: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
};

describe('Agent 1 - DB Connectivity Inspector', () => {
  const timestamp = Date.now();
  const testPrefix = `agent1_db_test_${timestamp}`;

  beforeAll(async () => {
    console.log('\n🔵 Agent 1: Starting DB Connectivity Tests');
  }, 30000);

  afterAll(async () => {
    console.log('\n📊 Agent 1 Test Summary:');
    console.table(testResults.checks);
    console.log(`\nTotal: ${testResults.summary.total}, Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}, Skipped: ${testResults.summary.skipped}`);
    
    await prisma.$disconnect();
  }, 10000);

  beforeEach(() => {
    // Record test timestamp
    testResults.testStartTime = new Date().toISOString();
  });

  // Test 1.1: Basic connectivity
  it('should connect to database and execute simple query', async () => {
    const startTime = Date.now();
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';

    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      const latency = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect((result as any[])[0]?.test).toBe(1);
      
      notes = `Query executed in ${latency}ms`;
      console.log(`✅ ${notes}`);
    } catch (error: any) {
      status = 'FAIL';
      notes = `Connection failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    const check = {
      timestamp: new Date().toISOString(),
      test: 'Basic DB Connectivity',
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;
    
    expect(status).toBe('PASS');
  }, 10000);

  // Test 1.2: Cold start latency
  it('should handle cold start latency (serverless spin-up)', async () => {
    const coldStartLatency: Record<string, number> = {};
    const iterations = 3;
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';

    try {
      // Simulate cold starts by disconnecting and reconnecting
      for (let i = 0; i < iterations; i++) {
        const testClient = new PrismaClient();
        const startTime = Date.now();
        await testClient.$queryRaw`SELECT 1`;
        coldStartLatency[`iteration_${i}`] = Date.now() - startTime;
        await testClient.$disconnect();
      }

      const avgLatency = Object.values(coldStartLatency).reduce((a, b) => a + b, 0) / iterations;
      notes = `Average cold start: ${avgLatency.toFixed(2)}ms across ${iterations} iterations`;
      console.log(`✅ ${notes}`);

      // Neon typically has 100-3000ms cold start
      expect(avgLatency).toBeGreaterThan(0);
      expect(avgLatency).toBeLessThan(5000); // 5 second threshold
    } catch (error: any) {
      status = 'FAIL';
      notes = `Cold start test failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    const check = {
      timestamp: new Date().toISOString(),
      test: 'Cold Start Latency',
      details: coldStartLatency,
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;

    expect(status).toBe('PASS');
  }, 30000);

  // Test 1.3: Concurrent requests (connection pooling)
  it('should handle concurrent requests (pgBouncer connection pooling)', async () => {
    const concurrentCount = 10;
    const results: Array<{ success: boolean; latency: number; error?: string }> = [];
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';

    try {
      const promises = Array.from({ length: concurrentCount }, async (_, i) => {
        const startTime = Date.now();
        try {
          const testClient = new PrismaClient();
          await testClient.$queryRaw`SELECT 1 as test`;
          const latency = Date.now() - startTime;
          await testClient.$disconnect();
          return { success: true, latency, error: undefined };
        } catch (error: any) {
          return { success: false, latency: Date.now() - startTime, error: error.message };
        }
      });

      results.push(...(await Promise.all(promises)));

      const successCount = results.filter((r) => r.success).length;
      const avgLatency = results.filter((r) => r.success).reduce((a, b) => a + b.latency, 0) / successCount;
      
      notes = `${successCount}/${concurrentCount} successful, avg latency: ${avgLatency.toFixed(2)}ms`;
      console.log(`✅ ${notes}`);

      // Expect at least 80% success rate
      expect(successCount).toBeGreaterThanOrEqual(concurrentCount * 0.8);
    } catch (error: any) {
      status = 'FAIL';
      notes = `Concurrency test failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    const check = {
      timestamp: new Date().toISOString(),
      test: 'Concurrent Requests',
      details: {
        totalRequests: concurrentCount,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        avgLatency: results.filter((r) => r.success).reduce((a, b) => a + b.latency, 0) / results.filter((r) => r.success).length || 0,
      },
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;

    expect(status).toBe('PASS');
  }, 30000);

  // Test 1.4: Health endpoint check
  it('should verify health endpoint responds correctly', async () => {
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';
    const healthResult: any = {};

    try {
      // Skip if not running in a server environment
      if (typeof fetch === 'undefined') {
        notes = 'SKIPPED: Running in Node.js test environment without fetch';
        console.log(`⚠️  ${notes}`);
      } else {
        const response = await fetch('http://localhost:3000/api/health');
        healthResult.statusCode = response.status;
        healthResult.body = await response.json();

        if (response.status === 200 && healthResult.body.status === 'ok') {
          status = 'PASS';
          notes = `Health endpoint OK: ${JSON.stringify(healthResult.body.services)}`;
          console.log(`✅ ${notes}`);
        } else {
          status = 'FAIL';
          notes = `Health endpoint returned ${response.status}: ${JSON.stringify(healthResult.body)}`;
          console.error(`❌ ${notes}`);
        }
      }
    } catch (error: any) {
      status = 'SKIP';
      notes = `Health endpoint check failed: ${error.message} (dev server not running - skipping)`;
      console.log(`⚠️  ${notes}`);
    }

    const check = {
      timestamp: new Date().toISOString(),
      test: 'Health Endpoint',
      details: healthResult,
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;
    else testResults.summary.skipped++;

    // Don't fail the test if server isn't running
    if (status !== 'SKIP') {
      expect(status).toBe('PASS');
    }
  }, 15000);

  // Test 1.5: Verify DATABASE_URL validation
  it('should handle invalid DATABASE_URL gracefully', async () => {
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';

    try {
      const originalUrl = process.env.DATABASE_URL;
      
      // Temporarily set invalid URL
      process.env.DATABASE_URL = 'postgres://invalid:invalid@invalid:5432/invalid';
      
      const testClient = new PrismaClient();
      let errorCaught = false;
      let errorMessage = '';

      try {
        await testClient.$queryRaw`SELECT 1`;
      } catch (error: any) {
        errorCaught = true;
        errorMessage = error.message;
      }

      await testClient.$disconnect();

      // Restore original URL
      process.env.DATABASE_URL = originalUrl;

      if (errorCaught) {
        status = 'PASS';
        notes = 'Gracefully handled invalid DATABASE_URL (error caught as expected)';
        console.log(`✅ ${notes}`);
      } else {
        status = 'FAIL';
        notes = 'Did not throw error with invalid DATABASE_URL';
        console.error(`❌ ${notes}`);
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test setup failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    const check = {
      timestamp: new Date().toISOString(),
      test: 'Invalid DATABASE_URL Handling',
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;

    expect(status).toBe('PASS');
  }, 10000);
});

// Export results for reporting
export function getAgent1Summary(): typeof testResults {
  return testResults;
}