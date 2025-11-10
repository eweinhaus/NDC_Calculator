# Technical Decisions

This document outlines key technical decisions made during the development of the NDC Packaging & Quantity Calculator, including rationale, alternatives considered, and trade-offs.

## Framework Choice: SvelteKit

**Decision:** Use SvelteKit as the full-stack framework.

**Rationale:**
- Full-stack framework with built-in API routes (no separate backend needed)
- Excellent TypeScript support with strict mode
- High performance (compiles to vanilla JS, minimal runtime overhead)
- Built-in routing, SSR, and code splitting
- Modern developer experience with hot module replacement
- Small bundle size compared to React/Vue alternatives

**Alternatives Considered:**
- **Next.js (React):** More popular but larger bundle size, more complex setup
- **Nuxt (Vue):** Good option but Svelte has better performance characteristics
- **Express + React:** Would require separate frontend/backend, more complex deployment

**Trade-offs:**
- ✅ Smaller ecosystem than React, but sufficient for this project
- ✅ Less third-party component libraries, but we built custom components
- ✅ Newer framework, but stable and production-ready

## Caching Strategy

**Decision:** In-memory Map for development, Redis-ready interface for production.

**Rationale:**
- Development: Simple, no external dependencies, fast iteration
- Production: Redis provides persistence, scalability, and shared cache across instances
- Interface abstraction allows easy switching between implementations
- Aggressive caching reduces external API calls and improves performance

**TTL Values:**
- RxNorm (drug → RxCUI): 7 days (drug names rarely change)
- RxNorm (RxCUI → NDCs): 24 hours (NDC lists can be updated)
- FDA (NDC details): 24 hours (active status can change)
- SIG Parsing: 30 days (patterns are consistent)

**Alternatives Considered:**
- **No caching:** Would exceed API rate limits and be too slow
- **Shorter TTLs:** More accurate but higher API costs and slower responses
- **Longer TTLs:** Risk of stale data, especially for active status

**Trade-offs:**
- ✅ Fast responses but potential for stale data (acceptable for this use case)
- ✅ Reduced API costs but requires cache invalidation strategy
- ✅ In-memory is simple but doesn't persist across restarts (acceptable for dev)

## SIG Parsing Approach

**Decision:** Regex-first approach (primary), OpenAI fallback only when confidence < 0.8.

**Rationale:**
- **Cost optimization:** Regex handles 80%+ of cases without AI costs (~$0.0001-0.0005 per parse)
- **Performance:** Regex is faster than API calls (<1ms vs 500-1000ms)
- **Reliability:** Regex doesn't depend on external API availability
- **Fallback ensures:** Complex cases are still handled when regex fails

**Confidence Threshold:** 0.8 (80% confidence required to skip AI fallback)

**Alternatives Considered:**
- **AI-only:** Too expensive and slow for common patterns
- **Regex-only:** Would miss complex patterns (20% of cases)
- **Lower confidence threshold:** More AI calls, higher costs

**Trade-offs:**
- ✅ Cost-effective but requires maintaining regex patterns
- ✅ Fast for common cases but slower for complex ones (acceptable)
- ✅ Handles most cases but may miss very unusual patterns

## NDC Ranking Algorithm

**Decision:** Match scoring algorithm (0-100) with exact match priority, multi-pack support, overfill/underfill calculation.

**Rationale:**
- **Exact matches:** Prioritized to minimize waste
- **Multi-pack combinations:** Allows optimal package combinations (up to 10 packages)
- **Overfill/underfill calculation:** Helps users make informed decisions
- **Top 3-5 recommendations:** Provides alternatives without overwhelming users

**Scoring Factors:**
- Exact match: 100 points
- Near match (within 5%): 90-99 points
- Overfill (>10% waste): Penalty applied
- Underfill: Penalty applied
- Package count: Fewer packages preferred

**Alternatives Considered:**
- **Simple first-match:** Too simplistic, doesn't optimize
- **All matches:** Too many options, overwhelming
- **Single best match only:** No alternatives for users

**Trade-offs:**
- ✅ Optimal recommendations but more complex algorithm
- ✅ Multiple options but requires ranking logic
- ✅ Handles edge cases but may not be perfect for all scenarios

## Error Handling Strategy

**Decision:** Retry logic with exponential backoff, graceful degradation, user-friendly error messages.

**Rationale:**
- **Retry logic:** Handles transient network errors and API rate limits
- **Exponential backoff:** Prevents overwhelming APIs during outages
- **Graceful degradation:** Partial failures don't crash the application
- **User-friendly messages:** Clear error messages with actionable suggestions

**Retry Configuration:**
- Maximum 3 attempts (configurable)
- Exponential backoff: 1s, 2s, 4s (configurable multiplier)
- Retries on: Network errors, timeouts, 500-599 status codes, 429 (rate limit)
- Doesn't retry on: 400-499 (except 429), invalid responses

**Alternatives Considered:**
- **No retries:** Would fail on transient errors
- **Fixed delay:** Less efficient than exponential backoff
- **More attempts:** Higher latency, may hit rate limits

**Trade-offs:**
- ✅ Handles transient errors but adds complexity
- ✅ Better user experience but may mask underlying issues
- ✅ Graceful degradation but may return partial results

## API Integration Decisions

### RxNorm API

**Decision:** Use RxNorm API for drug normalization and NDC retrieval.

**Rationale:**
- Free, public API (no API key required)
- Comprehensive drug database
- Provides RxCUI for drug matching
- Provides NDC lists for RxCUI

**Note:** During Phase 0 research, discovered that RxNorm's `allndcs` endpoint is unreliable. Solution: Use FDA API with `search=openfda.rxcui:{rxcui}` instead.

### FDA API

**Decision:** Use FDA NDC Directory API for package details and active status.

**Rationale:**
- Free, public API (no API key required)
- Authoritative source for NDC data
- Provides package descriptions, active status, manufacturer info
- Rate limit: 240 requests/minute (acceptable for this use case)

**Note:** Some NDCs may not have FDA data (inactive or removed). Handled gracefully by returning null.

### OpenAI API

**Decision:** Use OpenAI API (gpt-4o-mini) for SIG parsing fallback only.

**Rationale:**
- Cost-effective model for this use case
- High accuracy for complex patterns
- Used sparingly (only when regex confidence < 0.8)
- Cost: ~$0.0001-0.0005 per parse (acceptable)

**Alternatives Considered:**
- **More expensive models (gpt-4):** Higher accuracy but 10x cost
- **Other AI providers:** OpenAI has best balance of cost and quality

**Trade-offs:**
- ✅ Handles complex patterns but adds cost
- ✅ High accuracy but depends on external API
- ✅ Used sparingly but still requires API key management

## Testing Strategy

**Decision:** Vitest for unit/integration tests, Playwright for E2E tests.

**Rationale:**
- **Vitest:** Fast, Vite-native, excellent TypeScript support, compatible with SvelteKit
- **Playwright:** Cross-browser testing, real browser environment, excellent debugging tools
- **Coverage target:** ≥80% overall, ≥90% for critical components

**Alternatives Considered:**
- **Jest:** More popular but slower, requires more configuration
- **Cypress:** Good but Playwright has better cross-browser support
- **Testing Library:** Used for component testing (if needed)

**Trade-offs:**
- ✅ Fast tests but requires learning Vitest
- ✅ Comprehensive coverage but requires maintenance
- ✅ Real browser testing but slower than unit tests

## Deployment Decisions

**Decision:** Render for initial deployment, GCP for production (future).

**Rationale:**
- **Render:** Easy setup, free tier available, good for demos
- **GCP:** Scalable, production-ready, better for enterprise use
- **Health check:** `/api/health` endpoint for monitoring

**Build Configuration:**
- Build command: `npm run build`
- Start command: `node build` (or `npm start` depending on adapter)
- Environment variables: `OPENAI_API_KEY`, `NODE_ENV=production`

**Alternatives Considered:**
- **Vercel:** Good for Next.js, less ideal for SvelteKit
- **Netlify:** Good but Render has better Node.js support
- **AWS:** More complex setup, overkill for initial deployment

**Trade-offs:**
- ✅ Easy deployment but may need migration for production
- ✅ Free tier available but limited resources
- ✅ Good for demos but may need scaling for production

## Parallel Processing

**Decision:** NDC fetching and SIG parsing run concurrently.

**Rationale:**
- Both operations are independent
- Reduces total response time
- Critical for meeting <2s response target (P95)

**Implementation:**
- Use `Promise.all()` to run operations in parallel
- Both operations can use cache independently
- Error handling for each operation is independent

**Alternatives Considered:**
- **Sequential:** Simpler but slower (would exceed 2s target)
- **More parallel operations:** Could parallelize more but complexity increases

**Trade-offs:**
- ✅ Faster responses but more complex error handling
- ✅ Better performance but requires careful coordination
- ✅ Meets performance targets but may be harder to debug

## Request Deduplication

**Decision:** Coalesce identical concurrent requests.

**Rationale:**
- Prevents duplicate API calls
- Reduces external API load
- Improves cache hit rates
- Reduces costs (especially for OpenAI API)

**Implementation:**
- `requestDeduplicator.ts` utility
- Tracks in-flight requests by cache key
- Returns same promise for identical requests

**Alternatives Considered:**
- **No deduplication:** Simpler but wasteful
- **More aggressive deduplication:** Could deduplicate across time window, but adds complexity

**Trade-offs:**
- ✅ Reduces API calls but requires request tracking
- ✅ Better performance but adds memory overhead
- ✅ Cost-effective but may mask concurrent request issues

---

**Document Owner:** Development Team  
**Last Updated:** Phase 5 Completion  
**Status:** Complete

