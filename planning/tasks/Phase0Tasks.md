# Phase 0 Task List: API Research & Validation

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 0 - API Research & Validation  
**Status:** Not Started  
**Reference:** [Phase 0 PRD](../PRDs/phase-0-api-research.md)

---

## Overview

This task list breaks down Phase 0 into actionable items for validating all external API assumptions before development begins. Each task includes specific test cases, deliverables, and acceptance criteria.

---

## Task 1: RxNorm API Testing

### Objective
Test and document all RxNorm API endpoints with real queries to validate assumptions about response formats, error handling, and behavior.

### Subtasks

#### 1.1: Test Drug Name to RxCUI Lookup
- **Endpoint:** `GET /rxcui?name={drugName}`
- **Test Cases:**
  - Generic drugs: "Lisinopril", "Metformin", "Atorvastatin"
  - Brand names: "Lipitor", "Zoloft", "Prozac"
  - With strength: "Lisinopril 10mg", "Metformin 500mg"
  - Misspelled names: "Lisnopril", "Metforman"
  - Invalid drug names: "NotADrug123"
- **Document:**
  - Response structure (JSON format)
  - Success response example
  - Error response format
  - Multiple match handling
  - Empty result handling
- **Deliverable:** `api-research/rxnorm-api.md` (section: Drug Name Lookup)

#### 1.2: Test RxCUI to NDC List Retrieval
- **Endpoint:** `GET /rxcui/{rxcui}/allndcs`
- **Test Cases:**
  - Valid RxCUI (from Task 1.1 results)
  - Invalid RxCUI: "99999999"
  - RxCUI with many NDCs
  - RxCUI with no NDCs
- **Document:**
  - Response structure
  - NDC format in response (10-digit, 11-digit, with/without dashes)
  - Empty list handling
  - Error scenarios
- **Deliverable:** `api-research/rxnorm-api.md` (section: NDC List Retrieval)

#### 1.3: Test Strength Information Retrieval
- **Endpoint:** `GET /rxcui/{rxcui}/property?propName=AVAILABLE_STRENGTH`
- **Test Cases:**
  - RxCUI with multiple strengths
  - RxCUI with single strength
  - RxCUI without strength property
- **Document:**
  - Response structure
  - Strength format examples
  - Missing property handling
- **Deliverable:** `api-research/rxnorm-api.md` (section: Strength Information)

#### 1.4: Test Spelling Suggestions
- **Endpoint:** `GET /spellingsuggestions?name={drugName}`
- **Test Cases:**
  - Misspelled drug: "Lisnopril"
  - Close match: "Metforman"
  - No suggestions available
- **Document:**
  - Response structure
  - Suggestion format
  - Empty suggestions handling
- **Deliverable:** `api-research/rxnorm-api.md` (section: Spelling Suggestions)

#### 1.5: Test NDC Format Variations via RxNorm
- **Test Cases:**
  - Lookup NDC directly (if supported)
  - Test NDC formats returned: "00002322730", "00002-3227-30", "0002-3227-30"
  - Document all format variations found
- **Deliverable:** `api-research/rxnorm-api.md` (section: NDC Format Handling)

#### 1.6: Document Rate Limits and Performance
- **Tests:**
  - Make 10 sequential requests, measure response times
  - Test concurrent requests (if possible)
  - Identify any rate limiting behavior
  - Document timeout behavior
- **Document:**
  - Average response time
  - Rate limit information (if any)
  - Timeout behavior
  - Recommended retry strategy
- **Deliverable:** `api-research/rxnorm-api.md` (section: Rate Limits & Performance)

### Acceptance Criteria
- ✅ All endpoints tested with multiple test cases
- ✅ Response formats documented with JSON examples
- ✅ Error scenarios identified and documented
- ✅ Rate limit information documented
- ✅ Sample RxCUI values collected for testing

---

## Task 2: FDA NDC Directory API Testing

### Objective
Test FDA NDC Directory API with real NDCs to validate package lookup, description formats, and status fields.

### Subtasks

#### 2.1: Test Single NDC Lookup
- **Endpoint:** `GET /drug/ndc.json?search=product_ndc:{ndc}`
- **Test Cases:**
  - Valid NDC from RxNorm results (Task 1.2)
  - 10-digit NDC format: "00002322730"
  - 11-digit NDC format: "00002-3227-30"
  - Invalid NDC: "99999999999"
  - Inactive/discontinued NDC
- **Document:**
  - Response structure
  - Package description field format
  - Active/inactive status field
  - Manufacturer field
  - Dosage form field
  - Missing data handling
- **Deliverable:** `api-research/fda-api.md` (section: Single NDC Lookup)

#### 2.2: Test Multiple Packages for NDC
- **Endpoint:** `GET /drug/ndc.json?search=product_ndc:{ndc}&limit=100`
- **Test Cases:**
  - NDC with single package
  - NDC with multiple package sizes (30, 60, 90, 100 tablets)
  - Different dosage forms (tablets, capsules, liquids)
- **Document:**
  - Response structure for multiple results
  - Package count variations
  - Package description variations
- **Deliverable:** `api-research/fda-api.md` (section: Multiple Packages)

#### 2.3: Collect Package Description Format Samples
- **Test Cases:**
  - Simple: "30 TABLET in 1 BOTTLE"
  - With dashes: "60 CAPSULE in 1 BOTTLE"
  - Multi-pack: "3 x 30 TABLET in 1 PACKAGE"
  - Complex: "100 TABLET in 1 BOTTLE (NDC: 00002-3227-30)"
  - Liquid: "500 mL in 1 BOTTLE"
  - Special formats (inhalers, patches, etc.)
- **Collect:** Minimum 30 unique package description formats
- **Document:**
  - All format variations found
  - Edge cases
  - Parsing challenges identified
- **Deliverable:** `test-data/package-descriptions.json` + `api-research/fda-api.md` (section: Package Description Formats)

#### 2.4: Test Active/Inactive Status Field
- **Test Cases:**
  - Active NDC status field
  - Inactive/discontinued NDC status
  - Missing status field
- **Document:**
  - Status field name and values
  - How to identify inactive NDCs
  - Frequency of inactive NDCs in results
- **Deliverable:** `api-research/fda-api.md` (section: Status Fields)

#### 2.5: Test Rate Limits
- **Tests:**
  - Verify 240 requests/minute limit
  - Test rate limit error response
  - Measure response times
  - Test retry behavior
- **Document:**
  - Confirmed rate limit
  - Rate limit error format
  - Recommended retry strategy
  - Timeout recommendations
- **Deliverable:** `api-research/fda-api.md` (section: Rate Limits)

### Acceptance Criteria
- ✅ Package lookup tested and working
- ✅ Minimum 30 package description formats collected
- ✅ Active/inactive status field confirmed
- ✅ Rate limits verified (240 req/min)
- ✅ Missing data scenarios documented

---

## Task 3: NDC Format Normalization Testing

### Objective
Test and document NDC format variations to define normalization requirements.

### Subtasks

#### 3.1: Test Input Format Variations
- **Test Cases:**
  - 10-digit: "00002322730"
  - 11-digit with dashes: "00002-3227-30"
  - 10-digit with dashes: "0002-3227-30"
  - Without leading zeros: "2-3227-30"
  - Invalid formats: "123", "abc-123-def"
- **Document:**
  - All format variations found
  - Valid vs invalid formats
  - Edge cases
- **Deliverable:** `api-research/ndc-normalization.md` (section: Format Variations)

#### 3.2: Define Normalization Rules
- **Requirements:**
  - Target format: 11-digit with dashes (5-4-2)
  - Handle missing leading zeros
  - Validate NDC structure (labeler-product-package)
  - Conversion rules for each format
- **Document:**
  - Normalization algorithm requirements
  - Conversion examples
  - Validation rules
- **Deliverable:** `api-research/ndc-normalization.md` (section: Normalization Rules)

#### 3.3: Create Test Cases
- **Create:**
  - Test cases for each format variation
  - Expected output for each input
  - Edge case test cases
- **Deliverable:** `test-data/ndc-normalization-test-cases.json`

### Acceptance Criteria
- ✅ All format variations tested
- ✅ Normalization requirements clearly defined
- ✅ Conversion rules documented
- ✅ Test cases created

---

## Task 4: API Rate Limits & Constraints

### Objective
Document rate limits, performance characteristics, and constraints for all external APIs.

### Subtasks

#### 4.1: RxNorm API Constraints
- **Investigation:**
  - Test concurrent requests
  - Measure response times (average, P95)
  - Identify rate limits (if any)
  - Document timeout behavior
  - Test error scenarios
- **Document:**
  - Rate limit information
  - Response time metrics
  - Timeout behavior
  - Recommended retry strategy
  - Error handling recommendations
- **Deliverable:** `api-research/rxnorm-api.md` (section: Constraints & Limits)

#### 4.2: FDA API Constraints
- **Investigation:**
  - Verify 240 requests/minute limit
  - Test rate limit error responses
  - Measure response times
  - Test retry strategies
  - Document timeout behavior
- **Document:**
  - Confirmed rate limit
  - Rate limit error format
  - Response time metrics
  - Recommended retry strategy (exponential backoff)
  - Timeout recommendations
- **Deliverable:** `api-research/fda-api.md` (section: Constraints & Limits)

#### 4.3: OpenAI API Validation
- **Investigation:**
  - Verify API key setup
  - Test single request with gpt-4o-mini
  - Document response format
  - Calculate cost per request
  - Verify model availability
  - Test error scenarios
- **Document:**
  - API setup requirements
  - Response format
  - Cost per request estimate
  - Model availability
  - Error handling
  - Recommended usage patterns (fallback only)
- **Deliverable:** `api-research/openai-api.md`

### Acceptance Criteria
- ✅ Rate limits documented for all APIs
- ✅ Recommended retry strategies defined
- ✅ Timeout recommendations provided
- ✅ Cost estimates for OpenAI usage
- ✅ Performance characteristics documented

---

## Task 5: Data Sample Collection

### Objective
Collect real-world data samples needed for parser development and testing.

### Subtasks

#### 5.1: Collect Drug Examples
- **Requirements:**
  - Minimum 10 drug examples
  - Mix of generic and brand names
  - Various dosage forms (tablets, capsules, liquids)
  - Common medications
- **Collect:**
  - Drug name
  - RxCUI (from RxNorm)
  - Associated NDCs
  - Strength information
  - Dosage form
- **Deliverable:** `test-data/drug-samples.json`

#### 5.2: Collect SIG Examples
- **Requirements:**
  - Minimum 20 SIG examples
  - Simple patterns: "Take 1 tablet by mouth twice daily"
  - Complex patterns: "Take 2 tablets by mouth every 12 hours with food"
  - Edge cases: PRN, "as needed", multiple dosages, special instructions
- **Collect:**
  - SIG text
  - Expected parsed result (dosage, frequency, unit)
  - Complexity level (simple/complex)
- **Deliverable:** `test-data/sig-samples.json`

#### 5.3: Collect Package Description Examples
- **Requirements:**
  - Minimum 30 package description examples
  - Various formats from FDA API
  - Multi-pack variations
  - Edge cases for parser testing
- **Collect:**
  - Package description text
  - Expected parsed quantity
  - Format type
  - Source NDC
- **Deliverable:** `test-data/package-descriptions.json` (expanded from Task 2.3)

#### 5.4: Collect NDC Examples
- **Requirements:**
  - Various NDC formats
  - Active and inactive examples
  - Different package sizes
- **Collect:**
  - NDC in various formats
  - Normalized format
  - Package size
  - Active status
- **Deliverable:** `test-data/ndc-samples.json`

### Acceptance Criteria
- ✅ Minimum 10 drug examples collected
- ✅ Minimum 20 SIG examples collected
- ✅ Minimum 30 package descriptions collected
- ✅ All samples stored in structured JSON format
- ✅ Samples cover common and edge cases

---

## Task 6: Findings Documentation

### Objective
Synthesize all research findings into actionable documentation for Phase 1 development.

### Subtasks

#### 6.1: Create Findings Summary
- **Document:**
  - Assumptions validated
  - Assumptions invalidated
  - Risks identified
  - Constraints discovered
  - Implementation recommendations
- **Deliverable:** `api-research/findings.md`

#### 6.2: Update Assumptions
- **Review:**
  - All assumptions from main PRD
  - Update based on findings
  - Document changes needed
- **Deliverable:** `api-research/assumptions-update.md`

#### 6.3: Create Implementation Recommendations
- **Document:**
  - Recommended API usage patterns
  - Caching strategy adjustments (if needed)
  - Error handling recommendations
  - Performance optimizations
  - Parser complexity estimates
- **Deliverable:** `api-research/implementation-recommendations.md`

### Acceptance Criteria
- ✅ All assumptions validated or corrected
- ✅ Risks identified and documented
- ✅ Implementation recommendations provided
- ✅ Ready for Phase 1 development

---

## Deliverables Summary

### API Documentation
- `api-research/rxnorm-api.md` - Complete RxNorm API findings
- `api-research/fda-api.md` - Complete FDA API findings
- `api-research/openai-api.md` - OpenAI API findings
- `api-research/ndc-normalization.md` - NDC format normalization requirements
- `api-research/findings.md` - Summary of all discoveries
- `api-research/assumptions-update.md` - Updated assumptions
- `api-research/implementation-recommendations.md` - Recommendations for Phase 1

### Test Data
- `test-data/drug-samples.json` - Drug name examples with RxCUIs
- `test-data/sig-samples.json` - SIG text examples
- `test-data/package-descriptions.json` - Package description examples
- `test-data/ndc-samples.json` - NDC examples with formats
- `test-data/ndc-normalization-test-cases.json` - NDC normalization test cases

---

## Overall Acceptance Criteria

**AC-0.1: RxNorm API Validated**
- ✅ All endpoints tested and documented
- ✅ Response formats documented with examples
- ✅ Error scenarios identified and documented
- ✅ Rate limits understood

**AC-0.2: FDA API Validated**
- ✅ Package lookup tested and working
- ✅ Package description formats collected (30+)
- ✅ Active/inactive status field confirmed
- ✅ Rate limits verified (240 req/min)

**AC-0.3: NDC Formats Documented**
- ✅ All format variations tested
- ✅ Normalization requirements clear
- ✅ Conversion rules defined

**AC-0.4: Test Data Collected**
- ✅ Minimum 10 drug examples
- ✅ Minimum 20 SIG examples
- ✅ Minimum 30 package descriptions
- ✅ All samples stored in structured format

**AC-0.5: Findings Documented**
- ✅ All assumptions validated or corrected
- ✅ Risks identified
- ✅ Implementation recommendations provided
- ✅ Ready for Phase 1 development

---

## Notes

- Use Postman, curl, or similar API testing tool
- Save all API responses as examples
- Document any unexpected behavior
- Test edge cases thoroughly
- Validate JSON structure of all responses
- Keep detailed notes for each test case

---

**Status:** ✅ Completed  
**Last Updated:** Phase 0 Completion  
**Completion Date:** Phase 0 Research  
**Next Steps:** Proceed to Phase 1 - Foundation & Core Utilities

