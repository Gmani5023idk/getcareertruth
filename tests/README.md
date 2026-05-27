# Multi-Agent Automated Testing Suite for GetCareerTruth

## Overview
This suite implements 5 specialized testing agents to verify database connectivity, user registration, data persistence, and failure scenarios.

## Agents

### Agent 1: DB Connectivity Inspector
- Tests Prisma connection to Neon PostgreSQL
- Validates cold start, concurrent requests, and error handling
- Checks connection pooling via pgBouncer

### Agent 2: Registration Flow Tester (Credentials)
- Tests email/password account creation (Student, Employee, Parent)
- Verifies DB records, password hashing, email verification flow
- Tests login after verification

### Agent 3: Registration Flow Tester (OAuth)
- Tests Google OAuth account creation
- Validates Account table linking
- Tests duplicate email handling (OAuth vs Credentials)

### Agent 4: Failure & Edge Case Tester
- Tests duplicate emails, weak passwords, invalid formats
- Tests SQL injection, XSS attempts
- Verifies rollback behavior on failures

### Agent 5: Cross-Environment Validator
- Runs condensed smoke tests across Local/Staging/Production
- Verifies environment variables and DB connectivity

## Setup

```bash
# Install dependencies
npm install --save-dev vitest @vitest/ui supertest @types/supertest

# Create test database (Neon branch)
# Update DATABASE_URL in .env.test

# Run tests
npm run test:agents
```

## Test Structure

```
tests/
├── agents/
│   ├── agent-1-db-connectivity.test.ts
│   ├── agent-2-registration-credentials.test.ts
│   ├── agent-3-registration-oauth.test.ts
│   ├── agent-4-failure-edge-cases.test.ts
│   └── agent-5-cross-environment.test.ts
├── fixtures/
│   ├── test-users.ts
│   └── mocks.ts
├── helpers/
│   ├── db-helpers.ts
│   ├── api-helpers.ts
│   └── cleanup.ts
└── setup.ts
```

## Output Format

Each agent produces:
1. ✅ Step-by-step checklist with PASS/FAIL/SKIP
2. 🧪 Automated test script (Vitest)
3. 📋 Pass/Fail summary table

## Cleanup

All test users are automatically deleted after each run:
- Users with email matching `testuser_*@example.com`
- Associated Account and Session records

---
Generated: $(date -Iseconds)