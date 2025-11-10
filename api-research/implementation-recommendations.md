# Implementation Recommendations - Phase 0

**Phase:** 0 - API Research & Validation  
**Date:** Phase 0 Completion  
**Purpose:** Actionable recommendations for Phase 1-5 implementation

---

## Overview

This document provides specific, actionable recommendations for implementing the NDC Calculator based on Phase 0 research findings. Recommendations are organized by implementation phase.

---

## Phase 1: Foundation & Core Utilities

### 1. NDC Normalizer Utility

**Recommendation:** Implement comprehensive NDC normalization with validation.

**Requirements:**
- Handle all format variations (10-digit, 11-digit, with/without dashes)
- Pad leading zeros for labeler codes
- Pad package codes (1-digit → 2-digit)
- Validate normalized format
- Return errors for invalid formats

**Implementation:**
- See `api-research/ndc-normalization.md` for algorithm
- Use test cases from `test-data/ndc-normalization-test-cases.json`
- Return normalized format: `XXXXX-XXXX-XX`

**Priority:** High - Required for all NDC operations

---

### 2. Package Description Parser

**Recommendation:** Implement regex-first parser with AI fallback.

**Requirements:**
- Handle 30+ format variations (see `test-data/package-descriptions.json`)
- Extract quantity and unit from descriptions
- Handle decimal quantities (87.1 g)
- Handle multi-pack formats ("1 BLISTER PACK / 21 TABLET")
- Return structured result: `{quantity: number, unit: string}`

**Implementation:**
- Start with regex patterns for common formats:
  - Simple: `"(\d+) TABLET in 1 BOTTLE"`
  - With dosage form: `"(\d+) TABLET, [A-Z ]+ in 1 BOTTLE"`
  - Multi-pack: Parse both quantities and multiply
- Use AI fallback for complex formats (Phase 3)
- Test with all samples from `test-data/package-descriptions.json`

**Priority:** High - Required for quantity calculation

---

## Phase 2: API Integration & Caching

### 1. RxNorm Service

**Recommendation:** Implement RxNorm service with JSON format support.

**Requirements:**
- Always append `.json` extension to endpoints
- Handle empty responses gracefully
- Implement spelling suggestions for errors
- Cache RxCUI lookups (7 days TTL)

**Endpoints:**
- `GET /rxcui.json?name={drugName}` - Drug name to RxCUI
- `GET /spellingsuggestions.json?name={drugName}` - Spelling suggestions
- **Do NOT use:** `/rxcui/{rxcui}/allndcs.json` (unreliable)

**Error Handling:**
- Empty `idGroup` → Return "drug not found" with spelling suggestions
- Network errors → Retry with exponential backoff
- Timeout → 10 seconds

**Priority:** High - Required for drug normalization

---

### 2. FDA Service

**Recommendation:** Implement FDA service as primary source for NDC data.

**Requirements:**
- Use `search=openfda.rxcui:{rxcui}` for NDC retrieval (not RxNorm)
- Implement rate limiting: 250ms delay between requests (240 req/min)
- Cache NDC details (24 hours TTL)
- Handle active/inactive status via `listing_expiration_date`

**Endpoints:**
- `GET /drug/ndc.json?search=openfda.rxcui:{rxcui}&limit=100` - Get NDCs by RxCUI
- `GET /drug/ndc.json?search=product_ndc:{ndc}&limit=100` - Get packages for NDC

**Key Fields:**
- `packaging[].description` - Package description (parse for quantity)
- `listing_expiration_date` - Active status (YYYYMMDD format)
- `openfda.rxcui` - RxCUI mapping
- `active_ingredients[].strength` - Strength information

**Error Handling:**
- Rate limit errors → Exponential backoff retry
- NOT_FOUND → Return empty results
- Network errors → Retry with exponential backoff

**Priority:** High - Primary source for NDC data

---

### 3. Cache Service

**Recommendation:** Implement aggressive caching with appropriate TTLs.

**TTL Values:**
- RxNorm (drug → RxCUI): 7 days
- FDA (NDC details): 24 hours
- SIG Parsing: 30 days (Phase 3)

**Implementation:**
- Development: In-memory Map with LRU eviction (max 1000 entries)
- Production: Redis (Render free tier or upgrade)
- Cache keys: Hashed normalized inputs

**Priority:** High - Required for performance

---

### 4. Request Deduplication

**Recommendation:** Implement request deduplication to prevent duplicate API calls.

**Requirements:**
- Coalesce identical concurrent requests
- Return same promise for duplicate requests
- Clear deduplication map after request completes

**Priority:** Medium - Performance optimization

---

## Phase 3: Core Business Logic

### 1. SIG Parser

**Recommendation:** Implement regex-first parser with OpenAI fallback.

**Requirements:**
- Primary: Regex patterns for common formats (80%+ of cases)
- Fallback: OpenAI API when confidence < 0.8
- Extract: dosage, frequency, unit, confidence
- Cache parsed results (30 days TTL)

**Regex Patterns:**
- Simple: `"Take (\d+) tablet(s?) (by mouth )?(twice|once|three times) daily"`
- Frequency: `"every (\d+) hours"` → Calculate frequency
- PRN: `"as needed"` → Frequency = 0

**OpenAI Integration:**
- Model: `gpt-4o-mini`
- Temperature: 0.3 (for consistent output)
- Max tokens: 150
- System prompt: Define JSON output format
- Parse JSON from response content

**Test Cases:**
- Use samples from `test-data/sig-samples.json`
- Test both simple and complex cases

**Priority:** High - Core functionality

---

### 2. Quantity Calculator

**Recommendation:** Implement quantity calculation with unit handling.

**Formula:** `(dosage × frequency) × daysSupply`

**Requirements:**
- Handle unit normalization (tablets, capsules, mL, g, etc.)
- Validate inputs (dosage > 0, frequency > 0, daysSupply > 0)
- Return structured result: `{total: number, unit: string}`

**Priority:** High - Core functionality

---

### 3. NDC Selector

**Recommendation:** Implement NDC selection with ranking algorithm.

**Requirements:**
- Match package sizes to calculated quantity
- Prioritize exact matches
- Generate multi-pack combinations
- Rank by: exactness → package count → overfill amount
- Return top 3-5 recommendations

**Priority:** High - Core functionality

---

## Phase 4: UI & User Experience

### 1. Error Handling UI

**Recommendation:** Implement user-friendly error messages.

**Error Scenarios:**
- Drug not found → Show spelling suggestions from RxNorm
- No NDCs found → Explain and suggest alternatives
- SIG parse failed → Show example format
- API errors → Show retry option

**Priority:** High - User experience

---

### 2. Results Display

**Recommendation:** Display results with clear warnings and recommendations.

**Display:**
- Drug information (name, RxCUI, strength)
- Quantity calculation breakdown
- Recommended NDC (highlighted)
- Alternative options (expandable)
- Warnings section (color-coded):
  - Inactive NDCs (error - red)
  - Overfills >10% (warning - yellow)
  - Underfills (warning - yellow)
  - Dosage form mismatches (info - blue)

**Priority:** High - User experience

---

## Phase 5: Testing, Optimization & Deployment

### 1. Unit Tests

**Recommendation:** Focus unit tests on critical components.

**Priority Components:**
- NDC normalizer (use `test-data/ndc-normalization-test-cases.json`)
- Package parser (use `test-data/package-descriptions.json`)
- SIG parser (use `test-data/sig-samples.json`)
- Quantity calculator
- NDC selector

**Target Coverage:** ≥80%

**Priority:** High - Quality assurance

---

### 2. Integration Tests

**Recommendation:** Test end-to-end flow with mocked API responses.

**Test Scenarios:**
- Happy path: Drug name → RxCUI → NDCs → Parse SIG → Calculate → Select NDC
- Error scenarios: Drug not found, no NDCs, SIG parse failed
- Edge cases: Multiple matches, inactive NDCs, complex SIG

**Priority:** High - Quality assurance

---

### 3. Performance Testing

**Recommendation:** Verify performance targets.

**Targets:**
- Total request time: <2 seconds (P95)
- Cache hit response: <100ms
- External API calls: <1s each

**Test:**
- Parallel API calls (NDC fetch + SIG parse)
- Cache hit rates
- Rate limit handling

**Priority:** Medium - Performance optimization

---

## General Recommendations

### 1. Error Handling

**Recommendation:** Implement comprehensive error handling at all levels.

**Strategy:**
- Retry with exponential backoff (1s, 2s, 4s, 3 attempts max)
- Timeout: 10 seconds per external API call
- Graceful degradation: Return partial results when possible
- User-friendly error messages

**Priority:** High - Reliability

---

### 2. Logging

**Recommendation:** Implement structured logging for debugging and monitoring.

**Log:**
- API requests and responses (sanitized)
- Cache hits/misses
- Error scenarios
- Performance metrics

**Priority:** Medium - Debugging and monitoring

---

### 3. Environment Variables

**Recommendation:** Use environment variables for all configuration.

**Required:**
- `OPENAI_API_KEY` - OpenAI API key
- `NODE_ENV` - Environment (development/production)

**Optional:**
- `REDIS_URL` - Redis connection (production)
- `LOG_LEVEL` - Logging level

**Priority:** High - Security and configuration

---

## Critical Implementation Notes

### 1. API Flow Change

**⚠️ CRITICAL:** Do NOT use RxNorm's `allndcs` endpoint. Use FDA API with `search=openfda.rxcui:{rxcui}` instead.

**Impact:** This is the most important finding from Phase 0. Implementation must follow updated flow.

---

### 2. Package Parser Complexity

**⚠️ IMPORTANT:** Package descriptions have extensive format variations. Parser must handle:
- Simple formats (80%+ of cases)
- Multi-pack formats (require special parsing)
- Decimal quantities (87.1 g)
- Special units (sprays, vials, etc.)

**Impact:** Parser implementation is more complex than initially estimated, but manageable with regex + AI approach.

---

### 3. Rate Limiting

**⚠️ IMPORTANT:** FDA API rate limit is 240 requests/minute. Must implement:
- 250ms delay between requests
- Request queuing if needed
- Exponential backoff on rate limit errors

**Impact:** May need request queuing for high-volume scenarios.

---

## Success Criteria

### Phase 1-2 Success
- ✅ NDC normalizer handles all format variations
- ✅ Package parser handles 30+ format variations
- ✅ RxNorm service works with JSON format
- ✅ FDA service retrieves NDCs by RxCUI
- ✅ Caching reduces API calls by 60%+

### Phase 3 Success
- ✅ SIG parser handles 80%+ of cases with regex
- ✅ Quantity calculator works correctly
- ✅ NDC selector recommends optimal packages
- ✅ Warnings generated for inactive NDCs, overfills, underfills

### Phase 4-5 Success
- ✅ UI displays results clearly
- ✅ Error handling is user-friendly
- ✅ Performance targets met (<2s P95)
- ✅ Unit test coverage ≥80%

---

**Status:** Complete  
**Next Steps:** Use recommendations to guide Phase 1-5 implementation

