# Phase 5 Task List: Testing, Optimization & Deployment

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 5 - Testing, Optimization & Deployment  
**Duration:** Days 9-10  
**Status:** Pending  
**Reference:** [Phase 5 PRD](../PRDs/phase-5-testing-deployment.md)

---

## Overview

This task list breaks down Phase 5 into actionable, well-defined tasks. Each task includes specific requirements, deliverables, and acceptance criteria. Tasks should be completed in order, as they build upon each other. Start with unit test coverage (Task 1), then integration tests (Task 2), followed by E2E tests (Task 3), performance optimization (Task 4), deployment (Task 5), documentation (Task 6), and finally acceptance criteria validation (Task 7).

---

## Task 1: Complete Unit Test Coverage

**Priority:** P0 - Critical  
**Estimated Time:** 6-8 hours  
**Dependencies:** Phase 3 must be complete (all core components implemented)

### Description
Achieve ≥80% overall test coverage and ≥90% for critical components. Review existing unit tests, identify gaps, and write additional tests to meet coverage targets. Focus on edge cases, error handling, and boundary conditions.

### Requirements
- Overall coverage ≥80%
- Critical components ≥90% coverage
- All edge cases covered
- Error handling tested
- All tests passing
- Use Vitest framework
- Mock external dependencies

### Steps

1. **Review Current Test Coverage:**
   - Run `npm run test:coverage` to get current coverage report
   - Identify files with <80% coverage
   - Identify critical components with <90% coverage
   - Document coverage gaps

2. **Test Core Utilities (if gaps exist):**
   - `ndcNormalizer.ts` - Test all format variations (10-digit, 11-digit, with/without dashes)
   - `packageParser.ts` - Test all package description formats from Phase 0 test data
   - `unitConverter.ts` - Test unit conversions (if implemented)
   - Add edge cases: invalid formats, empty strings, null/undefined

3. **Test Business Logic Components (if gaps exist):**
   - `regexSigParser.ts` - Test all regex patterns, confidence scoring, edge cases
   - `openaiSigParser.ts` - Test error handling, response parsing, timeout scenarios
   - `sigParser.ts` - Test orchestrator logic, caching, fallback behavior
   - `quantityCalculator.ts` - Test calculation formula, unit handling, PRN medications
   - `ndcSelector.ts` - Test ranking algorithm, exact/near matches, multi-pack logic
   - `multiPackGenerator.ts` - Test combination logic, package count limits, edge cases
   - `warningGenerator.ts` - Test all warning types (inactive, overfill, underfill, dosage form)

4. **Test Service Components (if gaps exist):**
   - `rxnorm.ts` - Test API calls, error handling, retry logic, spelling suggestions
   - `fda.ts` - Test API calls, rate limiting, active status filtering
   - `openai.ts` - Test API calls, error handling, retry logic, response parsing
   - `cache.ts` - Test TTL expiration, LRU eviction, cache key generation

5. **Test Utility Components (if gaps exist):**
   - `requestDeduplicator.ts` - Test concurrent request handling, deduplication logic
   - `retry.ts` - Test retry logic, exponential backoff, error classification
   - `logger.ts` - Test log formatting, log levels, context handling

6. **Write Missing Tests:**
   - For each component with low coverage, write additional test cases
   - Focus on error paths, edge cases, boundary conditions
   - Use test data from Phase 0 (`test-data/` directory)
   - Mock external API calls using Vitest mocks

7. **Verify Coverage:**
   - Run coverage report again
   - Ensure ≥80% overall coverage
   - Ensure ≥90% for critical components (SIG parser, quantity calculator, NDC selector)
   - Fix any failing tests

8. **Document Test Coverage:**
   - Update test coverage report
   - Document any components that are difficult to test (with rationale)
   - Note any known limitations in test coverage

### Deliverables
- ✅ All unit tests written and passing
- ✅ Coverage ≥80% overall
- ✅ Critical components ≥90% coverage
- ✅ Edge cases covered
- ✅ Error handling tested
- ✅ Coverage report generated

### Acceptance Criteria
- [ ] Overall test coverage ≥80%
- [ ] Critical components (SIG parser, quantity calculator, NDC selector) ≥90% coverage
- [ ] All unit tests passing
- [ ] Edge cases covered (invalid inputs, null/undefined, boundary conditions)
- [ ] Error handling tested (API failures, timeouts, invalid responses)
- [ ] Mocking working correctly (external APIs, cache service)
- [ ] Coverage report shows no critical gaps

---

## Task 2: Complete Integration Tests

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Task 1 (unit tests should be passing), Phase 3 complete (API endpoints implemented)

### Description
Write comprehensive integration tests for API routes with mocked external services. Test the complete flow from API request to response, including error scenarios and edge cases.

### Requirements
- Test all API routes (`/api/calculate`, `/api/health`)
- Test happy path scenarios
- Test error scenarios (drug not found, no NDCs, SIG parse failure, invalid input)
- Test error handling (API timeouts, rate limits, network errors)
- Mock external API services
- Use real business logic
- Test cache integration

### Steps

1. **Review Existing Integration Tests:**
   - Check `tests/integration/calculate.test.ts`
   - Check `tests/integration/health.test.ts`
   - Check `tests/integration/services.test.ts`
   - Identify missing test scenarios

2. **Test Calculate Endpoint - Happy Path:**
   - Test valid inputs → successful response
   - Test response structure (all required fields present)
   - Test with different drug names (generic, brand)
   - Test with different SIG patterns
   - Test with different days' supply values
   - Verify recommended NDC is present
   - Verify alternatives are present (if applicable)
   - Verify warnings are present (if applicable)

3. **Test Calculate Endpoint - Error Scenarios:**
   - Test drug not found → error with spelling suggestions
   - Test no NDCs found → error message
   - Test SIG parse failure (both regex and AI) → error message
   - Test invalid input (missing fields, invalid types) → validation errors
   - Test invalid days' supply (negative, zero, >365) → validation errors

4. **Test Calculate Endpoint - Error Handling:**
   - Test API timeouts → retry logic, graceful error
   - Test rate limit errors → proper error message
   - Test invalid API responses → error handling
   - Test network errors → retry logic, graceful error
   - Test partial failures (one API fails, others succeed) → graceful degradation

5. **Test Health Check Endpoint:**
   - Test returns 200 OK
   - Test includes status information
   - Test response structure

6. **Test Cache Integration:**
   - Test cache hit scenarios (same request twice)
   - Test cache miss scenarios (new request)
   - Test cache expiration (TTL)
   - Test cache key generation

7. **Test Request Deduplication:**
   - Test concurrent identical requests → deduplicated
   - Test different requests → not deduplicated

8. **Write Integration Tests:**
   - Use Vitest with SvelteKit testing utilities
   - Mock all external API services (RxNorm, FDA, OpenAI)
   - Use real business logic (no mocking of core components)
   - Test error propagation through layers
   - Use test data from Phase 0

9. **Verify All Tests Pass:**
   - Run integration tests
   - Fix any failing tests
   - Ensure all scenarios covered

### Deliverables
- ✅ Integration tests written for all API routes
- ✅ Happy path scenarios tested
- ✅ Error scenarios tested
- ✅ Error handling tested
- ✅ Cache integration tested
- ✅ All integration tests passing

### Acceptance Criteria
- [ ] Calculate endpoint happy path tested
- [ ] Calculate endpoint error scenarios tested (drug not found, no NDCs, SIG parse failure, invalid input)
- [ ] Calculate endpoint error handling tested (timeouts, rate limits, network errors)
- [ ] Health check endpoint tested
- [ ] Cache integration tested
- [ ] Request deduplication tested
- [ ] All integration tests passing
- [ ] Mocking working correctly (external APIs mocked, business logic real)

---

## Task 3: Complete E2E Tests (Playwright)

**Priority:** P0 - Critical  
**Estimated Time:** 5-6 hours  
**Dependencies:** Task 2 (integration tests passing), Phase 4 complete (UI implemented)

### Description
Write comprehensive end-to-end tests using Playwright to test the complete user flow in a real browser environment. Test happy path, error handling, loading states, responsive design, and accessibility.

### Requirements
- Test complete user flow in browser
- Test on multiple browsers (Chromium, Firefox, WebKit)
- Test on mobile viewport
- Test happy path scenarios
- Test error handling UI
- Test loading states
- Test responsive design
- Test accessibility
- Screenshot on failure

### Steps

1. **Review Existing E2E Tests:**
   - Check `tests/e2e/ui-accessibility.test.ts`
   - Identify missing test scenarios
   - Verify Playwright is configured correctly

2. **Configure Playwright:**
   - Ensure `playwright.config.ts` exists and is configured
   - Configure browsers: Chromium, Firefox, WebKit
   - Configure mobile viewport
   - Configure screenshot on failure
   - Configure base URL (local dev server)

3. **Test Happy Path:**
   - Navigate to application
   - Enter drug name (e.g., "Lisinopril")
   - Enter SIG (e.g., "Take 1 tablet by mouth twice daily")
   - Enter days' supply (e.g., 30)
   - Submit form
   - Verify loading state shown (skeleton loaders)
   - Verify results displayed after loading
   - Verify drug information card shown
   - Verify quantity breakdown shown
   - Verify recommended NDC shown (highlighted)
   - Verify alternatives shown (if applicable)
   - Verify warnings shown (if applicable)

4. **Test Error Handling:**
   - Enter invalid drug name (e.g., "Lisinoprll")
   - Submit form
   - Verify error message shown
   - Verify spelling suggestions displayed
   - Click on spelling suggestion
   - Verify drug name pre-filled
   - Submit form again
   - Verify results displayed

5. **Test Loading States:**
   - Submit form with valid inputs
   - Verify skeleton loaders shown immediately
   - Verify form is disabled during loading
   - Verify results appear after loading completes
   - Verify loading state clears

6. **Test Responsive Design:**
   - Test desktop layout (1920x1080 viewport)
   - Test tablet layout (768x1024 viewport)
   - Test mobile layout (375x667 viewport)
   - Verify layout adapts correctly
   - Verify all elements visible and accessible
   - Verify no horizontal scrolling

7. **Test Accessibility:**
   - Test keyboard navigation (Tab, Enter, Escape)
   - Verify focus indicators visible
   - Verify ARIA labels present
   - Verify form labels associated with inputs
   - Verify error messages announced to screen readers
   - Test with screen reader (if possible)

8. **Test Edge Cases:**
   - Test with very long drug names
   - Test with very long SIG text
   - Test with maximum days' supply (365)
   - Test with minimum days' supply (1)
   - Test with special characters in inputs

9. **Write E2E Tests:**
   - Create test files in `tests/e2e/`:
     - `calculate-happy-path.test.ts` - Happy path scenarios
     - `calculate-errors.test.ts` - Error handling scenarios
     - `calculate-loading.test.ts` - Loading states
     - `calculate-responsive.test.ts` - Responsive design
     - `calculate-accessibility.test.ts` - Accessibility tests
   - Use Playwright best practices (wait for elements, use data-testid attributes)
   - Mock external APIs using Playwright route interception (optional, or use real APIs)

10. **Run Tests on All Browsers:**
    - Run tests on Chromium
    - Run tests on Firefox
    - Run tests on WebKit
    - Fix any browser-specific issues
    - Ensure all tests passing on all browsers

11. **Verify Screenshots:**
    - Trigger a test failure (temporarily)
    - Verify screenshot captured
    - Remove temporary failure

### Deliverables
- ✅ E2E tests written for all scenarios
- ✅ Happy path tested
- ✅ Error handling tested
- ✅ Loading states tested
- ✅ Responsive design tested
- ✅ Accessibility tested
- ✅ Tests passing on all browsers
- ✅ Screenshots on failure working

### Acceptance Criteria
- [ ] Happy path E2E test passing
- [ ] Error handling E2E test passing
- [ ] Loading states E2E test passing
- [ ] Responsive design E2E test passing
- [ ] Accessibility E2E test passing
- [ ] Tests passing on Chromium
- [ ] Tests passing on Firefox
- [ ] Tests passing on WebKit
- [ ] Tests passing on mobile viewport
- [ ] Screenshots captured on failure

---

## Task 4: Performance Testing & Optimization

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Tasks 1-3 (all tests passing), Phase 3 complete (business logic implemented)

### Description
Test application performance, identify bottlenecks, and optimize to meet performance targets (<2s P95 response time, ≥60% cache hit rate). Test load scenarios, cache performance, API performance, and frontend performance.

### Requirements
- Total request <2s (P95)
- Cache hit <100ms
- External APIs <1s each
- Cache hit rate ≥60%
- No memory leaks
- Concurrent requests working

### Steps

1. **Set Up Performance Testing:**
   - Create performance test script or use existing tools
   - Set up metrics collection (response times, cache hit rates, memory usage)
   - Define performance test scenarios

2. **Test Load Performance:**
   - Test with single request (baseline)
   - Test with 10 concurrent requests
   - Test with 50 concurrent requests
   - Test with 100 concurrent requests
   - Measure response times (P50, P95, P99)
   - Identify bottlenecks
   - Document results

3. **Test Cache Performance:**
   - Test cache hit scenarios (same request twice)
   - Measure cache hit response time (should be <100ms)
   - Test cache miss scenarios (new request)
   - Measure cache miss response time
   - Calculate cache hit rate (should be ≥60% with realistic usage)
   - Test TTL expiration
   - Test LRU eviction
   - Document cache performance

4. **Test API Performance:**
   - Measure RxNorm API response time (should be <1s)
   - Measure FDA API response time (should be <1s)
   - Measure OpenAI API response time (should be <1s, only when used)
   - Test parallel API calls (NDC fetch + SIG parse concurrently)
   - Verify request deduplication working
   - Document API performance

5. **Test Frontend Performance:**
   - Measure initial page load time
   - Measure render time for results
   - Test with large result sets (many alternatives)
   - Verify debouncing working (300ms on input fields)
   - Test lazy loading (if implemented)
   - Measure bundle size
   - Document frontend performance

6. **Identify Bottlenecks:**
   - Analyze performance test results
   - Identify slow components
   - Identify memory leaks (if any)
   - Document bottlenecks

7. **Optimize Backend:**
   - Optimize API call sequencing (ensure parallel calls where possible)
   - Optimize cache key generation (fast hashing)
   - Reduce unnecessary computations
   - Optimize database queries (if applicable)
   - Fix memory leaks (if any)

8. **Optimize Frontend:**
   - Optimize component rendering (reduce re-renders)
   - Lazy load heavy components
   - Optimize bundle size (code splitting, tree shaking)
   - Optimize images/assets (if any)
   - Fix memory leaks (if any)

9. **Optimize Caching:**
   - Verify cache hit rates ≥60% (adjust TTLs if needed)
   - Optimize cache key hashing (fast, collision-resistant)
   - Optimize cache storage (efficient data structures)

10. **Re-test Performance:**
    - Run performance tests again after optimizations
    - Verify performance targets met (<2s P95, ≥60% cache hit rate)
    - Document improvements

11. **Create Performance Report:**
    - Document baseline performance
    - Document optimized performance
    - Document improvements made
    - Document any remaining bottlenecks
    - Include recommendations for future optimization

### Deliverables
- ✅ Performance test results documented
- ✅ Bottlenecks identified
- ✅ Optimizations applied
- ✅ Performance targets met (<2s P95, ≥60% cache hit rate)
- ✅ Performance report created

### Acceptance Criteria
- [ ] Total request time <2s (P95)
- [ ] Cache hit response time <100ms
- [ ] External APIs <1s each
- [ ] Cache hit rate ≥60%
- [ ] No memory leaks detected
- [ ] Concurrent requests working correctly
- [ ] Performance report created
- [ ] Optimizations documented

---

## Task 5: Deployment to Render

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** Tasks 1-4 (all tests passing, performance optimized), Phase 4 complete (UI implemented)

### Description
Deploy the application to Render with proper configuration, environment variables, and health checks. Verify deployment is successful and application is accessible.

### Requirements
- Application deployed to Render
- Environment variables configured
- Health check working
- Application accessible via URL
- Build process working
- All endpoints working

### Steps

1. **Prepare for Deployment:**
   - Verify build process works locally (`npm run build`)
   - Verify start command works locally (`node build` or `npm start`)
   - Prepare environment variables list
   - Verify all dependencies are in `package.json`
   - Check for any hardcoded URLs or API keys

2. **Create Render Account (if needed):**
   - Sign up for Render account (if not already done)
   - Verify account is active

3. **Create Web Service on Render:**
   - Go to Render dashboard
   - Click "New" → "Web Service"
   - Connect GitHub repository (or deploy from Git)
   - Configure service:
     - Name: `ndc-calculator`
     - Runtime: Node.js
     - Build Command: `npm run build`
     - Start Command: `node build` (or `npm start`, verify correct command)
     - Region: Choose closest to users (Oregon, Frankfurt, Singapore, Ohio, Virginia)

4. **Configure Environment Variables:**
   - Add `OPENAI_API_KEY` - OpenAI API key (required)
   - Add `NODE_ENV=production` - Production environment
   - Add `RXNORM_API_KEY` (if required, usually not needed)
   - Add `FDA_API_KEY` (if required, usually not needed)
   - Verify all environment variables are set

5. **Configure Health Check:**
   - Set health check path: `/api/health`
   - Set expected status: 200
   - Set health check interval (default is fine)

6. **Deploy:**
   - Trigger deployment (manual or automatic from Git push)
   - Monitor deployment logs
   - Wait for deployment to complete
   - Verify build succeeded
   - Verify health check passes

7. **Post-Deployment Verification:**
   - Test deployed application URL
   - Test `/api/health` endpoint (should return 200)
   - Test `/api/calculate` endpoint with sample request
   - Verify all endpoints working
   - Check logs for errors
   - Test UI in browser
   - Verify environment variables are loaded correctly

8. **Monitor Deployment:**
   - Check Render logs for any errors
   - Monitor application performance
   - Verify no memory leaks
   - Verify no crashes

9. **Document Deployment:**
   - Document deployment URL
   - Document environment variables used
   - Document any deployment issues encountered
   - Document deployment process for future reference

### Deliverables
- ✅ Application deployed to Render
- ✅ Environment variables configured
- ✅ Health check passing
- ✅ Application accessible via URL
- ✅ All endpoints working
- ✅ Deployment documented

### Acceptance Criteria
- [ ] Application deployed to Render successfully
- [ ] Environment variables configured correctly
- [ ] Health check endpoint (`/api/health`) returns 200
- [ ] Calculate endpoint (`/api/calculate`) working
- [ ] UI accessible and working
- [ ] No errors in deployment logs
- [ ] Application URL documented

---

## Task 6: Documentation

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous tasks (application complete and deployed)

### Description
Create comprehensive documentation including DECISIONS.md (technical decisions), LIMITATIONS.md (known limitations), and update README.md (setup, development, deployment, API documentation).

### Requirements
- DECISIONS.md created with key technical decisions
- LIMITATIONS.md created with known limitations
- README.md updated with setup, development, deployment, API documentation
- All documentation accurate and complete

### Steps

1. **Create DECISIONS.md:**
   - Document why SvelteKit was chosen (full-stack framework, TypeScript support, performance)
   - Document caching strategy (in-memory for dev, Redis-ready for production, TTLs chosen)
   - Document SIG parsing approach (regex-first, AI fallback, confidence threshold 0.8)
   - Document NDC ranking algorithm (exact match priority, multi-pack support, overfill/underfill calculation)
   - Document error handling strategy (retry logic, exponential backoff, graceful degradation)
   - Document API integration decisions (RxNorm, FDA, OpenAI)
   - Document testing strategy (Vitest for unit/integration, Playwright for E2E)
   - Document deployment decisions (Render for initial, GCP for production)
   - Include rationale for each decision
   - Include alternatives considered
   - Include trade-offs

2. **Create LIMITATIONS.md:**
   - Document regex parser coverage (~80% of SIG patterns)
   - Document package description parsing edge cases (some formats may not parse correctly)
   - Document API rate limits (FDA: 240 req/min, RxNorm: no documented limit, OpenAI: usage-based)
   - Document missing FDA data handling (some NDCs may not have FDA data)
   - Document complex SIG patterns (may require AI fallback, which costs money)
   - Document NDC format variations (handled, but edge cases may exist)
   - Document unit conversion limitations (if any)
   - Document browser support (modern browsers only)
   - Document known edge cases not handled
   - Document future improvements planned
   - Document workarounds for limitations

3. **Update README.md:**
   - Add project description
   - Add setup instructions:
     - Prerequisites (Node.js ≥18.x, npm)
     - Installation steps (`npm install`)
     - Environment variables setup
     - Development server (`npm run dev`)
   - Add development guide:
     - Project structure
     - Running tests (`npm run test`, `npm run test:coverage`)
     - Running E2E tests (`npm run test:e2e`)
     - Code style (ESLint, Prettier)
     - TypeScript usage
   - Add deployment guide:
     - Render deployment steps
     - Environment variables configuration
     - Health check configuration
   - Add API documentation:
     - Calculate endpoint (`POST /api/calculate`)
     - Health check endpoint (`GET /api/health`)
     - Request/response formats
     - Error codes
   - Add testing documentation:
     - Unit tests (Vitest)
     - Integration tests (Vitest)
     - E2E tests (Playwright)
     - Coverage requirements
   - Add contributing guidelines (if applicable)
   - Add license information (if applicable)

4. **Review Documentation:**
   - Verify all documentation is accurate
   - Verify all code examples work
   - Verify all links work
   - Verify formatting is consistent
   - Fix any typos or errors

5. **Verify Documentation Completeness:**
   - DECISIONS.md covers all key decisions
   - LIMITATIONS.md covers all known limitations
   - README.md has all required sections
   - All documentation is up-to-date with current codebase

### Deliverables
- ✅ DECISIONS.md created
- ✅ LIMITATIONS.md created
- ✅ README.md updated
- ✅ All documentation accurate and complete

### Acceptance Criteria
- [ ] DECISIONS.md created with all key technical decisions
- [ ] LIMITATIONS.md created with all known limitations
- [ ] README.md updated with setup, development, deployment, API documentation
- [ ] All documentation accurate and matches current codebase
- [ ] All code examples in documentation work
- [ ] All links in documentation work

---

## Task 7: Acceptance Criteria Validation

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous tasks (application complete, tested, deployed, documented)

### Description
Systematically validate all 10 P0 acceptance criteria from the main PRD. Create a validation checklist, test each criterion, document results, and create a validation report.

### Requirements
- All 10 P0 acceptance criteria validated
- Test results documented
- Validation report created
- All criteria passing

### Steps

1. **Create Acceptance Criteria Checklist:**
   - List all 10 P0 acceptance criteria from main PRD
   - Create test scenarios for each criterion
   - Define success criteria for each test

2. **Validate AC-1: Drug Normalization**
   - Test: Enter drug name → Get RxCUI
   - Test: Enter NDC → Get RxCUI
   - Test: Handle drug not found → Show spelling suggestions
   - Test: Handle multiple matches → Present options
   - Test: Cache results for 7 days
   - Document results

3. **Validate AC-2: NDC Retrieval**
   - Test: Get NDCs from RxNorm for RxCUI
   - Test: Fetch FDA details for each NDC
   - Test: Filter inactive NDCs
   - Test: Parse package sizes from descriptions
   - Test: Normalize NDC formats
   - Test: Cache results for 24 hours
   - Document results

4. **Validate AC-3: SIG Parsing**
   - Test: Regex parser handles common patterns
   - Test: Confidence check (threshold 0.8)
   - Test: AI parsing fallback when confidence < 0.8
   - Test: Validate parsed output (dosage > 0, frequency > 0)
   - Test: Cache parsed SIG for 30 days
   - Document results

5. **Validate AC-4: Quantity Calculation**
   - Test: Calculate correctly: (dosage × frequency) × daysSupply
   - Test: Handle different units (tablets, capsules, mL, units)
   - Test: Handle PRN medications
   - Test: Handle fractional dosages
   - Document results

6. **Validate AC-5: NDC Selection**
   - Test: Recommend optimal NDC
   - Test: Prioritize exact matches
   - Test: Generate multi-pack options
   - Test: Calculate overfill/underfill amounts
   - Test: Return top 3-5 recommendations
   - Document results

7. **Validate AC-6: Warnings**
   - Test: Flag inactive NDCs (error severity)
   - Test: Highlight overfills >10% (warning severity)
   - Test: Highlight underfills (warning severity)
   - Test: Warn dosage form mismatches (warning severity)
   - Test: Warnings displayed in UI
   - Document results

8. **Validate AC-7: Response Format**
   - Test: Structured JSON response
   - Test: All required fields present
   - Test: UI displays results correctly
   - Test: Consistent error format
   - Document results

9. **Validate AC-8: Performance**
   - Test: Response time <2s (P95)
   - Test: Cache hit rate ≥60%
   - Test: No memory leaks
   - Test: Concurrent requests working
   - Document results

10. **Validate AC-9: Error Handling**
    - Test: All error scenarios handled (drug not found, no NDCs, SIG parse failure, API errors)
    - Test: User-friendly error messages
    - Test: No crashes (graceful error handling)
    - Test: Graceful degradation (partial failures)
    - Document results

11. **Validate AC-10: Testing**
    - Test: Unit coverage ≥80%
    - Test: Integration tests passing
    - Test: E2E tests passing
    - Test: All acceptance criteria tested
    - Document results

12. **Create Validation Report:**
    - Document validation results for each AC
    - Include test scenarios used
    - Include test results (pass/fail)
    - Include screenshots or evidence (if applicable)
    - Include any issues found
    - Include recommendations

13. **Fix Any Issues:**
    - If any AC fails validation, fix the issue
    - Re-test the AC
    - Update validation report

14. **Final Validation:**
    - Verify all 10 ACs pass validation
    - Verify validation report is complete
    - Verify all test results documented

### Deliverables
- ✅ Acceptance criteria checklist created
- ✅ All 10 P0 acceptance criteria validated
- ✅ Test results documented
- ✅ Validation report created
- ✅ All criteria passing

### Acceptance Criteria
- [ ] AC-1: Drug Normalization validated
- [ ] AC-2: NDC Retrieval validated
- [ ] AC-3: SIG Parsing validated
- [ ] AC-4: Quantity Calculation validated
- [ ] AC-5: NDC Selection validated
- [ ] AC-6: Warnings validated
- [ ] AC-7: Response Format validated
- [ ] AC-8: Performance validated
- [ ] AC-9: Error Handling validated
- [ ] AC-10: Testing validated
- [ ] Validation report created
- [ ] All criteria passing

---

## Summary

Phase 5 consists of 7 main tasks that must be completed to ensure the application is fully tested, optimized, deployed, and validated. The tasks should be completed in order, as they build upon each other. All tasks are P0 (critical) and must be completed before the project is considered complete.

**Key Deliverables:**
1. Unit tests with ≥80% coverage
2. Integration tests for all API routes
3. E2E tests for complete user flow
4. Performance optimizations meeting targets
5. Application deployed to Render
6. Complete documentation (DECISIONS.md, LIMITATIONS.md, README.md)
7. All acceptance criteria validated

**Success Criteria:**
- ✅ All tests passing (unit, integration, E2E)
- ✅ Test coverage ≥80% overall, ≥90% for critical components
- ✅ Performance targets met (<2s P95, ≥60% cache hit rate)
- ✅ Application deployed and accessible
- ✅ Documentation complete and accurate
- ✅ All 10 P0 acceptance criteria validated

---

**Document Owner:** Development Team  
**Last Updated:** Phase 5 Task List Creation  
**Status:** Pending

