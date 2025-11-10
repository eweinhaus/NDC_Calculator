# Phase 0 Findings Summary

**Phase:** 0 - API Research & Validation  
**Date:** Phase 0 Completion  
**Status:** Complete

---

## Executive Summary

Phase 0 research validated most assumptions about external APIs while revealing critical differences in implementation approach. The primary finding is that **FDA API should be used for NDC retrieval instead of RxNorm's allndcs endpoint**, which is unreliable.

---

## Assumptions Validated

### ✅ Validated Assumptions

1. **RxNorm API for Drug Normalization**
   - ✅ Drug name → RxCUI lookup works as expected
   - ✅ JSON format available by appending `.json` extension
   - ✅ Spelling suggestions API works for error handling

2. **FDA API for Package Details**
   - ✅ Package lookup works with product_ndc search
   - ✅ Package descriptions available in `packaging[].description` field
   - ✅ Multiple package sizes per product (30, 60, 90, 100 tablets common)
   - ✅ Rate limit confirmed: 240 requests/minute

3. **NDC Format Variations**
   - ✅ Multiple format variations exist (10-digit, 11-digit, with/without dashes)
   - ✅ Normalization to 11-digit format with dashes is feasible
   - ✅ Package code padding required in some cases

4. **OpenAI API for SIG Parsing**
   - ✅ API accessible and functional
   - ✅ Cost is negligible (~$0.00015 per request)
   - ✅ Suitable for fallback parsing

---

## Assumptions Invalidated

### ❌ Invalidated Assumptions

1. **RxNorm allndcs Endpoint**
   - ❌ **Finding:** RxNorm's `/rxcui/{rxcui}/allndcs` endpoint returns empty results for most RxCUIs
   - **Impact:** Cannot rely on RxNorm for NDC retrieval
   - **Solution:** Use FDA API with `search=openfda.rxcui:{rxcui}` instead

2. **RxNorm Strength Property**
   - ❌ **Finding:** `AVAILABLE_STRENGTH` property often returns empty
   - **Impact:** Cannot rely on RxNorm for strength information
   - **Solution:** Use FDA API's `active_ingredients[].strength` field

3. **Response Format**
   - ❌ **Finding:** RxNorm API returns XML by default, not JSON
   - **Impact:** Must append `.json` extension to get JSON format
   - **Solution:** Use `.json` extension for all RxNorm endpoints

---

## Critical Discoveries

### 1. FDA API is Primary Source for NDCs

**Finding:** RxNorm's `allndcs` endpoint is unreliable. FDA API provides comprehensive NDC data with RxCUI mapping via `openfda.rxcui` field.

**Impact:** Implementation flow must change:
- **Original Plan:** RxNorm → RxCUI → RxNorm allndcs → NDCs → FDA details
- **New Plan:** RxNorm → RxCUI → FDA API (search by RxCUI) → NDCs + details

**Recommendation:** Use FDA API as primary source for NDC retrieval.

### 2. Package Description Format Complexity

**Finding:** Package descriptions have extensive format variations:
- Simple: "30 TABLET in 1 BOTTLE"
- Multi-pack: "1 BLISTER PACK in 1 CARTON / 21 TABLET in 1 BLISTER PACK"
- Liquids: "87.1 g in 1 PACKAGE"
- Special formats: sprays, vials, etc.

**Impact:** Parser complexity is higher than anticipated.

**Recommendation:** 
- Start with regex patterns for common formats (80%+ of cases)
- Use AI fallback for complex multi-pack formats
- Handle decimal quantities (87.1 g)

### 3. Active Status Determination

**Finding:** Active/inactive status determined by `listing_expiration_date` field (YYYYMMDD format).

**Impact:** Must compare expiration date with current date to determine active status.

**Recommendation:** Filter by `listing_expiration_date > current_date` for active NDCs.

### 4. NDC Format Normalization Requirements

**Finding:** NDC formats require:
- Leading zero padding for labeler codes
- Package code padding (1-digit → 2-digit)
- Dashes insertion/removal

**Impact:** Normalization algorithm must handle all variations.

**Recommendation:** Implement comprehensive normalization with validation.

---

## Risks Identified

### Risk 1: Package Parser Complexity

**Risk:** Package description formats are more varied than expected.

**Impact:** Medium - Parser may need more complex logic or higher AI fallback usage.

**Mitigation:** 
- Collect diverse samples (30+ formats collected)
- Start with regex for common formats
- Use AI fallback for complex cases
- Test thoroughly with collected samples

### Risk 2: RxNorm allndcs Endpoint Unreliability

**Risk:** Cannot rely on RxNorm for NDC retrieval.

**Impact:** High - Requires implementation flow change.

**Mitigation:** 
- Use FDA API with RxCUI search instead
- Documented in findings
- Implementation plan updated

### Risk 3: Rate Limits

**Risk:** FDA API rate limit (240 req/min) may be restrictive for high-volume scenarios.

**Impact:** Medium - May need request queuing or more aggressive caching.

**Mitigation:** 
- Implement 250ms delay between requests
- Aggressive caching (24 hours TTL)
- Request deduplication
- Monitor rate limit errors

### Risk 4: Missing Data in FDA API

**Risk:** Some NDCs may lack package details or have incomplete data.

**Impact:** Low - Some NDCs may need manual entry or flagging.

**Mitigation:** 
- Document frequency of missing data
- Plan graceful degradation
- Flag missing data in UI

---

## Constraints Discovered

### API Constraints

1. **RxNorm API:**
   - No documented rate limits (but reasonable delays recommended)
   - XML by default, JSON available with `.json` extension
   - `allndcs` endpoint unreliable

2. **FDA API:**
   - Rate limit: 240 requests/minute
   - Response time: ~300-800ms average
   - Comprehensive data available

3. **OpenAI API:**
   - Cost: ~$0.00015 per request
   - Model: gpt-4o-mini (generally available)
   - Requires API key

### Data Constraints

1. **Package Descriptions:**
   - Extensive format variations
   - Multi-pack formats require special parsing
   - Decimal quantities (87.1 g) require decimal handling

2. **NDC Formats:**
   - Multiple format variations
   - Padding requirements for normalization
   - Validation needed

---

## Implementation Recommendations

### 1. API Usage Flow

**Recommended Flow:**
1. Drug name → RxNorm API (get RxCUI)
2. RxCUI → FDA API (search by `openfda.rxcui`) → Get NDCs + package details
3. Parse SIG (regex primary, AI fallback)
4. Calculate quantity and select optimal NDC

**Key Change:** Use FDA API for NDC retrieval, not RxNorm's allndcs endpoint.

### 2. Caching Strategy

**Recommended TTLs:**
- RxNorm (drug → RxCUI): 7 days (validated)
- FDA (NDC details): 24 hours (validated)
- SIG Parsing: 30 days (validated)

**Implementation:**
- Development: In-memory Map with LRU eviction
- Production: Redis (as planned)

### 3. Error Handling

**Recommended Strategies:**
- RxNorm: Handle empty responses gracefully, use spelling suggestions for errors
- FDA: Retry with exponential backoff, handle rate limits
- OpenAI: Fallback to regex if AI fails, retry on rate limits

### 4. Package Parser

**Recommended Approach:**
- Primary: Regex patterns for common formats (80%+ of cases)
- Fallback: AI parsing for complex multi-pack formats
- Handle: Decimal quantities, multi-pack formats, special units

### 5. Performance Optimization

**Recommendations:**
- Implement 250ms delay between FDA API requests (240 req/min)
- Parallel processing: NDC fetch + SIG parsing (as planned)
- Request deduplication (as planned)
- Aggressive caching (as planned)

---

## Test Data Collected

### Minimum Requirements Met

- ✅ **Drug Examples:** 11 examples collected (minimum 10)
- ✅ **SIG Examples:** 22 examples collected (minimum 20)
- ✅ **Package Descriptions:** 30+ examples collected (minimum 30)
- ✅ **NDC Examples:** 12 examples collected

### Data Quality

- All samples are real-world data from API responses
- Covers common and edge cases
- Includes format variations
- Structured JSON format for easy testing

---

## Next Steps

1. **Update Main PRD:** Document findings and updated implementation flow
2. **Phase 1 Preparation:** Use findings to implement utilities
3. **Phase 2 Preparation:** Use findings to implement API services
4. **Phase 3 Preparation:** Use findings to implement parsers

---

## Conclusion

Phase 0 research successfully validated most assumptions while identifying critical implementation changes. The primary change is using FDA API for NDC retrieval instead of RxNorm's unreliable allndcs endpoint. All test data collected, constraints documented, and recommendations provided for Phase 1 implementation.

**Status:** ✅ Complete - Ready for Phase 1

---

**Document Owner:** Development Team  
**Last Updated:** Phase 0 Completion

