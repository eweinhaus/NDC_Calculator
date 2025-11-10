# Known Limitations

This document outlines known limitations of the NDC Packaging & Quantity Calculator, edge cases not handled, and future improvements planned.

## SIG Parser Coverage

**Limitation:** Regex parser handles approximately 80% of SIG patterns.

**Details:**
- Common patterns (e.g., "Take X tablet(s) [frequency]") are well-covered
- Complex patterns (e.g., multiple dosages, conditional instructions) may require AI fallback
- Very unusual patterns may not be parseable even with AI fallback

**Impact:**
- Most prescriptions work correctly
- Complex prescriptions may require AI fallback (adds cost and latency)
- Very unusual prescriptions may fail to parse

**Workaround:**
- Users can rephrase SIG in simpler format
- AI fallback handles most complex cases
- Error messages guide users to correct format

**Future Improvements:**
- Expand regex pattern library based on real-world usage
- Improve AI prompt for better complex pattern handling
- Add pattern learning from user corrections

## Package Description Parsing

**Limitation:** Some package description formats may not parse correctly.

**Details:**
- Handles 30+ common formats identified in Phase 0 research
- Edge cases include:
  - Unusual multi-pack formats
  - Non-standard unit abbreviations
  - Missing package size information
  - Foreign language descriptions

**Impact:**
- Most packages parse correctly
- Some packages may show "Package size not available"
- May affect NDC ranking accuracy

**Workaround:**
- Manual entry of package size if needed
- FDA API provides package descriptions for reference
- Warnings indicate when package size is missing

**Future Improvements:**
- Expand parser to handle more formats
- Use AI for complex package description parsing
- Learn from user corrections

## API Rate Limits

### FDA API

**Limitation:** 240 requests per minute.

**Details:**
- Rate limit: 240 requests/minute
- Applies to all FDA API endpoints
- Exceeding limit returns 429 status code

**Impact:**
- High traffic may hit rate limits
- Requests may be delayed or fail
- Cache helps reduce API calls

**Workaround:**
- Aggressive caching (24-hour TTL for FDA data)
- Request deduplication reduces duplicate calls
- Retry logic handles 429 errors with backoff

**Future Improvements:**
- Implement rate limit queue
- Add rate limit monitoring and alerts
- Consider API key if available (currently not required)

### RxNorm API

**Limitation:** No documented rate limit, but reasonable delays recommended.

**Details:**
- No official rate limit documented
- Public API, shared resource
- Should use reasonable delays between requests

**Impact:**
- Low risk of rate limiting
- May be slower during high traffic
- No guaranteed SLA

**Workaround:**
- Aggressive caching (7-day TTL for drug names, 24-hour for NDCs)
- Request deduplication
- Retry logic handles transient errors

**Future Improvements:**
- Monitor for rate limit errors
- Implement delays if needed
- Consider caching more aggressively

### OpenAI API

**Limitation:** Usage-based rate limits (depends on account tier).

**Details:**
- Rate limits depend on account tier
- Cost: ~$0.0001-0.0005 per SIG parse
- Used sparingly (only when regex confidence < 0.8)

**Impact:**
- High usage may hit rate limits
- Costs accumulate with usage
- API availability affects fallback parsing

**Workaround:**
- Regex-first approach minimizes AI usage
- Caching parsed SIGs (30-day TTL)
- Error handling for API failures

**Future Improvements:**
- Monitor AI usage and costs
- Consider alternative AI providers
- Improve regex coverage to reduce AI dependency

## Missing FDA Data

**Limitation:** Some NDCs may not have FDA data.

**Details:**
- FDA API may not have data for:
  - Inactive NDCs (removed from directory)
  - Very old NDCs (historical data)
  - NDCs not in FDA directory
- Some NDCs may have partial data (missing package descriptions)

**Impact:**
- Some NDCs cannot be validated
- Package details may be incomplete
- Active status may be unknown

**Workaround:**
- Return null for missing data
- Display warnings for incomplete data
- Users can manually verify NDCs

**Future Improvements:**
- Alternative data sources for missing NDCs
- Historical data lookup
- User feedback for missing data

## Complex SIG Patterns

**Limitation:** Very complex SIG patterns may require AI fallback, which costs money.

**Details:**
- Complex patterns include:
  - Multiple dosages (e.g., "Take 1 tablet in morning, 2 tablets at night")
  - Conditional instructions (e.g., "Take 1-2 tablets as needed")
  - Time-based instructions (e.g., "Take every 6 hours")
  - Special instructions (e.g., "Take with food")

**Impact:**
- Adds cost (~$0.0001-0.0005 per parse)
- Adds latency (500-1000ms for AI call)
- May still fail for very unusual patterns

**Workaround:**
- Regex handles most common patterns
- AI fallback handles most complex cases
- Error messages guide users to simpler format

**Future Improvements:**
- Expand regex patterns for common complex cases
- Improve AI prompt for better accuracy
- Add pattern learning from corrections

## NDC Format Variations

**Limitation:** Handled, but edge cases may exist.

**Details:**
- Supports: 10-digit, 11-digit, with/without dashes
- Normalizes formats automatically
- Edge cases:
  - Invalid NDC formats
  - NDCs with special characters
  - Historical NDC formats

**Impact:**
- Most NDCs work correctly
- Some edge cases may not normalize correctly
- Invalid NDCs may be accepted (will fail API lookup)

**Workaround:**
- Normalization handles most formats
- API lookup validates NDCs
- Error messages indicate invalid formats

**Future Improvements:**
- Expand normalization rules
- Better validation for edge cases
- User feedback for normalization issues

## Unit Conversion Limitations

**Limitation:** Basic unit handling, complex conversions not fully supported.

**Details:**
- Supports: tablets, capsules, mL, L, units, actuations
- Basic unit matching (tablets vs capsules)
- Complex conversions (e.g., mg to tablets) not supported
- Unit mismatches generate warnings but don't block calculation

**Impact:**
- Most units work correctly
- Complex conversions may not be accurate
- Unit mismatches may cause confusion

**Workaround:**
- Users should ensure SIG units match NDC units
- Warnings indicate unit mismatches
- Manual verification recommended for complex cases

**Future Improvements:**
- Add unit conversion library
- Support more unit types
- Better unit mismatch detection

## Browser Support

**Limitation:** Modern browsers only (no IE11 support).

**Details:**
- Supports: Chrome, Firefox, Safari, Edge (latest versions)
- Requires: ES2020+ features, modern CSS
- No support for: IE11, very old browsers

**Impact:**
- Most users have supported browsers
- Very old browsers may not work
- Mobile browsers work correctly

**Workaround:**
- Users should use modern browsers
- Error messages indicate unsupported browsers
- Progressive enhancement for basic functionality

**Future Improvements:**
- Add browser detection and warnings
- Polyfills for older browsers (if needed)
- Better mobile browser support

## Known Edge Cases Not Handled

1. **Multi-drug prescriptions:** Only single drug supported
2. **Compound medications:** Not supported
3. **Special dosage forms:** Limited support (insulin, inhalers partially supported)
4. **Very large quantities:** May not generate optimal multi-pack combinations
5. **Historical NDCs:** May not have FDA data
6. **International NDCs:** Only US NDCs supported
7. **PRN medications:** Assumes once per day (may not be accurate)

**Future Improvements:**
- Multi-drug prescription support
- Compound medication handling
- Better special dosage form support
- Improved multi-pack algorithm for large quantities
- Historical NDC lookup
- International NDC support (if needed)
- Better PRN medication handling

## Performance Limitations

**Limitation:** Response time depends on external APIs.

**Details:**
- Target: <2s (P95) response time
- External APIs may be slow:
  - RxNorm: 200-500ms typical
  - FDA: 300-800ms typical
  - OpenAI: 500-1000ms typical
- Cache helps but first request is slower

**Impact:**
- Cached requests: <100ms (meets target)
- Uncached requests: 1-2s (may exceed target during API slowness)
- Very slow APIs may exceed 2s target

**Workaround:**
- Aggressive caching reduces API calls
- Parallel processing reduces total time
- Request deduplication prevents duplicate calls

**Future Improvements:**
- More aggressive caching
- API response time monitoring
- Fallback to cached data if APIs are slow
- CDN for static assets

## Memory Limitations

**Limitation:** In-memory cache limited to 1000 entries (development).

**Details:**
- LRU eviction when cache is full
- Production should use Redis (unlimited)
- Memory usage grows with cache size

**Impact:**
- Development: Cache may evict entries
- Production: Redis handles unlimited entries
- Memory usage is acceptable

**Workaround:**
- Use Redis in production
- Monitor cache hit rates
- Adjust max entries if needed

**Future Improvements:**
- Better cache eviction strategy
- Cache size monitoring
- Automatic cache cleanup

---

**Document Owner:** Development Team  
**Last Updated:** Phase 5 Completion  
**Status:** Complete

