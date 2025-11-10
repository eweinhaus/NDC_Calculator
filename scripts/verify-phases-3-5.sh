#!/bin/bash

# Phases 3-5 Verification Script
# This script automates verification of Phases 3-5 completion

set -e  # Exit on error

echo "=========================================="
echo "Phases 3-5 Verification Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run from project root."
    exit 1
fi

echo "=== Phase 3: Business Logic Verification ==="
echo ""

# 1. Check if Phase 3 files exist
echo "1. Checking Phase 3 component files..."
PHASE3_FILES=(
    "src/lib/core/regexSigParser.ts"
    "src/lib/core/openaiSigParser.ts"
    "src/lib/core/sigParser.ts"
    "src/lib/core/quantityCalculator.ts"
    "src/lib/core/ndcSelector.ts"
    "src/lib/core/warningGenerator.ts"
    "src/lib/constants/sigPatterns.ts"
)

for file in "${PHASE3_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "File exists: $file"
    else
        print_status 1 "File missing: $file"
    fi
done

# 2. Run TypeScript check
echo ""
echo "2. Running TypeScript check..."
if npm run check > /dev/null 2>&1; then
    print_status 0 "TypeScript check passed"
else
    print_status 1 "TypeScript check failed"
    echo "   Run 'npm run check' for details"
fi

# 3. Run unit tests
echo ""
echo "3. Running unit tests..."
if npm run test > /dev/null 2>&1; then
    print_status 0 "Unit tests passed"
else
    print_status 1 "Unit tests failed"
    echo "   Run 'npm run test' for details"
fi

# 4. Check test coverage
echo ""
echo "4. Checking test coverage..."
if npm run test:coverage > /dev/null 2>&1; then
    # Check if coverage report exists
    if [ -d "coverage" ]; then
        print_status 0 "Coverage report generated"
        print_warning "Review coverage/index.html for detailed coverage"
    else
        print_warning "Coverage report not found"
    fi
else
    print_status 1 "Coverage check failed"
fi

# 5. Check Phase 3 verification report
echo ""
echo "5. Checking Phase 3 verification report..."
if [ -f "PHASE3_VERIFICATION_REPORT.md" ]; then
    print_status 0 "Phase 3 verification report exists"
else
    print_warning "Phase 3 verification report not found"
fi

echo ""
echo "=== Phase 4: UI/UX Verification ==="
echo ""

# 6. Check if Phase 4 components exist
echo "6. Checking Phase 4 component files..."
PHASE4_COMPONENTS=(
    "src/lib/components/ErrorDisplay.svelte"
    "src/lib/components/SkeletonLoader.svelte"
    "src/lib/components/results/DrugInfoCard.svelte"
    "src/lib/components/results/QuantityBreakdown.svelte"
    "src/lib/components/results/RecommendedNdc.svelte"
    "src/lib/components/results/AlternativeNdcs.svelte"
    "src/lib/components/results/WarningsSection.svelte"
    "src/lib/components/results/InactiveNdcsList.svelte"
    "src/lib/components/results/ResultsDisplay.svelte"
)

for file in "${PHASE4_COMPONENTS[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Component exists: $file"
    else
        print_status 1 "Component missing: $file"
    fi
done

# 7. Check Phase 4 testing summary
echo ""
echo "7. Checking Phase 4 testing summary..."
if [ -f "PHASE4_TESTING_SUMMARY.md" ]; then
    print_status 0 "Phase 4 testing summary exists"
else
    print_warning "Phase 4 testing summary not found"
fi

# 8. Check E2E tests
echo ""
echo "8. Checking E2E tests..."
if [ -d "src/tests/e2e" ] && [ "$(ls -A src/tests/e2e/*.test.ts 2>/dev/null)" ]; then
    E2E_COUNT=$(find src/tests/e2e -name "*.test.ts" | wc -l | tr -d ' ')
    print_status 0 "E2E tests found: $E2E_COUNT files"
    print_warning "Run 'npm run test:e2e' to execute E2E tests"
else
    print_status 1 "E2E tests not found"
fi

echo ""
echo "=== Phase 5: Testing & Deployment Verification ==="
echo ""

# 9. Check build
echo "9. Running build check..."
if npm run build > /dev/null 2>&1; then
    print_status 0 "Build succeeded"
    if [ -d ".svelte-kit" ] || [ -d "build" ]; then
        print_status 0 "Build output directory exists"
    else
        print_warning "Build output directory not found"
    fi
else
    print_status 1 "Build failed"
    echo "   Run 'npm run build' for details"
fi

# 10. Check integration tests
echo ""
echo "10. Checking integration tests..."
if [ -d "src/tests/integration" ] && [ "$(ls -A src/tests/integration/*.test.ts 2>/dev/null)" ]; then
    INTEGRATION_COUNT=$(find src/tests/integration -name "*.test.ts" | wc -l | tr -d ' ')
    print_status 0 "Integration tests found: $INTEGRATION_COUNT files"
else
    print_warning "Integration tests not found"
fi

# 11. Check documentation files
echo ""
echo "11. Checking documentation files..."
DOC_FILES=(
    "DECISIONS.md"
    "LIMITATIONS.md"
    "README.md"
)

for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Documentation exists: $file"
    else
        if [ "$file" = "DECISIONS.md" ] || [ "$file" = "LIMITATIONS.md" ]; then
            print_warning "Documentation missing: $file (Phase 5 requirement)"
        else
            print_warning "Documentation missing: $file"
        fi
    fi
done

# 12. Check Playwright configuration
echo ""
echo "12. Checking Playwright configuration..."
if [ -f "playwright.config.ts" ]; then
    print_status 0 "Playwright config exists"
else
    print_status 1 "Playwright config missing"
fi

# Summary
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All automated checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run E2E tests: npm run test:e2e"
    echo "2. Review coverage report: open coverage/index.html"
    echo "3. Manual review: See PHASES_3-5_VERIFICATION_PLAN.md"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review above.${NC}"
    exit 1
fi

