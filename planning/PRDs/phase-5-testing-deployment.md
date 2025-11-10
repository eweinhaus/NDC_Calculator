# Phase 5 PRD: Testing, Optimization & Deployment

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 5 - Testing, Optimization & Deployment  
**Duration:** Days 9-10  
**Status:** Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 5 focuses on comprehensive testing, performance optimization, and deployment to production. This phase ensures the application is robust, performant, and ready for real-world use. All acceptance criteria from the main PRD must be validated, and the application must be deployed to Render with proper monitoring.

**Key Deliverables:**
- Unit tests (≥80% coverage)
- Integration tests
- E2E tests (Playwright)
- Performance testing and optimization
- Deployment to Render
- Documentation (DECISIONS.md, limitations)

---

## Objectives

1. **Testing:** Achieve comprehensive test coverage (unit, integration, E2E)
2. **Performance:** Optimize for <2s response time (P95)
3. **Deployment:** Deploy to Render with proper configuration
4. **Documentation:** Document technical decisions and limitations
5. **Validation:** Verify all acceptance criteria met

---

## Tasks

### Task 1: Unit Tests

**Target Coverage:** ≥80% overall, ≥90% for critical components

**Components to Test:**

1. **Core Utilities:**
   - `ndcNormalizer.ts` - All format variations
   - `packageParser.ts` - All package description formats
   - `unitConverter.ts` - Unit conversions (if implemented)

2. **Business Logic:**
   - `regexSigParser.ts` - All regex patterns
   - `openaiSigParser.ts` - Error handling, response parsing
   - `sigParser.ts` - Orchestrator logic
   - `quantityCalculator.ts` - Calculation formula
   - `ndcSelector.ts` - Ranking algorithm
   - `multiPackGenerator.ts` - Combination logic
   - `warningGenerator.ts` - All warning types

3. **Services:**
   - `rxnorm.ts` - API calls, error handling
   - `fda.ts` - API calls, rate limiting
   - `openai.ts` - API calls, error handling
   - `cache.ts` - TTL, LRU eviction

4. **Utils:**
   - `requestDeduplicator.ts` - Concurrent request handling
   - `retry.ts` - Retry logic, exponential backoff
   - `logger.ts` - Log formatting

**Test Framework:** Vitest

**Test Structure:** tests/unit/ with subdirectories: core/, services/, utils/

**Mocking:**
- Mock external API calls
- Mock cache service
- Use test data from Phase 0

**Deliverables:**
- All unit tests written
- Coverage ≥80% overall
- Critical components ≥90%
- All tests passing

---

### Task 2: Integration Tests

**Purpose:** Test API routes with mocked services

**Tests to Write:**

1. **Calculate Endpoint:**
   - Happy path: Valid inputs → successful response
   - Drug not found: Error with suggestions
   - No NDCs: Error message
   - SIG parse failure: Error message
   - Invalid input: Validation errors

2. **Health Check Endpoint:**
   - Returns 200 OK
   - Includes status information

3. **Error Handling:**
   - API timeouts
   - Rate limit errors
   - Invalid responses
   - Network errors

**Test Framework:** Vitest with SvelteKit testing utilities

**Mocking Strategy:**
- Mock all external API services
- Use real business logic
- Test cache integration
- Test error propagation

**Test Structure:** tests/integration/ with api/ and services/ subdirectories

**Deliverables:**
- Integration tests written
- All scenarios covered
- Tests passing
- Mocking working correctly

---

### Task 3: E2E Tests (Playwright)

**Purpose:** Test complete user flow in browser

**Test Scenarios:**

1. **Happy Path:**
   - Enter drug name, SIG, days' supply
   - Submit form
   - Verify results displayed
   - Verify recommended NDC shown
   - Verify warnings displayed (if any)

2. **Error Handling:**
   - Enter invalid drug name
   - Verify error message shown
   - Verify spelling suggestions displayed
   - Click suggestion, verify pre-fill

3. **Loading States:**
   - Submit form
   - Verify skeleton loaders shown
   - Verify results appear after loading

4. **Responsive Design:**
   - Test desktop layout
   - Test mobile layout (viewport resize)
   - Verify responsive behavior

5. **Accessibility:**
   - Test keyboard navigation
   - Verify focus indicators
   - Test with screen reader (if possible)

**Test Framework:** Playwright

**Configuration:**
- Test on Chromium, Firefox, WebKit
- Test on mobile viewport
- Screenshot on failure

**Test Structure:** tests/e2e/ with calculate, errors, loading, responsive specs

**Deliverables:**
- E2E tests written
- All scenarios covered
- Tests passing on all browsers
- Screenshots on failure

---

### Task 4: Performance Testing & Optimization

**Performance Targets:**
- Total request: <2s (P95)
- Cache hit: <100ms
- External APIs: <1s each

**Testing:**

1. **Load Testing:**
   - Test with concurrent requests
   - Measure response times
   - Identify bottlenecks

2. **Cache Performance:**
   - Measure cache hit rates
   - Verify TTL expiration
   - Test LRU eviction

3. **API Performance:**
   - Measure external API response times
   - Test parallel API calls
   - Verify request deduplication

4. **Frontend Performance:**
   - Measure render times
   - Test with large result sets
   - Verify debouncing working

**Optimization:**

1. **Backend:**
   - Optimize API call sequencing
   - Ensure parallel calls where possible
   - Optimize cache key generation
   - Reduce unnecessary computations

2. **Frontend:**
   - Optimize component rendering
   - Reduce re-renders
   - Lazy load heavy components
   - Optimize bundle size

3. **Caching:**
   - Verify cache hit rates ≥60%
   - Adjust TTLs if needed
   - Optimize cache key hashing

**Deliverables:**
- Performance test results
- Optimizations applied
- Performance targets met
- Performance report

---

### Task 5: Deployment to Render

**Prerequisites:**
- Render account created
- Environment variables prepared
- Build process verified locally

**Deployment Steps:**

1. **Create Web Service:**
   - Name: `ndc-calculator`
   - Runtime: Node.js
   - Build Command: `npm run build`
   - Start Command: `node build`

2. **Configure Environment Variables:**
   - `OPENAI_API_KEY` - OpenAI API key
   - `NODE_ENV=production`
   - `RXNORM_API_KEY` (if required)
   - `FDA_API_KEY` (if required)

3. **Configure Health Check:**
   - Path: `/api/health`
   - Expected status: 200

4. **Deploy:**
   - Connect GitHub repository
   - Deploy from main branch
   - Monitor deployment logs
   - Verify health check passes

5. **Post-Deployment:**
   - Test deployed application
   - Verify all endpoints working
   - Check logs for errors
   - Monitor performance

**Deliverables:**
- Application deployed to Render
- Environment variables configured
- Health check passing
- Application accessible via URL

---

### Task 6: Documentation

**Files to Create:**

1. **DECISIONS.md:**
   - Key technical decisions
   - Rationale for choices
   - Alternatives considered
   - Trade-offs

2. **LIMITATIONS.md:**
   - Known limitations
   - Edge cases not handled
   - Future improvements
   - Workarounds

3. **README.md Updates:**
   - Setup instructions
   - Development guide
   - Deployment guide
   - API documentation

**DECISIONS.md Topics:**
- Why SvelteKit?
- Caching strategy (in-memory vs Redis)
- SIG parsing approach (regex + AI)
- NDC ranking algorithm
- Error handling strategy

**LIMITATIONS.md Topics:**
- Regex parser coverage (~80%)
- Package description parsing edge cases
- API rate limits
- Missing FDA data handling
- Complex SIG patterns

**Deliverables:**
- DECISIONS.md created
- LIMITATIONS.md created
- README.md updated
- Documentation complete

---

### Task 7: Acceptance Criteria Validation

**Validate All P0 Acceptance Criteria:**

**AC-1: Drug Normalization** - Enter drug/NDC → Get RxCUI → Handle not found → Handle multiple matches → Cache 7d

**AC-2: NDC Retrieval** - Get NDCs from RxNorm → Fetch FDA details → Filter inactive → Parse package sizes → Normalize → Cache 24h

**AC-3: SIG Parsing** - Regex parser → Confidence check → AI parsing (if needed) → Validate → Cache 30d

**AC-4: Quantity Calculation** - Calculate correctly → Handle units → Formula: (dosage × frequency) × daysSupply

**AC-5: NDC Selection** - Recommend optimal → Prioritize exact → Multi-pack options → Calculate overfill/underfill → Top 3-5

**AC-6: Warnings** - Flag inactive NDCs → Highlight overfills (>10%) → Highlight underfills → Warn dosage form mismatches

**AC-7: Response Format** - Structured JSON → All fields present → UI displays correctly → Consistent errors

**AC-8: Performance** - Response <2s (P95) → Cache hit ≥60% → No memory leaks → Concurrent requests

**AC-9: Error Handling** - All scenarios handled → User-friendly messages → No crashes → Graceful degradation

**AC-10: Testing** - Unit coverage ≥80% → Integration tests pass → E2E tests pass → All AC tested

**Deliverables:**
- Acceptance criteria checklist
- All criteria validated
- Test results documented
- Validation report

---

## Deliverables Summary

1. **Testing:**
   - Unit tests (≥80% coverage)
   - Integration tests
   - E2E tests (Playwright)

2. **Performance:**
   - Performance testing complete
   - Optimizations applied
   - Targets met

3. **Deployment:**
   - Deployed to Render
   - Environment variables configured
   - Health check working

4. **Documentation:**
   - DECISIONS.md
   - LIMITATIONS.md
   - README.md updated

5. **Validation:**
   - All acceptance criteria validated
   - Test results documented

---

## Acceptance Criteria

**AC-5.1: Unit Tests Complete**
- Coverage ≥80% overall
- Critical components ≥90%
- All tests passing
- Edge cases covered

**AC-5.2: Integration Tests Complete**
- All API routes tested
- Error scenarios covered
- Mocking working correctly
- Tests passing

**AC-5.3: E2E Tests Complete**
- Happy path tested
- Error handling tested
- Loading states tested
- Responsive design tested
- Tests passing on all browsers

**AC-5.4: Performance Targets Met**
- Response time <2s (P95)
- Cache hit rate ≥60%
- No memory leaks
- Concurrent requests working

**AC-5.5: Deployment Complete**
- Application deployed to Render
- Environment variables configured
- Health check passing
- Application accessible

**AC-5.6: Documentation Complete**
- DECISIONS.md created
- LIMITATIONS.md created
- README.md updated
- All documentation accurate

**AC-5.7: Acceptance Criteria Validated**
- All P0 criteria validated
- Test results documented
- Validation report created

---

## Dependencies

**Prerequisites:**
- Phase 4 completed (UI)
- Phase 3 completed (business logic)
- Phase 2 completed (API services)
- Phase 1 completed (foundation)
- Phase 0 completed (API research)

**External:**
- Render account
- OpenAI API key
- GitHub repository (for deployment)

---

## Risks & Considerations

**Risk 1: Test Coverage < 80%**
- **Impact:** Medium - May miss edge cases
- **Mitigation:** Focus on critical components first
- **Contingency:** Extend testing timeline if needed

**Risk 2: Performance Targets Not Met**
- **Impact:** Medium - May need optimization
- **Mitigation:** Test early, optimize iteratively
- **Contingency:** Adjust targets or optimize further

**Risk 3: Deployment Issues**
- **Impact:** Low - Can debug and redeploy
- **Mitigation:** Test build locally first
- **Contingency:** Debug deployment logs

**Risk 4: Missing Acceptance Criteria**
- **Impact:** High - Project incomplete
- **Mitigation:** Review all criteria early
- **Contingency:** Extend timeline to complete

---

## Success Metrics

- ✅ Unit test coverage ≥80%
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Performance targets met
- ✅ Application deployed successfully
- ✅ All acceptance criteria validated
- ✅ Documentation complete
- ✅ Ready for production use

---

## Next Steps

Upon completion of Phase 5:
1. Review all deliverables
2. Conduct final QA testing
3. Gather user feedback (if possible)
4. Plan production improvements
5. Monitor application performance
6. Address any post-deployment issues

---

**Document Owner:** Development Team  
**Last Updated:** Phase 5 Start  
**Status:** Development

