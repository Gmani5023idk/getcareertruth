#!/bin/bash
# Quick test execution guide
# Run from: /home/manikanta/hermes/getcareertruth

echo "🧪 GetCareerTruth Multi-Agent Test Suite"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# 1. Check .env exists
if [ -f ".env" ] || [ -f ".env.local" ]; then
    echo "✅ .env found"
else
    echo "❌ .env not found! Please create one from .env.example"
    exit 1
fi

# 2. Check Prisma client generated
if [ -d "node_modules/.prisma" ]; then
    echo "✅ Prisma client generated"
else
    echo "⚠️  Prisma client not generated. Run: npx prisma generate"
fi

# 3. Check dev server
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Dev server running on http://localhost:3000"
else
    echo "⚠️  Dev server not running. API tests will be skipped."
    echo "   Start with: npm run dev"
fi

echo ""
echo "========================================"
echo "🚀 To run all agent tests:"
echo "   npm test -- tests/agents/ --verbose"
echo ""
echo "📄 To run individual agent:"
echo "   npm test -- tests/agents/agent-1-db-connectivity.test.ts"
echo ""
echo "📊 To view test summary:"
echo "   cat tests/AGENT_SUMMARY.md"
echo ""
echo "========================================"