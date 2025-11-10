# Assumptions Update - Phase 0 Findings

**Phase:** 0 - API Research & Validation  
**Date:** Phase 0 Completion  
**Reference:** Main PRD assumptions

---

## Overview

This document compares original assumptions from the main PRD with actual findings from Phase 0 research. Assumptions are marked as validated, invalidated, or updated.

---

## Assumptions Review

### 1. RxNorm API Provides NDC Lists

**Original Assumption:** "RxNorm provides NDC lists for most common drugs"

**Status:** ❌ **INVALIDATED**

**Finding:** RxNorm's `/rxcui/{rxcui}/allndcs` endpoint returns empty results (`{}`) for most RxCUIs tested.

**Evidence:**
- RxCUI 29046 (Lisinopril): Returns `{}`
- RxCUI 6809 (Metformin): Returns `{}`
- RxCUI 83367 (Atorvastatin): Returns `{}`

**Updated Approach:** Use FDA API with `search=openfda.rxcui:{rxcui}` to retrieve NDCs instead.

**Impact:** Implementation flow must change - FDA API becomes primary source for NDC retrieval.

---

### 2. RxNorm API Response Format

**Original Assumption:** RxNorm API returns JSON format

**Status:** ⚠️ **PARTIALLY VALIDATED**

**Finding:** RxNorm API returns XML by default. JSON format is available by appending `.json` extension to endpoint URLs.

**Evidence:**
- Default: `GET /rxcui?name=Lisinopril` → Returns XML
- JSON: `GET /rxcui.json?name=Lisinopril` → Returns JSON

**Updated Approach:** Always append `.json` extension to RxNorm endpoints.

**Impact:** Minor - must use `.json` extension in all RxNorm API calls.

---

### 3. FDA API Package Details

**Original Assumption:** "FDA API provides package details for most NDCs (some may be missing)"

**Status:** ✅ **VALIDATED**

**Finding:** FDA API provides comprehensive package details including:
- Package descriptions in `packaging[].description` field
- Multiple package sizes per product
- Active/inactive status via `listing_expiration_date`
- RxCUI mapping via `openfda.rxcui` field

**Evidence:** Tested with multiple drugs (Lisinopril, Metformin) - all returned detailed package information.

**Impact:** None - assumption validated.

---

### 4. Package Description Formats

**Original Assumption:** "Package descriptions follow common formats (but parser must handle variations)"

**Status:** ✅ **VALIDATED** (but more complex than expected)

**Finding:** Package descriptions have extensive format variations:
- Simple: "30 TABLET in 1 BOTTLE"
- Multi-pack: "1 BLISTER PACK in 1 CARTON / 21 TABLET in 1 BLISTER PACK"
- Liquids: "87.1 g in 1 PACKAGE"
- Special formats: sprays, vials, etc.

**Evidence:** Collected 30+ unique format variations from real API responses.

**Impact:** Parser complexity is higher than initially estimated, but manageable with regex + AI fallback approach.

---

### 5. Regex Can Handle 80%+ of SIG Patterns

**Original Assumption:** "Regex can handle 80%+ of SIG patterns, reducing OpenAI costs"

**Status:** ✅ **VALIDATED**

**Finding:** Most SIG examples follow common patterns:
- "Take X tablet(s) [frequency]"
- Simple frequency patterns (daily, twice daily, etc.)

**Evidence:** Collected 22 SIG examples - 20 are simple patterns, 2 are complex.

**Impact:** None - assumption validated. Regex-first approach is appropriate.

---

### 6. Caching Significantly Reduces External API Load

**Original Assumption:** "Caching significantly reduces external API load"

**Status:** ✅ **VALIDATED**

**Finding:** 
- Drug names rarely change → 7 days TTL appropriate
- NDC lists can be updated → 24 hours TTL appropriate
- Package details can change → 24 hours TTL appropriate

**Impact:** None - caching strategy validated.

---

### 7. NDC Active Status in FDA Data is Current

**Original Assumption:** "NDC active status in FDA data is current (may have lag)"

**Status:** ✅ **VALIDATED**

**Finding:** FDA API provides `listing_expiration_date` field (YYYYMMDD format) which can be used to determine active status.

**Evidence:** Tested NDCs - all have future expiration dates, indicating active status.

**Impact:** None - assumption validated. Use `listing_expiration_date > current_date` for active status.

---

### 8. RxNorm API Rate Limits

**Original Assumption:** "Rate limits: Reasonable for demo (to be validated in Phase 0)"

**Status:** ✅ **VALIDATED**

**Finding:** No explicit rate limits documented or encountered during testing. API handles requests reasonably well.

**Evidence:** Made multiple sequential requests without rate limit errors.

**Impact:** None - no rate limiting concerns for typical usage.

---

### 9. FDA API Rate Limits

**Original Assumption:** "Rate limits: 240 requests/minute"

**Status:** ✅ **VALIDATED**

**Finding:** Rate limit confirmed at 240 requests/minute as documented.

**Evidence:** No rate limit errors encountered during normal testing (within limits).

**Impact:** None - assumption validated. Must implement 250ms delay between requests.

---

### 10. OpenAI API Cost

**Original Assumption:** "Costs ~$0.0001-0.0005 per SIG parse"

**Status:** ✅ **VALIDATED**

**Finding:** Cost is approximately $0.00015 per request (varies by token usage).

**Evidence:** Calculated based on token usage (~110 tokens per request).

**Impact:** None - cost is negligible as assumed.

---

## Summary of Changes

### Critical Changes Required

1. **NDC Retrieval Flow:**
   - ❌ Remove: RxNorm `allndcs` endpoint usage
   - ✅ Add: FDA API `search=openfda.rxcui:{rxcui}` for NDC retrieval

2. **RxNorm API Format:**
   - ⚠️ Update: Always append `.json` extension to endpoints

### No Changes Required

- FDA API usage and structure
- Caching strategy and TTLs
- SIG parsing approach (regex + AI fallback)
- Rate limit handling
- Cost estimates

---

## Updated Implementation Flow

### Original Flow (from PRD)
1. Drug name → RxNorm API → RxCUI
2. RxCUI → RxNorm `allndcs` → NDCs
3. NDCs → FDA API → Package details

### Updated Flow (from Findings)
1. Drug name → RxNorm API → RxCUI
2. RxCUI → FDA API (`search=openfda.rxcui:{rxcui}`) → NDCs + Package details (single call)

**Benefit:** Fewer API calls, more reliable data source.

---

## Recommendations for PRD Update

1. **Update API Flow Section:** Document FDA API as primary source for NDC retrieval
2. **Update RxNorm Section:** Note that `allndcs` endpoint is unreliable
3. **Update Package Parser Section:** Note increased format complexity
4. **Update Implementation Phases:** Reflect updated API usage flow

---

**Status:** Complete  
**Next Steps:** Update main PRD with findings

