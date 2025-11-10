# Phase 0 PRD: API Research & Validation

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 0 - API Research & Validation  
**Duration:** Day 0 (1 day)  
**Status:** Pre-Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 0 is a **critical validation phase** that must be completed before any development begins. This phase validates all external API assumptions, documents actual API behavior, and collects real-world data samples needed for implementation. Skipping this phase risks building on incorrect assumptions and requiring significant rework.

**Key Objectives:**
- Validate RxNorm API endpoints and response formats
- Test FDA NDC Directory API with real NDCs
- Document actual API behavior vs. assumptions
- Collect sample data for parser development
- Identify rate limits and constraints

---

## Objectives

1. **API Endpoint Validation:** Verify all RxNorm and FDA API endpoints work as expected
2. **Response Format Documentation:** Document actual JSON response structures
3. **Rate Limit Discovery:** Identify and document rate limits for each API
4. **Data Sample Collection:** Gather real NDC data and package descriptions for testing
5. **NDC Format Testing:** Validate NDC format normalization requirements
6. **Error Response Documentation:** Document error scenarios and responses

---

## Tasks

### Task 1: RxNorm API Testing

**Endpoints to Test:**
- `GET /rxcui?name={drugName}` - Drug name to RxCUI lookup
- `GET /rxcui/{rxcui}/allndcs` - RxCUI to NDC list
- `GET /rxcui/{rxcui}/property?propName=AVAILABLE_STRENGTH` - Strength information
- `GET /spellingsuggestions?name={drugName}` - Spelling suggestions

**Test Cases:**
1. **Valid Drug Names:**
   - Generic: "Lisinopril", "Metformin", "Atorvastatin"
   - Brand: "Lipitor", "Zoloft", "Prozac"
   - With strength: "Lisinopril 10mg", "Metformin 500mg"

2. **Edge Cases:**
   - Misspelled drug names
   - Multiple matches (brand vs generic)
   - Drugs with no NDCs
   - Invalid RxCUI values

3. **NDC Format Variations:**
   - 10-digit: "00002322730"
   - 11-digit: "00002-3227-30"
   - With dashes: "0002-3227-30"
   - Test NDC lookup via RxNorm

**Deliverables:**
- Documented API response examples (JSON)
- Rate limit information
- Error response formats
- Sample RxCUI values for testing

---

### Task 2: FDA NDC Directory API Testing

**Endpoints to Test:**
- `GET /drug/ndc.json?search=product_ndc:{ndc}` - Single NDC lookup
- `GET /drug/ndc.json?search=product_ndc:{ndc}&limit=100` - All packages for NDC

**Test Cases:**
1. **Valid NDCs:**
   - Test with NDCs from RxNorm results
   - Test various package sizes (30, 60, 90, 100 tablets)
   - Test different dosage forms (tablets, capsules, liquids)

2. **Package Description Formats:**
   - "30 TABLET in 1 BOTTLE"
   - "60 CAPSULE in 1 BOTTLE"
   - "3 x 30 TABLET in 1 PACKAGE"
   - "100 TABLET in 1 BOTTLE (NDC: 00002-3227-30)"
   - Complex multi-pack formats

3. **Status Fields:**
   - Active vs inactive NDCs
   - Discontinued products
   - Missing package data

**Deliverables:**
- Sample package descriptions (20+ variations)
- Active/inactive status field documentation
- Manufacturer field examples
- Dosage form field examples
- Missing data handling documentation

---

### Task 3: NDC Format Normalization Testing

**Test Scenarios:**
1. **Input Formats:**
   - `00002322730` (10-digit)
   - `00002-3227-30` (11-digit with dashes)
   - `0002-3227-30` (10-digit with dashes)
   - `2-3227-30` (without leading zeros)

2. **Normalization Rules:**
   - Convert all to 11-digit format
   - Handle missing leading zeros
   - Validate NDC structure (labeler-product-package)

**Deliverables:**
- Normalization algorithm requirements
- Test cases for format conversion
- Edge cases documentation

---

### Task 4: API Rate Limits & Constraints

**Investigation:**
1. **RxNorm API:**
   - Test concurrent requests
   - Measure response times
   - Identify rate limits (if any)
   - Document timeout behavior

2. **FDA API:**
   - Verify 240 requests/minute limit
   - Test rate limit error responses
   - Document retry strategies

3. **OpenAI API:**
   - Verify API key setup
   - Test single request
   - Document cost per request
   - Verify model availability (gpt-4o-mini)

**Deliverables:**
- Rate limit documentation
- Recommended retry strategies
- Timeout recommendations
- Cost estimates for OpenAI usage

---

### Task 5: Data Sample Collection

**Collect Real-World Samples:**
1. **Drug Examples (10+):**
   - Common medications with various NDC formats
   - Brand and generic versions
   - Different dosage forms

2. **SIG Examples (20+):**
   - Simple: "Take 1 tablet by mouth twice daily"
   - Complex: "Take 2 tablets by mouth every 12 hours with food"
   - Edge cases: PRN, "as needed", multiple dosages

3. **Package Descriptions (30+):**
   - Various formats from FDA API
   - Multi-pack variations
   - Edge cases for parser testing

**Deliverables:**
- `test-data/` directory with sample files
- `drug-samples.json` - Drug name examples
- `sig-samples.json` - SIG text examples
- `package-descriptions.json` - Package description examples
- `ndc-samples.json` - NDC examples with formats

---

## Deliverables

1. **API Documentation:**
   - `api-research/rxnorm-api.md` - RxNorm API findings
   - `api-research/fda-api.md` - FDA API findings
   - `api-research/openai-api.md` - OpenAI API findings

2. **Test Data:**
   - `test-data/drug-samples.json`
   - `test-data/sig-samples.json`
   - `test-data/package-descriptions.json`
   - `test-data/ndc-samples.json`

3. **Findings Report:**
   - `api-research/findings.md` - Summary of discoveries
   - Assumptions validated vs. invalidated
   - Risks and constraints identified
   - Recommendations for implementation

---

## Acceptance Criteria

**AC-0.1: RxNorm API Validated**
- All endpoints tested and documented
- Response formats documented with examples
- Error scenarios identified and documented
- Rate limits understood

**AC-0.2: FDA API Validated**
- Package lookup tested and working
- Package description formats collected
- Active/inactive status field confirmed
- Rate limits verified (240 req/min)

**AC-0.3: NDC Formats Documented**
- All format variations tested
- Normalization requirements clear
- Conversion rules defined

**AC-0.4: Test Data Collected**
- Minimum 10 drug examples
- Minimum 20 SIG examples
- Minimum 30 package descriptions
- All samples stored in structured format

**AC-0.5: Findings Documented**
- All assumptions validated or corrected
- Risks identified
- Implementation recommendations provided
- Ready for Phase 1 development

---

## Dependencies

**External:**
- Access to RxNorm API (public, no key required)
- Access to FDA NDC Directory API (public, no key required)
- OpenAI API key (for validation only)

**Tools:**
- Postman, curl, or similar API testing tool
- Text editor for documentation
- JSON validator for test data

---

## Risks & Considerations

**Risk 1: API Assumptions Incorrect**
- **Impact:** High - Could require significant rework
- **Mitigation:** Test thoroughly, document everything
- **Contingency:** Adjust implementation plan based on findings

**Risk 2: Rate Limits Too Restrictive**
- **Impact:** Medium - May need more aggressive caching
- **Mitigation:** Document limits, plan caching strategy
- **Contingency:** Implement request queuing if needed

**Risk 3: Package Description Formats Unpredictable**
- **Impact:** Medium - Parser may need more complex logic
- **Mitigation:** Collect diverse samples, plan for edge cases
- **Contingency:** Use AI fallback for complex parsing

**Risk 4: Missing Data in FDA API**
- **Impact:** Low - Some NDCs may lack package details
- **Mitigation:** Document frequency, plan graceful degradation
- **Contingency:** Flag missing data, allow manual entry

---

## Success Metrics

- ✅ All API endpoints validated and documented
- ✅ Test data collected (minimum thresholds met)
- ✅ Assumptions validated or corrected
- ✅ Implementation risks identified
- ✅ Ready to proceed to Phase 1

---

## Next Steps

Upon completion of Phase 0:
1. Review findings with team
2. Update main PRD if assumptions changed
3. Adjust Phase 1 tasks based on discoveries
4. Begin Phase 1: Foundation & Core Utilities

---

**Document Owner:** Development Team  
**Last Updated:** Phase 0 Start  
**Status:** Pre-Development

