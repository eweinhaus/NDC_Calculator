# Phase 2 Task List: API Integration & Caching

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 2 - API Integration & Caching  
**Duration:** Days 3-4  
**Status:** Pending  
**Reference:** [Phase 2 PRD](../PRDs/phase-2-api-integration.md)

---

## Overview

This task list breaks down Phase 2 into actionable, well-defined tasks. Each task includes specific requirements, deliverables, and acceptance criteria. Tasks should be completed in order, as they build upon each other. The infrastructure components (cache, retry, logger, deduplicator) should be built first, as the API services depend on them.

---

## Task 1: Structured Logging System

**Priority:** P0 - Critical  
**Estimated Time:** 1-2 hours  
**Dependencies:** None

### Description
Implement a structured logging system that all services will use. This provides consistent, production-ready logging for debugging and monitoring throughout the application.

### Requirements
- Structured JSON logging format
- Log levels: debug, info, warn, error
- Include context (request ID, user ID if available)
- Timestamp and service name in every log
- Production-ready format (can integrate with logging services)
- Console output for development, JSON for production

### Steps
1. Create `lib/utils/logger.ts`:
   - Define `LogLevel` type: 'debug' | 'info' | 'warn' | 'error'
   - Define `LogContext` interface with optional fields (requestId, userId, service, etc.)
   - Create `Logger` class with methods: debug, info, warn, error
   - Each method accepts: message (string), error? (Error), context? (LogContext)

2. Implement log formatting:
   - Create `formatLog()` function that returns structured JSON
   - Include: timestamp (ISO 8601), level, message, service, context, error details
   - In development: Pretty-print JSON to console
   - In production: Output raw JSON (one line per log)

3. Create logger instance:
   - Export singleton instance: `export const logger = new Logger()`
   - Set service name from environment or default to 'ndc-calculator'

4. Add environment variable support:
   - `LOG_LEVEL` (default: 'info' in production, 'debug' in development)
   - `NODE_ENV` to determine output format

5. Write unit tests:
   - Test all log levels
   - Test context inclusion
   - Test error logging
   - Test production vs development output

### Deliverables
- ✅ `lib/utils/logger.ts` with complete Logger class
- ✅ Structured JSON log format
- ✅ Environment-based output formatting
- ✅ Unit tests passing
- ✅ Logger ready for use by all services

### Acceptance Criteria
- [ ] Logger exports singleton instance
- [ ] All log levels (debug, info, warn, error) work correctly
- [ ] Logs include timestamp, level, message, service, context
- [ ] Error objects are properly serialized
- [ ] Development mode outputs pretty JSON
- [ ] Production mode outputs single-line JSON
- [ ] Unit tests pass with ≥80% coverage

---

## Task 2: Retry Logic Utility

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1 (Logger)

### Description
Implement exponential backoff retry logic that all API services will use. This handles transient errors (network issues, timeouts, 5xx errors) while avoiding retries on client errors (4xx, except 429).

### Requirements
- Exponential backoff algorithm
- Configurable max attempts, delays, backoff multiplier
- Error classification (retry vs don't retry)
- Timeout handling
- Integration with logger

### Steps
1. Create `lib/utils/retry.ts`:
   - Define `RetryOptions` interface:
     - `maxAttempts: number` (default: 3)
     - `initialDelayMs: number` (default: 1000)
     - `maxDelayMs: number` (default: 10000)
     - `backoffMultiplier: number` (default: 2)
   - Define `withRetry<T>()` function signature

2. Implement error classification:
   - Create `shouldRetry(error: unknown): boolean` function
   - Retry on: Network errors, timeouts, 500-599 status codes, 429 (rate limit)
   - Don't retry on: 400-499 (except 429), invalid responses, parsing errors
   - Handle both Error objects and fetch Response objects

3. Implement exponential backoff:
   - Calculate delay: `min(initialDelayMs * (backoffMultiplier ^ attempt), maxDelayMs)`
   - Use `setTimeout` wrapped in Promise for delays
   - Log each retry attempt with logger

4. Implement retry wrapper:
   - `withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>`
   - Execute function, catch errors, classify, retry if needed
   - Return result on success, throw final error after max attempts
   - Log attempts: "Retry attempt {n}/{max} after {delay}ms"

5. Write unit tests:
   - Test successful execution (no retries)
   - Test retry on transient errors (network, 500, 429)
   - Test no retry on client errors (400, 404)
   - Test exponential backoff timing
   - Test max attempts limit
   - Test error classification

### Deliverables
- ✅ `lib/utils/retry.ts` with complete retry logic
- ✅ Error classification working correctly
- ✅ Exponential backoff implemented
- ✅ Integration with logger
- ✅ Unit tests passing

### Acceptance Criteria
- [ ] `withRetry()` function works correctly
- [ ] Exponential backoff calculates delays correctly
- [ ] Error classification distinguishes retryable vs non-retryable errors
- [ ] Network errors trigger retries
- [ ] 5xx errors trigger retries
- [ ] 429 errors trigger retries
- [ ] 4xx errors (except 429) don't trigger retries
- [ ] Max attempts respected
- [ ] All retry attempts logged
- [ ] Unit tests pass with ≥80% coverage

---

## Task 3: Cache Service

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 1 (Logger)

### Description
Implement an in-memory cache service with TTL support, LRU eviction, and a Redis-ready interface. This is critical for reducing API calls and improving performance.

### Requirements
- In-memory Map implementation (development)
- Redis-ready interface (production - stubbed for now)
- TTL support per cache entry
- LRU eviction (max 1000 entries)
- Cache key hashing (normalized inputs)
- Integration with logger

### Steps
1. Create `lib/services/cache.ts`:
   - Define `CacheEntry<T>` interface: `{ value: T, expiresAt: number, lastAccessed: number }`
   - Define `CacheInterface` interface for Redis abstraction
   - Create `InMemoryCache` class implementing `CacheInterface`

2. Implement cache storage:
   - Use `Map<string, CacheEntry<T>>` for storage
   - Track `maxEntries` (default: 1000)
   - Track entry expiration and last access times

3. Implement `get<T>(key: string): Promise<T | null>`:
   - Check if entry exists
   - Check if entry expired (compare `expiresAt` with `Date.now()`)
   - Update `lastAccessed` timestamp
   - Return value or null
   - Log cache hit/miss

4. Implement `set<T>(key: string, value: T, ttlSeconds: number): Promise<void>`:
   - Calculate `expiresAt = Date.now() + (ttlSeconds * 1000)`
   - Set `lastAccessed = Date.now()`
   - Check if at max capacity, evict if needed
   - Store entry in Map
   - Log cache set

5. Implement LRU eviction:
   - When at max capacity, find entry with oldest `lastAccessed`
   - Remove that entry before adding new one
   - Log eviction

6. Implement TTL expiration:
   - Create `cleanupExpired()` method
   - Periodically (or on access) remove expired entries
   - Consider running cleanup on get/set operations

7. Implement `delete(key: string): Promise<void>`:
   - Remove entry from Map
   - Log deletion

8. Implement `clear(): Promise<void>`:
   - Clear all entries
   - Log clear operation

9. Create Redis stub interface:
   - Define `RedisCache` class (stub implementation)
   - Same interface as `InMemoryCache`
   - For now, throw "Not implemented" errors
   - Structure ready for Redis client integration

10. Create cache factory:
    - `createCache(): CacheInterface` function
    - Returns `InMemoryCache` in development
    - Returns `RedisCache` in production (when Redis available)
    - Export singleton: `export const cache = createCache()`

11. Define cache key constants:
    - Create `lib/constants/cacheKeys.ts`
    - Define key format functions:
      - `rxnormNameKey(drugName: string): string` → `rxnorm:name:{normalized}`
      - `rxnormNdcsKey(rxcui: string): string` → `rxnorm:ndcs:{rxcui}`
      - `fdaPackageKey(ndc: string): string` → `fda:package:{normalizedNdc}`
      - `sigParseKey(sig: string): string` → `sig:parse:{normalizedSig}`
    - Normalize inputs before creating keys

12. Define TTL constants:
    - Create `lib/constants/cacheTtl.ts`
    - Export constants:
      - `RXNORM_NAME_TTL = 604800` (7 days)
      - `RXNORM_NDCS_TTL = 86400` (24 hours)
      - `FDA_PACKAGE_TTL = 86400` (24 hours)
      - `SIG_PARSE_TTL = 2592000` (30 days)

13. Write unit tests:
    - Test get/set operations
    - Test TTL expiration
    - Test LRU eviction
    - Test cache key normalization
    - Test concurrent access
    - Test cleanup of expired entries

### Deliverables
- ✅ `lib/services/cache.ts` with InMemoryCache implementation
- ✅ `lib/services/cache.ts` with RedisCache stub
- ✅ `lib/constants/cacheKeys.ts` with key format functions
- ✅ `lib/constants/cacheTtl.ts` with TTL constants
- ✅ LRU eviction working
- ✅ TTL expiration working
- ✅ Integration with logger
- ✅ Unit tests passing

### Acceptance Criteria
- [ ] Cache get/set/delete/clear operations work correctly
- [ ] TTL expiration removes entries after timeout
- [ ] LRU eviction removes oldest entries when at capacity
- [ ] Cache keys are properly normalized and hashed
- [ ] Max 1000 entries enforced
- [ ] Redis interface stubbed and ready
- [ ] Cache operations logged appropriately
- [ ] Unit tests pass with ≥80% coverage

---

## Task 4: Request Deduplicator

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1 (Logger)

### Description
Implement request deduplication to coalesce identical concurrent requests. This prevents duplicate API calls when multiple components request the same data simultaneously.

### Requirements
- Coalesce identical concurrent requests
- Share promises between concurrent requests
- Clean up promises after completion
- Handle errors properly (don't cache failed requests)
- Integration with logger

### Steps
1. Create `lib/utils/requestDeduplicator.ts`:
   - Define `PendingRequest<T>` interface: `{ promise: Promise<T>, timestamp: number }`
   - Create `RequestDeduplicator` class with Map storage

2. Implement deduplication logic:
   - Use `Map<string, PendingRequest<T>>` to track in-flight requests
   - Key is the request identifier (e.g., cache key)

3. Implement `deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T>`:
   - Check if request with same key is in flight
   - If yes, return existing promise
   - If no, execute requestFn, store promise, return promise
   - On completion (success or error), remove from Map
   - Log deduplication events

4. Handle errors:
   - Failed requests should not be cached
   - Errors should propagate to all waiting promises
   - Clean up promise from Map even on error

5. Add cleanup for stale requests:
   - Optional: Clean up requests older than threshold (e.g., 5 minutes)
   - Prevent memory leaks from abandoned requests

6. Write unit tests:
   - Test concurrent identical requests return same promise
   - Test different keys execute separately
   - Test error handling (failed request doesn't block retries)
   - Test cleanup after completion
   - Test multiple concurrent requests for same key

### Deliverables
- ✅ `lib/utils/requestDeduplicator.ts` with complete implementation
- ✅ Promise sharing working correctly
- ✅ Error handling working correctly
- ✅ Integration with logger
- ✅ Unit tests passing

### Acceptance Criteria
- [ ] Identical concurrent requests return same promise
- [ ] Different keys execute separately
- [ ] Failed requests don't block future requests
- [ ] Promises cleaned up after completion
- [ ] Errors propagate correctly
- [ ] Deduplication events logged
- [ ] Unit tests pass with ≥80% coverage

---

## Task 5: RxNorm API Service

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Tasks 1-4 (Logger, Retry, Cache, Deduplicator)

### Description
Implement the RxNorm API service wrapper with all required endpoints, error handling, caching, retry logic, and request deduplication.

### Requirements
- Base URL: `https://rxnav.nlm.nih.gov/REST`
- Timeout: 10 seconds per request
- Retry logic: 3 attempts with exponential backoff
- Caching: 7 days for drug→RxCUI, 24 hours for RxCUI→NDCs
- Error handling: Network errors, timeouts, API errors
- Request deduplication integrated

### Steps
1. Create `lib/services/rxnorm.ts`:
   - Define RxNorm API response types (based on Phase 0 findings)
   - Import logger, retry, cache, deduplicator
   - Import cache key and TTL constants

2. Implement base HTTP client:
   - Create `fetchWithTimeout()` helper (10 second timeout)
   - Create `makeRequest()` helper that handles:
     - URL construction
     - Timeout
     - Retry logic (via `withRetry`)
     - Error handling
     - Response parsing

3. Implement `searchByDrugName(drugName: string): Promise<string | null>`:
   - Endpoint: `GET /rxcui?name={drugName}.json`
   - Normalize drug name for cache key
   - Check cache first (use deduplicator)
   - If cache miss, make API call
   - Parse response to extract RxCUI
   - Cache result with `RXNORM_NAME_TTL`
   - Return RxCUI string or null if not found
   - Handle spelling suggestions in error case

4. Implement `getAllNdcs(rxcui: string): Promise<string[]>`:
   - Endpoint: `GET /rxcui/{rxcui}/allndcs.json`
   - Check cache first (use deduplicator)
   - If cache miss, make API call
   - Parse response to extract NDC array
   - Normalize NDCs (remove dashes, ensure 11-digit format)
   - Cache result with `RXNORM_NDCS_TTL`
   - Return NDC array or empty array if not found

5. Implement `getStrength(rxcui: string): Promise<string | null>`:
   - Endpoint: `GET /rxcui/{rxcui}/property.json?propName=AVAILABLE_STRENGTH`
   - Check cache first (use deduplicator)
   - If cache miss, make API call
   - Parse response to extract strength
   - Cache result with `RXNORM_NAME_TTL` (same as drug lookup)
   - Return strength string or null

6. Implement `getSpellingSuggestions(drugName: string): Promise<string[]>`:
   - Endpoint: `GET /spellingsuggestions.json?name={drugName}`
   - Don't cache (suggestions may change)
   - Make API call with retry
   - Parse response to extract suggestions array
   - Return suggestions array or empty array

7. Error handling:
   - Handle network errors (retry)
   - Handle timeouts (retry)
   - Handle 404 (drug not found) - return null, don't retry
   - Handle 500+ errors (retry)
   - Handle invalid JSON responses
   - Log all errors with context

8. Integration:
   - All functions use cache
   - All functions use retry logic
   - All functions use deduplicator
   - All functions use logger

9. Write integration tests:
   - Mock fetch responses
   - Test successful API calls
   - Test cache hits
   - Test cache misses
   - Test retry logic
   - Test error handling
   - Test request deduplication
   - Test with real API (optional, manual)

### Deliverables
- ✅ `lib/services/rxnorm.ts` with all functions implemented
- ✅ All endpoints working
- ✅ Caching integrated
- ✅ Retry logic integrated
- ✅ Request deduplication integrated
- ✅ Error handling complete
- ✅ Integration tests passing

### Acceptance Criteria
- [ ] `searchByDrugName()` finds RxCUI for valid drug names
- [ ] `getAllNdcs()` returns NDC array for valid RxCUI
- [ ] `getStrength()` returns strength for valid RxCUI
- [ ] `getSpellingSuggestions()` returns suggestions
- [ ] All functions use caching (check cache first)
- [ ] All functions use retry logic on transient errors
- [ ] All functions use request deduplication
- [ ] Error handling works for all scenarios
- [ ] All API calls logged
- [ ] Integration tests pass with mocked responses
- [ ] Timeout of 10 seconds enforced

---

## Task 6: FDA NDC Directory API Service

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Tasks 1-4 (Logger, Retry, Cache, Deduplicator)

### Description
Implement the FDA NDC Directory API service wrapper with package lookup, rate limit handling, caching, retry logic, and request deduplication.

### Requirements
- Base URL: `https://api.fda.gov/drug/ndc.json`
- Timeout: 10 seconds per request
- Rate limiting: 240 requests/minute (implement queuing if needed)
- Retry logic: 3 attempts with exponential backoff
- Caching: 24 hours for package details
- Error handling: Rate limit errors, missing data, API errors
- Request deduplication integrated

### Steps
1. Create `lib/services/fda.ts`:
   - Define FDA API response types (based on Phase 0 findings)
   - Define `FdaPackageDetails` interface:
     - `product_ndc: string`
     - `package_ndc: string`
     - `package_description: string`
     - `active: boolean` (from `listing_expiration_date`)
     - `manufacturer_name: string`
     - `dosage_form: string`
   - Import logger, retry, cache, deduplicator
   - Import cache key and TTL constants

2. Implement rate limit tracking:
   - Create simple rate limiter (optional, for future enhancement)
   - For now, rely on retry logic for 429 errors
   - Log rate limit hits

3. Implement base HTTP client:
   - Create `fetchWithTimeout()` helper (10 second timeout)
   - Create `makeRequest()` helper that handles:
     - URL construction with query parameters
     - Timeout
     - Retry logic (via `withRetry`, including 429)
     - Error handling
     - Response parsing

4. Implement `getPackageDetails(ndc: string): Promise<FdaPackageDetails | null>`:
   - Normalize NDC for API call and cache key
   - Endpoint: `GET /drug/ndc.json?search=product_ndc:{normalizedNdc}`
   - Check cache first (use deduplicator)
   - If cache miss, make API call
   - Parse response to extract package details
   - Determine `active` status from `listing_expiration_date`
   - Map response to `FdaPackageDetails` interface
   - Cache result with `FDA_PACKAGE_TTL`
   - Return package details or null if not found

5. Implement `getAllPackages(productNdc: string): Promise<FdaPackageDetails[]>`:
   - Normalize product NDC
   - Endpoint: `GET /drug/ndc.json?search=product_ndc:{normalizedNdc}&limit=100`
   - Check cache first (use deduplicator with key like `fda:packages:{productNdc}`)
   - If cache miss, make API call
   - Parse response to extract all packages
   - Map each package to `FdaPackageDetails`
   - Cache result with `FDA_PACKAGE_TTL`
   - Return packages array or empty array

6. Implement active status determination:
   - Parse `listing_expiration_date` field
   - Compare with current date
   - Set `active = true` if expiration date is in future or null
   - Set `active = false` if expiration date is in past

7. Error handling:
   - Handle network errors (retry)
   - Handle timeouts (retry)
   - Handle 404 (NDC not found) - return null, don't retry
   - Handle 429 (rate limit) - retry with backoff
   - Handle 500+ errors (retry)
   - Handle invalid JSON responses
   - Handle missing fields in response
   - Log all errors with context

8. Integration:
   - All functions use cache
   - All functions use retry logic
   - All functions use deduplicator
   - All functions use logger

9. Write integration tests:
   - Mock fetch responses
   - Test successful API calls
   - Test cache hits
   - Test cache misses
   - Test retry logic (including 429)
   - Test error handling
   - Test request deduplication
   - Test active status determination
   - Test with real API (optional, manual)

### Deliverables
- ✅ `lib/services/fda.ts` with all functions implemented
- ✅ `FdaPackageDetails` type defined
- ✅ Package lookup working
- ✅ Active status determination working
- ✅ Rate limit handling (via retry)
- ✅ Caching integrated
- ✅ Retry logic integrated
- ✅ Request deduplication integrated
- ✅ Error handling complete
- ✅ Integration tests passing

### Acceptance Criteria
- [ ] `getPackageDetails()` returns package details for valid NDC
- [ ] `getAllPackages()` returns all packages for product NDC
- [ ] Active status correctly determined from expiration date
- [ ] All functions use caching (check cache first)
- [ ] All functions use retry logic on transient errors (including 429)
- [ ] All functions use request deduplication
- [ ] Error handling works for all scenarios
- [ ] Rate limit errors handled gracefully
- [ ] All API calls logged
- [ ] Integration tests pass with mocked responses
- [ ] Timeout of 10 seconds enforced

---

## Task 7: OpenAI API Service (Fallback Only)

**Priority:** P1 - High  
**Estimated Time:** 3-4 hours  
**Dependencies:** Tasks 1-4 (Logger, Retry, Cache, Deduplicator)

### Description
Implement the OpenAI API service wrapper for SIG parsing fallback. This is only used when regex parser confidence < 0.8, so cost optimization is critical.

### Requirements
- Model: `gpt-4o-mini`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Timeout: 10 seconds
- Retry logic: 2 attempts (cost consideration)
- Caching: 30 days for parsed SIGs
- Error handling: API errors, rate limits, invalid responses
- Request deduplication integrated

### Steps
1. Create `lib/services/openai.ts`:
   - Define OpenAI API request/response types
   - Define `ParsedSig` interface (from Phase 1 types):
     - `dosage: number`
     - `frequency: number`
     - `unit: string`
     - `confidence: number`
   - Import logger, retry, cache, deduplicator
   - Import cache key and TTL constants

2. Check environment variable:
   - Read `OPENAI_API_KEY` from environment
   - Throw error if missing (but allow service to be created)
   - Log warning if key not found

3. Implement base HTTP client:
   - Create `fetchWithTimeout()` helper (10 second timeout)
   - Create `makeRequest()` helper that handles:
     - Authorization header with API key
     - Timeout
     - Retry logic (2 attempts only, via `withRetry`)
     - Error handling
     - Response parsing

4. Create SIG parsing prompt:
   - Define prompt template:
     ```
     Parse the following prescription instruction (SIG) and return JSON:
     {dosage: number, frequency: number, unit: string, confidence: number}
     
     SIG: "{sig}"
     
     Return only valid JSON, no additional text.
     ```
   - Function: `createSigPrompt(sig: string): string`

5. Implement `parseSig(sig: string): Promise<ParsedSig>`:
   - Normalize SIG for cache key
   - Check cache first (use deduplicator)
   - If cache miss:
     - Create prompt using `createSigPrompt()`
     - Make API call to `/v1/chat/completions`:
       - Model: `gpt-4o-mini`
       - Messages: `[{ role: 'user', content: prompt }]`
       - Temperature: 0 (deterministic)
       - Max tokens: 200
     - Parse response to extract JSON
     - Validate parsed JSON matches `ParsedSig` interface
     - Cache result with `SIG_PARSE_TTL`
   - Return `ParsedSig` object

6. Implement response parsing:
   - Extract `content` from `choices[0].message.content`
   - Parse JSON from content (handle markdown code blocks if present)
   - Validate required fields: dosage, frequency, unit, confidence
   - Validate types (dosage/frequency/confidence are numbers, unit is string)
   - Validate confidence is between 0 and 1
   - Throw error if validation fails

7. Error handling:
   - Handle network errors (retry, but only 2 attempts)
   - Handle timeouts (retry)
   - Handle 401 (invalid API key) - don't retry, throw clear error
   - Handle 429 (rate limit) - retry with backoff
   - Handle 500+ errors (retry)
   - Handle invalid JSON in response
   - Handle missing fields in parsed response
   - Log all errors with context (but don't log API key)

8. Cost optimization:
   - Only call API if cache miss
   - Use deduplicator to prevent duplicate calls
   - Use minimal prompt (keep tokens low)
   - Use `gpt-4o-mini` (cheapest model)
   - Log cost estimates (optional)

9. Integration:
   - Function uses cache
   - Function uses retry logic (2 attempts)
   - Function uses deduplicator
   - Function uses logger

10. Write integration tests:
    - Mock fetch responses
    - Test successful API calls
    - Test cache hits
    - Test cache misses
    - Test retry logic (2 attempts max)
    - Test error handling
    - Test request deduplication
    - Test JSON parsing and validation
    - Test with real API (optional, manual - be careful with costs)

### Deliverables
- ✅ `lib/services/openai.ts` with `parseSig()` function
- ✅ Prompt template implemented
- ✅ Response parsing and validation working
- ✅ Caching integrated
- ✅ Retry logic integrated (2 attempts)
- ✅ Request deduplication integrated
- ✅ Error handling complete
- ✅ Cost optimization measures in place
- ✅ Integration tests passing

### Acceptance Criteria
- [ ] `parseSig()` parses SIG text and returns `ParsedSig`
- [ ] Function uses caching (check cache first)
- [ ] Function uses retry logic (max 2 attempts)
- [ ] Function uses request deduplication
- [ ] JSON parsing handles markdown code blocks
- [ ] Response validation works correctly
- [ ] Error handling works for all scenarios
- [ ] API key read from environment
- [ ] All API calls logged (without API key)
- [ ] Integration tests pass with mocked responses
- [ ] Timeout of 10 seconds enforced
- [ ] Cost optimization measures working

---

## Task 8: Integration Testing & Verification

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** Tasks 1-7 (All services complete)

### Description
Create comprehensive integration tests and verify all services work together correctly. Test real API calls (with caution for OpenAI), verify caching effectiveness, and ensure all error scenarios are handled.

### Requirements
- Integration tests for all services
- Test service interactions
- Verify caching effectiveness
- Test error scenarios
- Manual testing with real APIs (optional)

### Steps
1. Create integration test suite:
   - Create `tests/integration/services.test.ts`
   - Set up test environment
   - Mock external APIs where appropriate
   - Test real APIs for RxNorm and FDA (they're free)

2. Test RxNorm service:
   - Test with real drug names from test data
   - Verify cache hits on second call
   - Verify retry logic on simulated failures
   - Verify request deduplication
   - Test error scenarios

3. Test FDA service:
   - Test with real NDCs from test data
   - Verify cache hits on second call
   - Verify retry logic on simulated failures
   - Verify request deduplication
   - Test rate limit handling (simulated)
   - Test error scenarios

4. Test OpenAI service (with mocks):
   - Test with mocked responses (to avoid costs)
   - Verify cache hits on second call
   - Verify retry logic (2 attempts max)
   - Verify request deduplication
   - Test JSON parsing edge cases
   - Test error scenarios
   - Optional: One real API call to verify it works

5. Test cache service:
   - Verify TTL expiration
   - Verify LRU eviction
   - Verify concurrent access
   - Test cache key normalization

6. Test retry logic:
   - Verify exponential backoff timing
   - Verify error classification
   - Verify max attempts

7. Test request deduplication:
   - Verify concurrent requests share promise
   - Verify cleanup after completion
   - Verify error handling

8. Performance verification:
   - Measure cache hit rates
   - Measure API call reduction
   - Verify response times meet targets

9. Manual testing checklist:
   - [ ] RxNorm API works with real drug names
   - [ ] FDA API works with real NDCs
   - [ ] OpenAI API works (one test call)
   - [ ] Caching reduces API calls
   - [ ] Error handling works gracefully
   - [ ] Logs provide useful information

### Deliverables
- ✅ Integration test suite created
- ✅ All services tested together
- ✅ Caching effectiveness verified
- ✅ Error scenarios tested
- ✅ Performance metrics collected
- ✅ Manual testing completed

### Acceptance Criteria
- [ ] All integration tests pass
- [ ] Cache hit rate ≥60% in tests
- [ ] All error scenarios handled gracefully
- [ ] Request deduplication working
- [ ] Retry logic working correctly
- [ ] All services log appropriately
- [ ] Performance targets met (<2s for cached, <10s for API calls)
- [ ] Manual testing checklist completed

---

## Task 9: Documentation & Code Review

**Priority:** P1 - High  
**Estimated Time:** 1-2 hours  
**Dependencies:** Tasks 1-8 (All tasks complete)

### Description
Document all services, update code comments, and prepare for code review. Ensure all code is well-documented and follows project patterns.

### Requirements
- Code comments for all public functions
- JSDoc comments where appropriate
- README updates if needed
- Code follows project patterns
- All types exported and documented

### Steps
1. Add code comments:
   - Add JSDoc comments to all public functions
   - Document parameters, return types, exceptions
   - Add inline comments for complex logic

2. Review code quality:
   - Ensure consistent error handling patterns
   - Ensure consistent logging patterns
   - Ensure consistent caching patterns
   - Check for code duplication
   - Verify TypeScript strict mode compliance

3. Update type exports:
   - Ensure all types are exported from appropriate files
   - Create index files if needed for easier imports
   - Document type usage

4. Review integration:
   - Verify all services use logger
   - Verify all services use retry logic
   - Verify all services use cache
   - Verify all services use deduplicator
   - Check for missing integrations

5. Performance review:
   - Review cache TTL values
   - Review retry configurations
   - Review timeout values
   - Verify no unnecessary API calls

6. Security review:
   - Verify API keys not logged
   - Verify no sensitive data in logs
   - Verify input validation
   - Verify error messages don't expose internals

### Deliverables
- ✅ All code documented
- ✅ JSDoc comments added
- ✅ Code review completed
- ✅ Types exported and documented
- ✅ Integration verified
- ✅ Security review completed

### Acceptance Criteria
- [ ] All public functions have JSDoc comments
- [ ] Code follows project patterns consistently
- [ ] All types exported appropriately
- [ ] No code duplication
- [ ] TypeScript strict mode compliant
- [ ] Security review passed
- [ ] Ready for Phase 3

---

## Summary

Phase 2 consists of 9 tasks that build the complete data layer infrastructure:

1. **Infrastructure (Tasks 1-4):** Logger, Retry, Cache, Deduplicator
2. **API Services (Tasks 5-7):** RxNorm, FDA, OpenAI
3. **Verification (Tasks 8-9):** Integration testing, Documentation

**Total Estimated Time:** 22-30 hours (Days 3-4)

**Critical Path:**
- Tasks 1-4 must be completed first (infrastructure)
- Tasks 5-7 can be done in parallel after infrastructure is ready
- Tasks 8-9 complete the phase

**Key Success Metrics:**
- ✅ All API services functional
- ✅ Caching reduces API calls by ≥60%
- ✅ Error handling robust (no unhandled errors)
- ✅ Request deduplication working
- ✅ Logging provides useful debugging info
- ✅ Ready for Phase 3 business logic

---

**Document Owner:** Development Team  
**Last Updated:** Phase 2 Task List Creation  
**Status:** Pending

