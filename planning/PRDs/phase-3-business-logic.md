# Phase 3 PRD: Core Business Logic

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 3 - Core Business Logic  
**Duration:** Days 5-6  
**Status:** Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 3 implements the core business logic: SIG parsing (regex primary, AI fallback), quantity calculation, NDC selection with ranking algorithm, multi-pack support, and warning generation. This phase transforms raw API data into actionable prescription recommendations. All logic must be thoroughly tested and handle edge cases gracefully.

**Key Deliverables:**
- Regex-based SIG parser (primary)
- OpenAI SIG parser (fallback)
- SIG parser orchestrator
- Quantity calculator
- NDC selector with ranking
- Multi-pack combination generator
- Warning generation logic

---

## Objectives

1. **SIG Parsing:** Parse prescription instructions with regex (primary) and AI (fallback)
2. **Quantity Calculation:** Calculate total quantity from parsed SIG and days' supply
3. **NDC Selection:** Rank and select optimal NDCs based on quantity
4. **Multi-Pack Support:** Generate multi-pack combinations when needed
5. **Warning Generation:** Create warnings for inactive NDCs, overfills, underfills, mismatches

---

## Tasks

### Task 1: Regex-Based SIG Parser

**File:** `lib/core/regexSigParser.ts`

**Purpose:** Primary SIG parser handling 80%+ of common patterns

**Patterns to Handle:**
- "Take X [unit] [route] [frequency] [timing]"
- "X [unit] [route] [frequency]"
- "X [unit] every X hours"
- "X [unit] X times daily"
- "X [unit] twice daily"
- "X [unit] once daily"

**Function:** `parse(sig: string): ParsedSig | null` - Parse SIG with confidence score

**ParsedSig:** dosage (number), frequency (number per day), unit (string), confidence (0-1)

**Pattern File:** `lib/constants/sigPatterns.ts`
- Define all regex patterns
- Pattern priority (most specific first)
- Unit extraction patterns
- Frequency extraction patterns

**Supported Units:**
- Tablets, capsules, pills
- mL, L (liquids)
- Units (insulin, etc.)
- Actuations (inhalers)

**Confidence Scoring:**
- Exact pattern match: 0.9-1.0
- Partial match: 0.7-0.9
- Low confidence: <0.7 (triggers AI fallback)

**Deliverables:**
- Complete regex parser implementation
- Pattern constants file
- Unit tests with ≥90% coverage
- Handles common patterns from Phase 0 test data

---

### Task 2: OpenAI SIG Parser (Fallback)

**File:** `lib/core/openaiSigParser.ts`

**Purpose:** Fallback parser for complex SIG patterns when regex confidence < 0.8

**Integration:**
- Uses OpenAI service from Phase 2
- Only called when regex parser confidence < 0.8
- Returns structured ParsedSig

**Prompt Engineering:**
```
Parse the following prescription instruction and return ONLY valid JSON:
{
  "dosage": number,
  "frequency": number (per day),
  "unit": string,
  "confidence": number (0-1)
}

SIG: "{sig}"

Rules:
- dosage must be > 0
- frequency must be > 0 (per day)
- unit must be one of: tablet, capsule, pill, mL, L, unit, actuation
- confidence should reflect parsing certainty
```

**Error Handling:**
- Invalid JSON response → return null
- Missing fields → return null
- Invalid values → return null
- Log errors for debugging

**Deliverables:**
- OpenAI parser implementation
- Prompt optimization
- Error handling complete
- Integration tests

---

### Task 3: SIG Parser Orchestrator

**File:** `lib/core/sigParser.ts`

**Purpose:** Orchestrates regex and AI parsers, manages caching

**Flow:**
1. Check cache for normalized SIG
2. Try regex parser first
3. If confidence ≥ 0.8, return result
4. If confidence < 0.8, try OpenAI parser
5. Cache result (30 days TTL)
6. Return parsed SIG or null

**Function:** `parse(sig: string): Promise<ParsedSig | null>` - Orchestrate regex and AI parsers

**Caching:**
- Cache key: `sig:parse:{normalizedSig}`
- Normalize SIG: lowercase, trim, remove extra spaces
- TTL: 30 days (2592000 seconds)

**Validation:**
- Dosage > 0
- Frequency > 0
- Unit is valid
- Confidence is 0-1

**Deliverables:**
- Complete orchestrator implementation
- Caching integrated
- Validation working
- Error handling complete

---

### Task 4: Quantity Calculator

**File:** `lib/core/quantityCalculator.ts`

**Purpose:** Calculate total quantity from parsed SIG and days' supply

**Formula:**
```
totalQuantity = (dosage × frequency) × daysSupply
```

**Function:** `calculate(parsedSig: ParsedSig, daysSupply: number): QuantityResult` - Calculate total quantity

**QuantityResult:** total, unit, calculation {dosage, frequency, daysSupply}

**Unit Handling:**
- Preserve unit from parsed SIG
- Validate unit matches dosage form (if available)
- Handle unit conversions if needed (future)

**Edge Cases:**
- PRN medications (frequency = 0) → handle separately
- Very large quantities (>365 days) → warn
- Fractional results → round appropriately

**Deliverables:**
- Complete quantity calculator
- Unit handling working
- Edge cases handled
- Unit tests with ≥90% coverage

---

### Task 5: NDC Selector with Ranking

**File:** `lib/core/ndcSelector.ts`

**Purpose:** Select and rank optimal NDCs based on calculated quantity

**Ranking Algorithm:**
1. **Exact Match:** Package size = calculated quantity (score: 100)
2. **Near Match:** Package size within 5% of quantity (score: 90-99)
3. **Overfill:** Package size > quantity (score: 80-89, penalized by overfill %)
4. **Underfill:** Package size < quantity (score: 70-79, penalized by underfill %)
5. **Multi-Pack:** Multi-pack combinations (score: 85-95)

**Ranking Factors:**
- Exactness (primary)
- Package count (fewer packages preferred)
- Overfill amount (less waste preferred)
- Underfill amount (less shortage preferred)

**Function:** `selectOptimal(ndcList: NdcInfo[], targetQuantity: number, maxResults?: number): NdcSelection[]` - Select and rank NDCs

**NdcSelection:** ndc, packageSize, packageCount?, totalQuantity, overfill, underfill, matchScore

**Filtering:**
- Filter out inactive NDCs (flag as warnings, don't include in results)
- Filter by dosage form match (if available)
- Prioritize active NDCs

**Deliverables:**
- Complete NDC selector implementation
- Ranking algorithm working
- Multi-pack support (see Task 6)
- Unit tests with ≥90% coverage

---

### Task 6: Multi-Pack Combination Generator

**File:** `lib/core/multiPackGenerator.ts` (or part of ndcSelector.ts)

**Purpose:** Generate multi-pack combinations when single package insufficient

**Algorithm:**
1. For each NDC, calculate packages needed: `Math.ceil(targetQuantity / packageSize)`
2. Calculate total quantity: `packageCount × packageSize`
3. Calculate overfill: `totalQuantity - targetQuantity`
4. Rank by: package count (fewer preferred), overfill (less preferred)

**Example:**
- Target: 90 tablets
- Available: 30-tablet packages
- Solution: 3 × 30 tablets = 90 tablets (exact match)

**Function:** `generateCombination(ndc: NdcInfo, targetQuantity: number): NdcSelection | null` - Generate multi-pack combinations

**Integration:**
- Integrated into NDC selector ranking
- Considered alongside single-pack options
- Ranked using same scoring algorithm

**Deliverables:**
- Multi-pack generator implementation
- Integrated with NDC selector
- Unit tests with ≥90% coverage

---

### Task 7: Warning Generation Logic

**File:** `lib/core/warningGenerator.ts`

**Purpose:** Generate warnings for various scenarios

**Warning Types:**
1. **Inactive NDC:** NDC is marked inactive in FDA data
2. **Overfill:** Recommended package results in >10% waste
3. **Underfill:** Recommended package insufficient (requires multiple)
4. **Dosage Form Mismatch:** SIG unit doesn't match NDC dosage form

**Function:** `generateWarnings(selection: NdcSelection, targetQuantity: number, parsedSig: ParsedSig, ndcInfo: NdcInfo): Warning[]` - Generate warnings

**Warning:** type (inactive_ndc|overfill|underfill|dosage_form_mismatch), message, severity (error|warning|info)

**Warning Logic:**
- **Inactive NDC:** Check `ndcInfo.active === false` → error severity
- **Overfill:** Calculate `(overfill / targetQuantity) × 100` → warning if >10%
- **Underfill:** Check if `totalQuantity < targetQuantity` → warning
- **Dosage Form Mismatch:** Compare `parsedSig.unit` with `ndcInfo.dosageForm` → warning

**Message Formatting:**
- Clear, user-friendly messages
- Include relevant numbers (overfill %, package count, etc.)
- Actionable guidance when possible

**Deliverables:**
- Complete warning generator
- All warning types implemented
- Message formatting complete
- Unit tests with ≥90% coverage

---

## Deliverables Summary

1. **SIG Parsing:**
   - Regex parser (primary)
   - OpenAI parser (fallback)
   - Parser orchestrator

2. **Quantity Calculation:**
   - Quantity calculator
   - Unit handling

3. **NDC Selection:**
   - NDC selector with ranking
   - Multi-pack generator
   - Warning generator

4. **Integration:**
   - All components work together
   - Caching integrated
   - Error handling complete

---

## Acceptance Criteria

**AC-3.1: Regex SIG Parser Working**
- Parses 80%+ of common patterns
- Confidence scoring accurate
- Unit tests pass (≥90% coverage)
- Handles test cases from Phase 0

**AC-3.2: OpenAI SIG Parser Working**
- Fallback parser functional
- Only called when regex confidence < 0.8
- Error handling complete
- Integration tests pass

**AC-3.3: SIG Parser Orchestrator Working**
- Tries regex first, AI if needed
- Caching integrated (30 days TTL)
- Validation working
- Error handling complete

**AC-3.4: Quantity Calculator Working**
- Formula correct: (dosage × frequency) × daysSupply
- Unit handling working
- Edge cases handled
- Unit tests pass (≥90% coverage)

**AC-3.5: NDC Selector Working**
- Ranking algorithm correct
- Prioritizes exact matches
- Handles overfill/underfill
- Returns top 3-5 results
- Unit tests pass (≥90% coverage)

**AC-3.6: Multi-Pack Generator Working**
- Generates combinations correctly
- Integrated with ranking
- Handles edge cases
- Unit tests pass (≥90% coverage)

**AC-3.7: Warning Generator Working**
- All warning types implemented
- Messages clear and actionable
- Severity levels correct
- Unit tests pass (≥90% coverage)

---

## Dependencies

**Prerequisites:**
- Phase 2 completed (API services, caching, utilities)
- Phase 1 completed (types, utilities)
- Phase 0 completed (test data)

**External:**
- OpenAI API (for fallback parser)
- Cache service (for SIG parsing cache)

---

## Risks & Considerations

**Risk 1: Regex Parser Coverage < 80%**
- **Impact:** Medium - More OpenAI calls, higher costs
- **Mitigation:** Extensive pattern testing, iterate on patterns
- **Contingency:** Lower confidence threshold, add more patterns

**Risk 2: Ranking Algorithm Suboptimal**
- **Impact:** Low - Results still usable, may not be optimal
- **Mitigation:** Test with real scenarios, iterate on algorithm
- **Contingency:** Adjust ranking weights based on feedback

**Risk 3: Multi-Pack Combinations Too Complex**
- **Impact:** Low - Can simplify if needed
- **Mitigation:** Start with simple combinations (single package size)
- **Contingency:** Limit to 2-3 package combinations

**Risk 4: Warning Generation Too Noisy**
- **Impact:** Low - Can adjust thresholds
- **Mitigation:** Test with real data, adjust severity levels
- **Contingency:** Make warnings configurable

---

## Success Metrics

- ✅ Regex parser handles ≥80% of SIG patterns
- ✅ All business logic components functional
- ✅ Unit test coverage ≥90% for all components
- ✅ Integration with Phase 2 services working
- ✅ Ready for Phase 4 UI integration

---

## Next Steps

Upon completion of Phase 3:
1. Test all business logic with real scenarios
2. Verify ranking algorithm produces good results
3. Review warning generation for accuracy
4. Begin Phase 4: UI & User Experience

---

**Document Owner:** Development Team  
**Last Updated:** Phase 3 Start  
**Status:** Development

