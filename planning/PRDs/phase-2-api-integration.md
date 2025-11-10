# Phase 2 PRD: API Integration & Caching

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 2 - API Integration & Caching  
**Duration:** Days 3-4  
**Status:** Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 2 implements all external API integrations (RxNorm, FDA, OpenAI), caching infrastructure, request deduplication, error handling with retry logic, and structured logging. This phase creates the data layer that Phase 3 business logic will depend on. All API calls must be robust, cached appropriately, and handle errors gracefully.

**Key Deliverables:**
- RxNorm API service wrapper
- FDA NDC Directory API service wrapper
- OpenAI API service wrapper (fallback only)
- Cache service (in-memory with Redis-ready interface)
- Request deduplicator
- Error handling with retry logic
- Structured logging system

---

## Objectives

1. **API Integration:** Integrate all three external APIs (RxNorm, FDA, OpenAI)
2. **Caching:** Implement in-memory cache with TTL support
3. **Error Handling:** Robust error handling with retry logic
4. **Request Deduplication:** Prevent duplicate concurrent requests
5. **Logging:** Structured logging for debugging and monitoring

---

## Tasks

### Task 1: RxNorm API Service

**File:** `lib/services/rxnorm.ts`

**Endpoints to Implement:**
1. `GET /rxcui?name={drugName}` - Search drug by name
2. `GET /rxcui/{rxcui}/allndcs` - Get all NDCs for RxCUI
3. `GET /rxcui/{rxcui}/property?propName=AVAILABLE_STRENGTH` - Get strength info
4. `GET /spellingsuggestions?name={drugName}` - Get spelling suggestions

**Functions:**
- `searchByDrugName(drugName: string): Promise<string | null>` - Search for RxCUI
- `getAllNdcs(rxcui: string): Promise<string[]>` - Get all NDCs for RxCUI
- `getStrength(rxcui: string): Promise<string | null>` - Get strength info
- `getSpellingSuggestions(drugName: string): Promise<string[]>` - Get suggestions

**Requirements:**
- Base URL: `https://rxnav.nlm.nih.gov/REST`
- Timeout: 10 seconds per request
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- Error handling: Network errors, timeouts, API errors
- Caching: 7 days for drug→RxCUI, 24 hours for RxCUI→NDCs

**Deliverables:**
- Complete RxNorm service implementation
- Error handling for all scenarios
- Integration tests with mocked responses

---

### Task 2: FDA NDC Directory API Service

**File:** `lib/services/fda.ts`

**Endpoints to Implement:**
1. `GET /drug/ndc.json?search=product_ndc:{ndc}` - Get package details for NDC
2. `GET /drug/ndc.json?search=product_ndc:{ndc}&limit=100` - Get all packages

**Functions:**
- `getPackageDetails(ndc: string): Promise<FdaPackageDetails | null>` - Get package details
- `getAllPackages(productNdc: string): Promise<FdaPackageDetails[]>` - Get all packages

**FdaPackageDetails:** product_ndc, package_ndc, package_description, active, manufacturer_name, dosage_form

**Requirements:**
- Base URL: `https://api.fda.gov/drug/ndc.json`
- Timeout: 10 seconds per request
- Rate limiting: 240 requests/minute (implement queuing if needed)
- Retry logic: 3 attempts with exponential backoff
- Error handling: Rate limit errors, missing data, API errors
- Caching: 24 hours for package details

**Deliverables:**
- Complete FDA service implementation
- Rate limit handling
- Integration tests with mocked responses

---

### Task 3: OpenAI API Service (Fallback Only)

**File:** `lib/services/openai.ts`

**Purpose:** Only used when regex SIG parser confidence < 0.8

**Function:** `parseSig(sig: string): Promise<ParsedSig>` - Parse SIG using OpenAI

**Requirements:**
- Model: `gpt-4o-mini`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Prompt: Structured prompt for SIG parsing
- Response parsing: Extract structured JSON from response
- Error handling: API errors, rate limits, invalid responses
- Timeout: 10 seconds
- Retry logic: 2 attempts (cost consideration)

**Prompt Structure:**
```
Parse the following prescription instruction (SIG) and return JSON:
{dosage: number, frequency: number, unit: string, confidence: number}

SIG: "{sig}"
```

**Deliverables:**
- Complete OpenAI service implementation
- Cost-effective usage (only when needed)
- Error handling for API failures

---

### Task 4: Cache Service

**File:** `lib/services/cache.ts`

**Requirements:**
- In-memory Map implementation (development)
- Redis-ready interface (production)
- TTL support per cache entry
- LRU eviction (max 1000 entries)
- Cache key hashing (normalized inputs)

**Interface:**
- `get<T>(key: string): Promise<T | null>` - Get cached value
- `set<T>(key: string, value: T, ttlSeconds: number): Promise<void>` - Set with TTL
- `delete(key: string): Promise<void>` - Delete entry
- `clear(): Promise<void>` - Clear all entries

**Cache Keys:**
- RxNorm drug→RxCUI: `rxnorm:name:{normalizedDrugName}`
- RxNorm RxCUI→NDCs: `rxnorm:ndcs:{rxcui}`
- FDA package details: `fda:package:{ndc}`
- SIG parsing: `sig:parse:{normalizedSig}`

**TTL Configuration:**
- RxNorm (drug→RxCUI): 7 days (604800 seconds)
- RxNorm (RxCUI→NDCs): 24 hours (86400 seconds)
- FDA package details: 24 hours (86400 seconds)
- SIG parsing: 30 days (2592000 seconds)

**Deliverables:**
- Complete cache service implementation
- LRU eviction working
- TTL expiration working
- Redis interface ready (stubbed for now)

---

### Task 5: Request Deduplicator

**File:** `lib/utils/requestDeduplicator.ts`

**Purpose:** Coalesce identical concurrent requests to prevent duplicate API calls

**Function:** `deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T>` - Deduplicate concurrent requests

**Behavior:**
- If identical request in flight, return same promise
- If request not in flight, execute and cache promise
- Remove promise from cache when complete
- Handle errors properly (don't cache failed requests)

**Use Cases:**
- Multiple components requesting same drug lookup
- Concurrent NDC fetches for same RxCUI
- Duplicate SIG parsing requests

**Deliverables:**
- Request deduplicator implementation
- Unit tests for concurrent requests
- Integration with API services

---

### Task 6: Error Handling & Retry Logic

**File:** `lib/utils/retry.ts`

**Requirements:**
- Exponential backoff retry logic
- Configurable max attempts
- Retry only on transient errors (network, timeout, 5xx)
- Don't retry on client errors (4xx, except 429)

**Function:** `withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>` - Retry with exponential backoff

**RetryOptions:** maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier

**Default Configuration:**
- Max attempts: 3
- Initial delay: 1000ms (1 second)
- Max delay: 10000ms (10 seconds)
- Backoff multiplier: 2

**Error Classification:**
- Retry: Network errors, timeouts, 500-599 status codes, 429 (rate limit)
- Don't retry: 400-499 (except 429), invalid responses

**Deliverables:**
- Retry utility implementation
- Error classification logic
- Unit tests for retry scenarios

---

### Task 7: Structured Logging

**File:** `lib/utils/logger.ts`

**Requirements:**
- Structured JSON logging
- Log levels: debug, info, warn, error
- Include context (request ID, user ID if available)
- Timestamp and service name
- Production-ready (can integrate with logging services)

**Methods:** debug, info, warn, error (all accept message, optional error, optional context)

**Log Format:** JSON with timestamp, level, message, service, context

**Usage:**
- Log all API calls (request/response)
- Log cache hits/misses
- Log errors with full context
- Log performance metrics (optional)

**Deliverables:**
- Logger implementation
- Integration with all services
- Console output (development)
- JSON output (production-ready)

---

## Deliverables Summary

1. **API Services:**
   - RxNorm service (complete)
   - FDA service (complete)
   - OpenAI service (complete)

2. **Caching:**
   - Cache service with TTL support
   - LRU eviction
   - Redis-ready interface

3. **Utilities:**
   - Request deduplicator
   - Retry logic utility
   - Structured logger

4. **Integration:**
   - All services use caching
   - All services use retry logic
   - All services use logging
   - Request deduplication integrated

---

## Acceptance Criteria

**AC-2.1: RxNorm Service Working**
- All endpoints implemented
- Error handling complete
- Caching integrated
- Retry logic working
- Integration tests pass

**AC-2.2: FDA Service Working**
- Package lookup implemented
- Rate limit handling working
- Caching integrated
- Retry logic working
- Integration tests pass

**AC-2.3: OpenAI Service Working**
- SIG parsing implemented
- Error handling complete
- Cost-effective (only when needed)
- Integration tests pass

**AC-2.4: Cache Service Working**
- TTL expiration working
- LRU eviction working
- Cache keys properly hashed
- Redis interface ready

**AC-2.5: Request Deduplication Working**
- Concurrent requests deduplicated
- Promises shared correctly
- Errors handled properly
- Unit tests pass

**AC-2.6: Retry Logic Working**
- Exponential backoff correct
- Error classification correct
- Max attempts respected
- Unit tests pass

**AC-2.7: Logging Working**
- Structured logs output
- All services log appropriately
- Error logging includes context
- Production-ready format

---

## Dependencies

**Prerequisites:**
- Phase 1 completed (project structure, types, utilities)
- Phase 0 completed (API research, test data)

**External:**
- RxNorm API access (public)
- FDA NDC Directory API access (public)
- OpenAI API key (environment variable)

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key
- `NODE_ENV` - Environment (development/production)

---

## Risks & Considerations

**Risk 1: Rate Limits Too Restrictive**
- **Impact:** High - May slow down requests
- **Mitigation:** Aggressive caching, request deduplication
- **Contingency:** Implement request queuing

**Risk 2: API Response Formats Different Than Expected**
- **Impact:** Medium - May need response parsing adjustments
- **Mitigation:** Use Phase 0 findings, handle variations
- **Contingency:** Update parsers based on actual responses

**Risk 3: OpenAI Costs Higher Than Expected**
- **Impact:** Low - Only used as fallback
- **Mitigation:** Regex parser handles 80%+ cases
- **Contingency:** Monitor usage, adjust confidence threshold

**Risk 4: Cache Memory Issues**
- **Impact:** Low - LRU eviction prevents issues
- **Mitigation:** Max 1000 entries, monitor memory
- **Contingency:** Reduce max entries or move to Redis earlier

---

## Success Metrics

- ✅ All API services functional
- ✅ Caching reduces API calls by ≥60%
- ✅ Error handling robust (no unhandled errors)
- ✅ Request deduplication working
- ✅ Logging provides useful debugging info
- ✅ Ready for Phase 3 business logic

---

## Next Steps

Upon completion of Phase 2:
1. Test all API integrations with real data
2. Verify caching effectiveness
3. Review error handling coverage
4. Begin Phase 3: Core Business Logic

---

**Document Owner:** Development Team  
**Last Updated:** Phase 2 Start  
**Status:** Development

