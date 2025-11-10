# Verification Action Plan: Phases 3-5

**Quick Reference Guide for Testing and Verification**

---

## 🎯 What Can Be Automated (AI Can Do)

### ✅ Fully Automated Tasks

1. **Unit Test Execution & Coverage**
   ```bash
   npm run test:coverage
   ```
   - Run all unit tests
   - Generate coverage report
   - Identify coverage gaps
   - Verify ≥80% overall, ≥90% critical

2. **Integration Test Execution**
   ```bash
   npm run test
   ```
   - Run all integration tests
   - Verify API endpoints
   - Test error scenarios

3. **E2E Test Execution (Playwright)**
   ```bash
   npm run test:e2e
   ```
   - Run browser-based E2E tests
   - Test on multiple browsers
   - Test responsive design
   - Test accessibility
   - Capture screenshots on failure

4. **TypeScript Type Checking**
   ```bash
   npm run check
   ```
   - Verify type safety
   - Find type errors

5. **Build Verification**
   ```bash
   npm run build
   ```
   - Verify build succeeds
   - Check for build errors

6. **File Existence Checks**
   - Verify all required files exist
   - Check component structure
   - Verify test files

7. **Automated Verification Script**
   ```bash
   ./scripts/verify-phases-3-5.sh
   ```
   - Run comprehensive automated checks
   - Generate verification report

### 🤖 AI-Assisted Tasks (Can Be Done with Tools)

1. **Playwright MCP Testing**
   - Real browser automation
   - Multi-browser testing
   - Mobile viewport testing
   - Screenshot comparison
   - Network throttling

2. **Cursor Browser Extension Testing**
   - Interactive UI testing
   - Form validation testing
   - Error scenario testing
   - Visual inspection

3. **Performance Testing**
   - Response time measurement
   - Cache hit rate calculation
   - Concurrent request testing
   - Memory usage monitoring

4. **Accessibility Testing**
   - Automated accessibility scans
   - Keyboard navigation testing
   - ARIA label verification
   - Screen reader compatibility

---

## 👤 What Needs Manual Review

### ⚠️ Human Review Required

1. **Code Quality Review**
   - Algorithm correctness
   - Error handling patterns
   - Code organization
   - Best practices compliance

2. **Documentation Review**
   - DECISIONS.md accuracy
   - LIMITATIONS.md completeness
   - README.md clarity
   - Code comments quality

3. **Visual Design Review**
   - Color scheme
   - Spacing and layout
   - Typography
   - Visual hierarchy

4. **User Experience Review**
   - User flow evaluation
   - Error message clarity
   - Loading state UX
   - Overall usability

5. **Deployment Configuration Review**
   - Render configuration
   - Environment variables
   - Health check setup
   - Security settings

---

## 📋 Step-by-Step Verification Process

### Step 1: Run Automated Verification (5 minutes)

```bash
# Run the automated verification script
./scripts/verify-phases-3-5.sh

# Or run individual checks:
npm run test:coverage    # Unit test coverage
npm run test             # All tests
npm run test:e2e         # E2E tests
npm run check            # TypeScript check
npm run build            # Build verification
```

**Expected Output:**
- ✅ All Phase 3 files exist
- ✅ All Phase 4 components exist
- ✅ Tests passing
- ✅ Build succeeds
- ⚠️ Warnings for missing documentation (if Phase 5 incomplete)

### Step 2: Review Test Coverage (10 minutes)

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/index.html  # macOS
# or
xdg-open coverage/index.html  # Linux
```

**Check:**
- Overall coverage ≥80%
- Critical components ≥90%
- Identify files with low coverage
- Note any missing tests

### Step 3: Run E2E Tests with Playwright (15 minutes)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run mobile tests
npx playwright test --project="Mobile Chrome"
```

**Verify:**
- Happy path works
- Error handling works
- Loading states work
- Responsive design works
- Accessibility works

### Step 4: Interactive Browser Testing (10 minutes)

**Using Cursor Browser Extension:**
1. Navigate to `http://localhost:5173`
2. Test form submission
3. Test error scenarios
4. Test keyboard navigation
5. Test responsive design (resize browser)
6. Verify copy to clipboard

**Test Scenarios:**
- ✅ Valid input → Results displayed
- ✅ Invalid drug name → Error with suggestions
- ✅ Empty form → Validation errors
- ✅ Network error → Error message with retry
- ✅ Loading states → Skeleton loaders appear

### Step 5: Performance Testing (15 minutes)

**Create Performance Test Script:**
```typescript
// scripts/performance-test.ts
// Test response times, cache hit rates, concurrent requests
```

**Or Manual Testing:**
1. Open browser DevTools
2. Go to Network tab
3. Submit form
4. Measure response time
5. Check cache headers
6. Test with throttling (slow 3G)

**Targets:**
- Response time <2s (P95)
- Cache hit rate ≥60%
- No memory leaks

### Step 6: Accessibility Testing (10 minutes)

**Automated:**
```bash
# Run Playwright accessibility tests
npx playwright test --grep "accessibility"

# Or use axe-core
npm install -D @axe-core/playwright
```

**Manual:**
1. Test keyboard navigation (Tab, Enter, Escape)
2. Test with screen reader (if available)
3. Verify focus indicators
4. Verify ARIA labels
5. Test high contrast mode

### Step 7: Deployment Verification (10 minutes)

**If Deployed to Render:**
1. Visit deployed URL
2. Test health check: `/api/health`
3. Test calculate endpoint: `/api/calculate`
4. Test UI in production
5. Check Render logs
6. Verify environment variables

**If Not Deployed:**
- Follow Phase 5 Task 5: Deployment to Render

### Step 8: Documentation Review (15 minutes)

**Check:**
- [ ] DECISIONS.md exists and complete
- [ ] LIMITATIONS.md exists and complete
- [ ] README.md updated with:
  - Setup instructions
  - Development guide
  - Deployment guide
  - API documentation

**Review:**
- Accuracy of documentation
- Completeness of information
- Code examples work
- Links work

### Step 9: Acceptance Criteria Validation (20 minutes)

**Validate All 10 P0 Acceptance Criteria:**

1. **AC-1: Drug Normalization**
   - Test: Enter drug name → Get RxCUI
   - Test: Handle not found → Suggestions
   - Test: Cache 7 days

2. **AC-2: NDC Retrieval**
   - Test: Get NDCs from RxNorm
   - Test: Fetch FDA details
   - Test: Filter inactive NDCs
   - Test: Cache 24 hours

3. **AC-3: SIG Parsing**
   - Test: Regex parser works
   - Test: AI fallback works
   - Test: Cache 30 days

4. **AC-4: Quantity Calculation**
   - Test: Formula correct
   - Test: Units handled
   - Test: PRN medications

5. **AC-5: NDC Selection**
   - Test: Optimal NDC recommended
   - Test: Multi-pack options
   - Test: Top 3-5 results

6. **AC-6: Warnings**
   - Test: Inactive NDCs flagged
   - Test: Overfills >10% highlighted
   - Test: Underfills highlighted
   - Test: Dosage form mismatches

7. **AC-7: Response Format**
   - Test: Structured JSON
   - Test: All fields present
   - Test: UI displays correctly

8. **AC-8: Performance**
   - Test: Response <2s (P95)
   - Test: Cache hit ≥60%
   - Test: No memory leaks
   - Test: Concurrent requests

9. **AC-9: Error Handling**
   - Test: All scenarios handled
   - Test: User-friendly messages
   - Test: No crashes
   - Test: Graceful degradation

10. **AC-10: Testing**
    - Test: Coverage ≥80%
    - Test: Integration tests pass
    - Test: E2E tests pass
    - Test: All AC tested

---

## 🛠️ Tools & Commands Reference

### Testing Commands

```bash
# Unit tests
npm run test                  # Run all tests
npm run test:coverage         # Coverage report
npm run test:ui               # Test UI

# E2E tests
npm run test:e2e              # Run E2E tests
npm run test:e2e:ui           # E2E with UI
npx playwright test           # Direct Playwright

# Type checking
npm run check                 # TypeScript check

# Build
npm run build                 # Build verification
npm run preview               # Preview build
```

### Playwright Commands

```bash
# Run specific test
npx playwright test calculate-happy-path

# Run on specific browser
npx playwright test --project=chromium

# Run with UI
npx playwright test --ui

# Generate code
npx playwright codegen http://localhost:5173

# Show report
npx playwright show-report
```

### Coverage Commands

```bash
# Generate coverage
npm run test:coverage

# View coverage
open coverage/index.html      # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html     # Windows
```

---

## 📊 Verification Checklist

### Phase 3: Business Logic ✅
- [x] All 7 acceptance criteria met (PHASE3_VERIFICATION_REPORT.md)
- [x] All unit tests passing (82+ tests)
- [x] All integration tests passing (5 tests)
- [x] Code quality verified

### Phase 4: UI/UX ✅
- [x] All 8 acceptance criteria met (PHASE4_TESTING_SUMMARY.md)
- [x] UI components functional
- [x] Responsive design working
- [x] Accessibility features implemented

### Phase 5: Testing & Deployment ⚠️
- [ ] Unit test coverage ≥80% overall, ≥90% critical
- [ ] All integration tests passing
- [ ] All E2E tests passing (enhanced)
- [ ] Performance targets met (<2s P95, ≥60% cache hit)
- [ ] Application deployed to Render
- [ ] Documentation complete (DECISIONS.md, LIMITATIONS.md)
- [ ] All 10 P0 acceptance criteria validated

---

## 🚀 Quick Start

**Run Everything:**
```bash
# 1. Automated verification
./scripts/verify-phases-3-5.sh

# 2. Test coverage
npm run test:coverage

# 3. E2E tests
npm run test:e2e

# 4. Build check
npm run build
```

**Then:**
- Review coverage report
- Review E2E test results
- Manual browser testing
- Documentation review
- Acceptance criteria validation

---

## 📝 Next Steps

1. **Run Automated Verification**
   ```bash
   ./scripts/verify-phases-3-5.sh
   ```

2. **Review Results**
   - Check passed/failed/warnings
   - Address any failures
   - Note warnings

3. **Enhance E2E Tests** (if needed)
   - Use Playwright MCP
   - Add missing scenarios
   - Test on all browsers

4. **Performance Testing**
   - Create performance test script
   - Test response times
   - Test cache hit rates

5. **Deployment** (if not done)
   - Deploy to Render
   - Verify deployment
   - Test deployed application

6. **Documentation**
   - Create DECISIONS.md
   - Create LIMITATIONS.md
   - Update README.md

7. **Final Validation**
   - Validate all 10 P0 acceptance criteria
   - Create validation report
   - Mark Phase 5 complete

---

**Last Updated:** 2025-01-27  
**Status:** Action Plan Ready

