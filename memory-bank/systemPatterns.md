# System Patterns: NDC Packaging & Quantity Calculator

## Architecture Overview

The system follows a layered architecture with clear separation of concerns:

1. **Frontend Layer:** SvelteKit UI components
2. **API Layer:** SvelteKit API routes for request handling
3. **Service Layer:** External API clients (RxNorm, FDA, OpenAI)
4. **Core Logic Layer:** Business logic (parsing, calculation, selection)
5. **Data Storage:** Caching layer (in-memory/Redis)

## Key Architectural Decisions

### 1. API Flow Pattern
**Decision:** RxNorm provides NDC lists, FDA provides package details (NOT direct RxCUI→NDC from FDA)

**Rationale:** 
- RxNorm API provides comprehensive NDC lists for a given RxCUI
- FDA API provides detailed package information including active status
- Two-step process ensures accurate, up-to-date data

### 2. SIG Parsing Strategy
**Decision:** Regex-first approach (primary), OpenAI fallback only for complex cases

**Rationale:**
- Cost optimization: Regex handles 80%+ of cases without AI costs
- Performance: Regex is faster than API calls
- Fallback ensures complex cases are still handled
- Confidence threshold (0.8) determines when to use AI

### 3. Caching Strategy
**Decision:** Aggressive caching with appropriate TTLs

**TTL Values:**
- RxNorm (drug → RxCUI): 7 days (drug names rarely change)
- RxNorm (RxCUI → NDCs): 24 hours (NDC lists can be updated)
- FDA (NDC details): 24 hours (active status can change)
- SIG Parsing: 30 days (patterns are consistent)

**Implementation:**
- Development: In-memory Map with LRU eviction (max 1000 entries)
- Production: Redis (Render free tier or upgrade)
- Cache keys: Hashed normalized inputs

### 4. Parallel Processing
**Decision:** NDC fetching and SIG parsing run concurrently

**Rationale:**
- Both operations are independent
- Reduces total response time
- Critical for meeting <2s response target

### 5. Request Deduplication
**Decision:** Coalesce identical concurrent requests

**Rationale:**
- Prevents duplicate API calls
- Reduces external API load
- Improves cache efficiency

## Component Structure

```
src/
├── routes/
│   ├── +page.svelte              # Main UI ✅
│   ├── api/
│   │   ├── calculate/+server.ts  # POST /api/calculate ✅ (Full flow: drug lookup → NDC retrieval → SIG parsing → calculation → NDC selection → warnings)
│   │   └── health/+server.ts     # GET /api/health ✅
├── lib/
│   ├── components/               # UI Components ✅
│   │   ├── results/              # Results display components ✅
│   │   │   ├── DrugInfoCard.svelte
│   │   │   ├── QuantityBreakdown.svelte
│   │   │   ├── RecommendedNdc.svelte
│   │   │   ├── AlternativeNdcs.svelte
│   │   │   ├── WarningsSection.svelte
│   │   │   ├── InactiveNdcsList.svelte
│   │   │   └── ResultsDisplay.svelte
│   │   ├── SkeletonLoader.svelte # Loading skeletons ✅
│   │   ├── ErrorDisplay.svelte   # Error display ✅
│   │   └── Toast.svelte          # Toast notifications ✅
│   ├── stores/                  # Svelte stores ✅
│   │   └── toast.ts              # Toast notification store ✅
│   ├── services/                 # External API clients
│   │   ├── rxnorm.ts             # RxNorm API wrapper ✅
│   │   ├── fda.ts                # FDA NDC API wrapper ✅ (includes getPackagesByRxcui())
│   │   ├── openai.ts             # OpenAI API wrapper (fallback only) ✅
│   │   └── cache.ts              # Cache service (Map/Redis) ✅
│   ├── core/                     # Business logic
│   │   ├── sigParser.ts          # Regex + AI SIG parser orchestrator ✅
│   │   ├── regexSigParser.ts     # Primary regex-based parser ✅
│   │   ├── openaiSigParser.ts    # OpenAI fallback parser ✅
│   │   ├── quantityCalculator.ts # Quantity calculation logic ✅
│   │   ├── ndcSelector.ts        # NDC ranking & selection ✅
│   │   ├── warningGenerator.ts   # Warning generation logic ✅
│   │   ├── packageParser.ts      # Parse package descriptions ✅
│   │   └── validator.ts          # Input validation
│   ├── utils/                    # Helpers
│   │   ├── ndcNormalizer.ts      # NDC format normalization ✅
│   │   ├── clipboard.ts          # Clipboard utility ✅
│   │   ├── debounce.ts           # Debounce utility ✅
│   │   ├── errorMessages.ts      # Error message mapping ✅
│   │   ├── requestDeduplicator.ts # Deduplicate concurrent requests ✅
│   │   ├── retry.ts              # Retry logic with exponential backoff ✅
│   │   └── logger.ts             # Structured logging ✅
│   ├── constants/                # Constants
│   │   ├── cacheKeys.ts          # Cache key generation functions ✅
│   │   ├── cacheTtl.ts           # Cache TTL constants ✅
│   │   └── sigPatterns.ts        # Regex patterns for SIG parsing ✅
│   └── types/                    # TypeScript definitions
│       ├── api.ts                # API request/response types ✅
│       ├── drug.ts               # Drug-related types ✅
│       ├── ndc.ts                # NDC-related types ✅
│       ├── sig.ts                # SIG-related types ✅
│       └── warning.ts            # Warning types ✅
└── tests/
    ├── unit/
    └── integration/
```

## Data Flow

1. User input → Client-side validation
2. POST to `/api/calculate` → Server-side validation
3. Cache check → If miss, proceed to API calls
4. Parallel execution:
   - Drug normalization (RxNorm)
   - NDC list retrieval (RxNorm)
   - Package details fetch (FDA) - parallel with SIG parsing
   - SIG parsing (regex → AI fallback if needed)
5. Quantity calculation: (dosage × frequency) × days' supply
6. Package parsing and NDC selection
7. Response formatting with warnings
8. Display results in UI

## Design Patterns

### 1. Service Layer Pattern
External API interactions are abstracted into service classes:
- `RxNormService`: Handles all RxNorm API calls (✅ implemented)
  - `searchByDrugName()`: Drug name to RxCUI lookup
  - `getAllNdcs()`: RxCUI to NDC list (note: unreliable per Phase 0 findings)
  - `getStrength()`: Strength information retrieval
  - `getSpellingSuggestions()`: Spelling correction suggestions
- `FDAService`: Handles all FDA API calls (✅ implemented)
  - `getPackageDetails()`: Single NDC package lookup
  - `getAllPackages()`: All packages for product NDC
  - Active status determination from `listing_expiration_date`
- `OpenAIService`: Handles OpenAI API calls (fallback only) (✅ implemented)
  - `parseSig()`: SIG parsing with JSON response validation
  - Cost-optimized (2 retry attempts max, only when regex confidence < 0.8)
- `CacheService`: Unified caching interface (✅ implemented)
  - In-memory Map with LRU eviction (development)
  - Redis-ready interface (production stub)
  - TTL-based expiration

### 2. Strategy Pattern
SIG parsing uses strategy pattern: ✅ Implemented
- Primary strategy: Regex parser (handles 80%+ of cases)
- Fallback strategy: AI parser (when regex confidence < 0.8)
- Orchestrator (`sigParser.ts`) selects strategy based on confidence
- Caching integrated at orchestrator level (30-day TTL)

### 3. Factory Pattern
NDC normalizer creates normalized NDC objects from various input formats.

### 4. Builder Pattern
Response formatting builds structured JSON responses with all required fields.

## Error Handling Patterns

### Retry Logic (✅ Implemented)
- Exponential backoff: 1s, 2s, 4s (3 attempts max, configurable)
- Timeout: 10 seconds per external API call
- Error classification: Retries on network errors, timeouts, 5xx, 429; doesn't retry on 4xx (except 429)
- Graceful degradation on failures
- OpenAI service uses 2 attempts max (cost consideration)

### Error Response Format
```typescript
{
  success: false;
  error: {
    code: string;        // INVALID_INPUT, DRUG_NOT_FOUND, etc.
    message: string;     // User-friendly message
    details?: any;       // Additional context
  };
}
```

### Error Codes
- `INVALID_INPUT`: Client-side validation failed
- `DRUG_NOT_FOUND`: Drug not found in RxNorm (with suggestions)
- `NO_NDCS_FOUND`: No active NDCs available
- `SIG_PARSE_FAILED`: Both regex and AI parsing failed
- `API_ERROR`: External API error
- `CALCULATION_ERROR`: Business logic error

## Performance Patterns

### Caching (✅ Implemented)
- Aggressive caching at multiple levels
- Cache keys based on normalized inputs (via `cacheKeys.ts` functions)
- TTL-based expiration (7d for RxNorm drug lookup, 24h for NDCs/FDA, 30d for SIG parsing)
- LRU eviction when at capacity (max 1000 entries)
- Automatic cleanup of expired entries
- Request deduplication prevents duplicate cache misses

### Parallel Processing
- Concurrent API calls where possible
- Promise.all() for independent operations

### Request Optimization (✅ Implemented)
- Deduplication of identical concurrent requests (✅ implemented)
  - Coalesces identical requests in flight
  - Shares promises between concurrent callers
  - Cleans up after completion (success or failure)
- Debouncing on frontend (300ms) (✅ implemented in Phase 4)
  - Debounce utility created (`debounce.ts`)
  - Ready for form validation integration

## UI Component Patterns

### Component Organization (✅ Implemented in Phase 4)
- **Results Components:** Organized in `lib/components/results/` subdirectory
- **Reusable Components:** SkeletonLoader, ErrorDisplay, Toast in `lib/components/`
- **Component Composition:** ResultsDisplay composes all results components
- **Type Safety:** All components use TypeScript with proper prop types

### State Management
- **Local State:** Form state, loading state, results state managed in `+page.svelte`
- **Global State:** Toast notifications use Svelte store (`stores/toast.ts`)
- **Reactive Statements:** Use Svelte `$:` for derived state

### Accessibility Patterns (✅ Implemented)
- **ARIA Labels:** All interactive elements have descriptive labels
- **Semantic HTML:** Use `<header>`, `<main>`, `<section>`, proper heading hierarchy
- **Keyboard Navigation:** Tab order logical, all interactive elements focusable
- **Screen Reader Support:** ARIA live regions, role attributes, descriptive text
- **Focus Management:** Visible focus indicators, skip links, focus on error messages

### Responsive Design Patterns (✅ Implemented)
- **Mobile-First:** Default styles for mobile, add `md:` and `lg:` breakpoints
- **Breakpoints:** `md:` ≥768px (tablet), `lg:` ≥1024px (desktop)
- **Touch Targets:** Minimum 44px height for interactive elements on mobile
- **Flexible Layouts:** Use Tailwind flexbox/grid utilities for responsive layouts

### Loading States (✅ Implemented)
- **Skeleton Loaders:** Match actual content layout, shimmer animation
- **Accessibility:** `aria-busy="true"`, `aria-label="Loading..."`
- **Motion Sensitivity:** Respect `prefers-reduced-motion` media query

### Error Handling UI (✅ Implemented)
- **Error Display Component:** Centralized error display with suggestions
- **Spelling Suggestions:** Clickable chips that pre-fill input
- **Retry Functionality:** Retry button with optional countdown timer
- **Error Message Mapping:** User-friendly messages from error codes

## Security Patterns

- API keys stored in environment variables only
- Input validation and sanitization
- No internal error exposure to clients
- Rate limiting considerations
- No PHI storage

---

**Last Updated:** Phase 5 Complete (2025-01-27)

**Verification Reports:**
- Phase 3: `PHASE3_VERIFICATION_REPORT.md` - All 7 acceptance criteria verified
- Phase 4: `PHASE4_TESTING_SUMMARY.md` - Browser testing completed
- Phase 5: `ACCEPTANCE_CRITERIA_VALIDATION.md` - All 10 P0 acceptance criteria validated
- Phase 5: `PHASE5_FINAL_SUMMARY.md` - Complete Phase 5 summary

