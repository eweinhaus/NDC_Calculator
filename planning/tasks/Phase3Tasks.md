# Phase 3 Task List: Core Business Logic

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 3 - Core Business Logic  
**Duration:** Days 5-6  
**Status:** Pending  
**Reference:** [Phase 3 PRD](../PRDs/phase-3-business-logic.md)

---

## Overview

This task list breaks down Phase 3 into actionable, well-defined tasks. Each task includes specific requirements, deliverables, and acceptance criteria. Tasks should be completed in order, as they build upon each other. The SIG parsing components (Tasks 1-3) should be built first, followed by quantity calculation (Task 4), then NDC selection and ranking (Tasks 5-6), and finally warning generation (Task 7).

---

## Task 1: SIG Pattern Constants

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** None

### Description
Create a comprehensive constants file defining all regex patterns for SIG parsing. This provides a centralized location for pattern management and makes it easy to iterate on patterns without modifying parser logic.

### Requirements
- All regex patterns defined with clear names
- Pattern priority ordering (most specific first)
- Unit extraction patterns
- Frequency extraction patterns
- Confidence scoring rules
- Support for tablets, capsules, pills, mL, L, units, actuations

### Steps
1. Create `lib/constants/sigPatterns.ts`:
   - Define `SigPattern` interface: `{ pattern: RegExp, name: string, priority: number, unitExtractor?: RegExp, frequencyExtractor?: RegExp }`
   - Define `UnitPattern` interface for unit extraction
   - Define `FrequencyPattern` interface for frequency extraction

2. Define core patterns (ordered by priority, most specific first):
   - Pattern 1: "Take X [unit] [route] [frequency] [timing]" (e.g., "Take 1 tablet by mouth twice daily")
   - Pattern 2: "X [unit] [route] [frequency]" (e.g., "1 tablet by mouth twice daily")
   - Pattern 3: "X [unit] every X hours" (e.g., "1 tablet every 8 hours")
   - Pattern 4: "X [unit] X times daily" (e.g., "2 tablets 3 times daily")
   - Pattern 5: "X [unit] twice daily" (e.g., "1 tablet twice daily")
   - Pattern 6: "X [unit] once daily" (e.g., "1 tablet once daily")
   - Pattern 7: "X [unit] three times daily" (e.g., "1 tablet three times daily")
   - Pattern 8: "X [unit] four times daily" (e.g., "1 tablet four times daily")
   - Pattern 9: "X [unit] every morning/evening" (e.g., "1 tablet every morning")
   - Pattern 10: "X [unit] at bedtime" (e.g., "1 tablet at bedtime")

3. Define unit extraction patterns:
   - Tablets: "tablet", "tablets", "tab", "tabs"
   - Capsules: "capsule", "capsules", "cap", "caps"
   - Pills: "pill", "pills"
   - Liquids: "mL", "ml", "L", "liter", "liters"
   - Units: "unit", "units", "U", "IU"
   - Actuations: "actuation", "actuations", "puff", "puffs"

4. Define frequency extraction patterns:
   - "once daily", "once a day", "daily", "QD" → 1
   - "twice daily", "twice a day", "BID", "B.I.D." → 2
   - "three times daily", "three times a day", "TID", "T.I.D." → 3
   - "four times daily", "four times a day", "QID", "Q.I.D." → 4
   - "every X hours" → calculate from hours (24 / X)
   - "every X minutes" → calculate from minutes (1440 / X)

5. Define confidence scoring rules:
   - Exact pattern match: 0.9-1.0
   - Partial match (missing optional parts): 0.8-0.9
   - Weak match (missing required parts): 0.7-0.8
   - Low confidence: <0.7 (triggers AI fallback)

6. Export pattern arrays:
   - `export const SIG_PATTERNS: SigPattern[]` (ordered by priority)
   - `export const UNIT_PATTERNS: UnitPattern[]`
   - `export const FREQUENCY_PATTERNS: FrequencyPattern[]`
   - `export const CONFIDENCE_RULES: ConfidenceRule[]`

7. Write unit tests:
   - Test pattern matching for each pattern
   - Test unit extraction
   - Test frequency extraction
   - Test confidence scoring
   - Test with Phase 0 test data

### Deliverables
- ✅ `lib/constants/sigPatterns.ts` with all patterns defined
- ✅ Pattern priority ordering correct
- ✅ Unit extraction patterns working
- ✅ Frequency extraction patterns working
- ✅ Confidence scoring rules defined
- ✅ Unit tests passing

### Acceptance Criteria
- [ ] All core patterns defined and ordered by priority
- [ ] Unit extraction patterns cover all supported units
- [ ] Frequency extraction patterns handle all common frequencies
- [ ] Confidence scoring rules clearly defined
- [ ] Patterns match ≥80% of Phase 0 test data
- [ ] Unit tests pass with ≥90% coverage
- [ ] Patterns are easy to extend/modify

---

## Task 2: Regex-Based SIG Parser

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Task 1 (SIG Pattern Constants)

### Description
Implement the primary regex-based SIG parser that handles 80%+ of common prescription patterns. This parser uses the patterns from Task 1 to extract dosage, frequency, and unit from prescription instructions.

### Requirements
- Parse SIG text using regex patterns
- Extract dosage (number)
- Extract frequency (number per day)
- Extract unit (string)
- Calculate confidence score (0-1)
- Return `ParsedSig` object or null
- Handle edge cases (PRN, variable dosages, etc.)

### Steps
1. Create `lib/core/regexSigParser.ts`:
   - Import `SIG_PATTERNS`, `UNIT_PATTERNS`, `FREQUENCY_PATTERNS` from constants
   - Import `ParsedSig` type from `lib/types/sig.ts`
   - Define `RegexSigParser` class

2. Implement `normalizeSig(sig: string): string`:
   - Convert to lowercase
   - Trim whitespace
   - Remove extra spaces (replace multiple spaces with single space)
   - Remove common punctuation that doesn't affect meaning
   - Return normalized string

3. Implement `extractDosage(sig: string, pattern: RegExp): number | null`:
   - Match pattern against normalized SIG
   - Extract dosage number from match groups
   - Handle ranges (e.g., "1-2 tablets" → use average: 1.5)
   - Handle fractional dosages (e.g., "0.5 tablets")
   - Return number or null if not found

4. Implement `extractUnit(sig: string, patterns: UnitPattern[]): string | null`:
   - Try each unit pattern in order
   - Return first match (normalized: "tablet", "capsule", "mL", etc.)
   - Default to "tablet" if no match found (with lower confidence)
   - Return null if absolutely no unit found

5. Implement `extractFrequency(sig: string, patterns: FrequencyPattern[]): number | null`:
   - Try each frequency pattern in order
   - Extract frequency number from match
   - Handle "every X hours" → calculate: 24 / X
   - Handle "every X minutes" → calculate: 1440 / X
   - Handle PRN (frequency = 0, but flag for special handling)
   - Return number or null if not found

6. Implement `calculateConfidence(match: RegExpMatchArray, pattern: SigPattern, extracted: { dosage: number | null, frequency: number | null, unit: string | null }): number`:
   - Start with base confidence from pattern priority
   - Reduce confidence if dosage missing
   - Reduce confidence if frequency missing
   - Reduce confidence if unit missing or defaulted
   - Return confidence score (0-1)

7. Implement `parse(sig: string): ParsedSig | null`:
   - Normalize SIG input
   - Try each pattern in priority order
   - For first match:
     - Extract dosage, frequency, unit
     - Calculate confidence
     - If confidence ≥ 0.7, return `ParsedSig` object
     - If confidence < 0.7, continue to next pattern
   - If no pattern matches or all have low confidence, return null
   - Validate extracted values (dosage > 0, frequency ≥ 0, unit is valid)

8. Handle edge cases:
   - PRN medications: frequency = 0, dosage = average if range
   - Variable dosages: use average (e.g., "1-2" → 1.5)
   - Missing frequency: infer from timing (e.g., "every morning" → 1)
   - Missing unit: default to "tablet" with lower confidence

9. Write comprehensive unit tests:
   - Test with all Phase 0 test data SIGs
   - Test each pattern individually
   - Test edge cases (PRN, ranges, missing parts)
   - Test confidence scoring
   - Test normalization
   - Verify ≥80% of test data parses successfully
   - Verify confidence scores are reasonable

### Deliverables
- ✅ `lib/core/regexSigParser.ts` with complete parser implementation
- ✅ Pattern matching working correctly
- ✅ Dosage, frequency, unit extraction working
- ✅ Confidence scoring accurate
- ✅ Edge cases handled
- ✅ Unit tests passing with ≥90% coverage

### Acceptance Criteria
- [ ] `parse()` function works correctly
- [ ] Parses ≥80% of Phase 0 test data successfully
- [ ] Extracts dosage, frequency, unit accurately
- [ ] Confidence scores are reasonable (0.7-1.0 for good matches)
- [ ] Edge cases (PRN, ranges, missing parts) handled gracefully
- [ ] Returns null for unparseable SIGs
- [ ] Unit tests pass with ≥90% coverage
- [ ] All Phase 0 simple patterns parse correctly

---

## Task 3: OpenAI SIG Parser (Fallback)

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 2 (Regex Parser), Phase 2 OpenAI Service

### Description
Implement the OpenAI-based SIG parser as a fallback for complex patterns when regex confidence < 0.8. This parser uses the OpenAI service from Phase 2 to parse prescription instructions that the regex parser cannot handle.

### Requirements
- Use OpenAI service from Phase 2
- Parse complex SIG patterns via AI
- Return structured `ParsedSig` object
- Handle JSON parsing and validation
- Robust error handling
- Cost optimization (only called when needed)

### Steps
1. Create `lib/core/openaiSigParser.ts`:
   - Import OpenAI service from `lib/services/openai.ts`
   - Import `ParsedSig` type from `lib/types/sig.ts`
   - Import logger from `lib/utils/logger.ts`
   - Define `OpenAISigParser` class

2. Create prompt template:
   - Define `createSigPrompt(sig: string): string`:
     ```
     Parse the following prescription instruction (SIG) and return ONLY valid JSON:
     {
       "dosage": number,
       "frequency": number (per day),
       "unit": string,
       "confidence": number (0-1)
     }
     
     SIG: "{sig}"
     
     Rules:
     - dosage must be > 0 (use average for ranges like "1-2")
     - frequency must be > 0 (per day), or 0 for PRN medications
     - unit must be one of: tablet, capsule, pill, mL, L, unit, actuation
     - confidence should reflect parsing certainty (0.7-1.0)
     - Return only JSON, no additional text or markdown
     ```
   - Optimize prompt for minimal tokens
   - Include examples if helpful (but keep token count low)

3. Implement `normalizeSig(sig: string): string`:
   - Same normalization as regex parser
   - Ensure consistent input format

4. Implement `parseJsonResponse(content: string): ParsedSig | null`:
   - Extract JSON from response (handle markdown code blocks if present)
   - Parse JSON string
   - Validate required fields: dosage, frequency, unit, confidence
   - Validate types (dosage/frequency/confidence are numbers, unit is string)
   - Validate values:
     - dosage > 0
     - frequency ≥ 0
     - unit is one of valid units
     - confidence is 0-1
   - Return `ParsedSig` object or null if validation fails
   - Log validation errors

5. Implement `parse(sig: string): Promise<ParsedSig | null>`:
   - Normalize SIG input
   - Create prompt using `createSigPrompt()`
   - Call OpenAI service `parseSig()` method (from Phase 2)
   - Parse JSON response using `parseJsonResponse()`
   - If parsing fails, log error and return null
   - Return `ParsedSig` object or null

6. Error handling:
   - Handle OpenAI API errors (network, timeout, rate limit)
   - Handle invalid JSON responses
   - Handle missing fields in response
   - Handle invalid values in response
   - Log all errors with context (but don't log full SIG in production)
   - Return null on any error (don't throw)

7. Write unit tests:
   - Mock OpenAI service
   - Test successful parsing
   - Test JSON extraction (with/without markdown)
   - Test validation (missing fields, invalid types, invalid values)
   - Test error handling (API errors, invalid JSON)
   - Test with complex SIGs from Phase 0 test data

8. Write integration test (optional, manual):
   - Test with real OpenAI API (one test call to verify it works)
   - Verify cost is reasonable
   - Verify response quality

### Deliverables
- ✅ `lib/core/openaiSigParser.ts` with complete parser implementation
- ✅ Prompt template optimized
- ✅ JSON parsing and validation working
- ✅ Error handling complete
- ✅ Unit tests passing
- ✅ Integration test passing (optional)

### Acceptance Criteria
- [ ] `parse()` function works correctly
- [ ] Prompt template is optimized (minimal tokens)
- [ ] JSON parsing handles markdown code blocks
- [ ] Validation catches invalid responses
- [ ] Error handling works for all scenarios
- [ ] Only called when regex confidence < 0.8
- [ ] Unit tests pass with ≥90% coverage
- [ ] Integration test passes (if performed)

---

## Task 4: SIG Parser Orchestrator

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Tasks 2-3 (Regex Parser, OpenAI Parser), Phase 2 Cache Service

### Description
Implement the SIG parser orchestrator that coordinates regex and AI parsers, manages caching, and provides a unified interface for SIG parsing. This is the main entry point for all SIG parsing operations.

### Requirements
- Orchestrate regex and OpenAI parsers
- Manage caching (30 days TTL)
- Normalize SIG for cache keys
- Validate parsed results
- Provide unified async interface

### Steps
1. Create `lib/core/sigParser.ts`:
   - Import regex parser from `lib/core/regexSigParser.ts`
   - Import OpenAI parser from `lib/core/openaiSigParser.ts`
   - Import cache service from `lib/services/cache.ts`
   - Import cache key and TTL constants
   - Import logger from `lib/utils/logger.ts`
   - Import `ParsedSig` type from `lib/types/sig.ts`

2. Implement `normalizeSigForCache(sig: string): string`:
   - Convert to lowercase
   - Trim whitespace
   - Remove extra spaces
   - Remove punctuation that doesn't affect meaning
   - Return normalized string for cache key

3. Implement `validateParsedSig(parsed: ParsedSig | null): parsed is ParsedSig`:
   - Check if parsed is not null
   - Validate dosage > 0
   - Validate frequency ≥ 0
   - Validate unit is one of valid units
   - Validate confidence is 0-1
   - Return boolean

4. Implement `parse(sig: string): Promise<ParsedSig | null>`:
   - Normalize SIG for cache key
   - Check cache: `cache.get<ParsedSig>(cacheKey)`
   - If cache hit, validate and return cached result
   - If cache miss:
     - Try regex parser first: `regexParser.parse(sig)`
     - If regex result exists and confidence ≥ 0.8:
       - Cache result with `SIG_PARSE_TTL` (30 days)
       - Return result
     - If regex result has confidence < 0.8 or is null:
       - Try OpenAI parser: `await openaiParser.parse(sig)`
       - If OpenAI result exists:
         - Cache result with `SIG_PARSE_TTL`
         - Return result
       - If OpenAI result is null:
         - Log warning
         - Return null
   - Validate all results before returning

5. Error handling:
   - Handle cache errors (log, continue without cache)
   - Handle regex parser errors (log, try OpenAI)
   - Handle OpenAI parser errors (log, return null)
   - Never throw errors, always return null on failure
   - Log all errors with context

6. Logging:
   - Log cache hits
   - Log cache misses
   - Log regex parser attempts and results
   - Log OpenAI parser attempts and results
   - Log validation failures

7. Write unit tests:
   - Test cache hit path
   - Test cache miss → regex success path
   - Test cache miss → regex low confidence → OpenAI success path
   - Test cache miss → regex failure → OpenAI success path
   - Test cache miss → both parsers fail path
   - Test validation
   - Test error handling (cache errors, parser errors)
   - Mock all dependencies

8. Write integration tests:
   - Test with real cache service
   - Test with real parsers
   - Test caching effectiveness
   - Test with Phase 0 test data

### Deliverables
- ✅ `lib/core/sigParser.ts` with complete orchestrator implementation
- ✅ Caching integrated (30 days TTL)
- ✅ Regex → OpenAI fallback working
- ✅ Validation working
- ✅ Error handling complete
- ✅ Unit tests passing
- ✅ Integration tests passing

### Acceptance Criteria
- [ ] `parse()` function orchestrates parsers correctly
- [ ] Cache hit returns cached result
- [ ] Cache miss tries regex first
- [ ] Falls back to OpenAI when regex confidence < 0.8
- [ ] Results are validated before returning
- [ ] Results are cached with correct TTL
- [ ] Error handling works for all scenarios
- [ ] All operations logged appropriately
- [ ] Unit tests pass with ≥90% coverage
- [ ] Integration tests pass

---

## Task 5: Quantity Calculator

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 4 (SIG Parser Orchestrator)

### Description
Implement the quantity calculator that computes total quantity from parsed SIG and days' supply. This is a straightforward calculation but must handle edge cases like PRN medications and very large quantities.

### Requirements
- Calculate total quantity: (dosage × frequency) × daysSupply
- Preserve unit from parsed SIG
- Handle edge cases (PRN, very large quantities, fractional results)
- Return structured `QuantityResult` object

### Steps
1. Create `lib/core/quantityCalculator.ts`:
   - Import `ParsedSig` type from `lib/types/sig.ts`
   - Import logger from `lib/utils/logger.ts`
   - Define `QuantityResult` interface:
     ```typescript
     interface QuantityResult {
       total: number;
       unit: string;
       calculation: {
         dosage: number;
         frequency: number;
         daysSupply: number;
       };
     }
     ```

2. Implement `calculate(parsedSig: ParsedSig, daysSupply: number): QuantityResult`:
   - Validate inputs:
     - `parsedSig` is not null
     - `daysSupply` > 0
     - `parsedSig.dosage` > 0
     - `parsedSig.frequency` ≥ 0
   - Handle PRN medications (frequency = 0):
     - Calculate: `total = dosage × daysSupply` (assume once per day for PRN)
     - Log warning about PRN assumption
   - Handle normal medications:
     - Calculate: `total = (dosage × frequency) × daysSupply`
   - Round result appropriately:
     - If unit is "tablet", "capsule", "pill" → round to nearest integer
     - If unit is "mL", "L" → round to 2 decimal places
     - If unit is "unit", "actuation" → round to nearest integer
   - Return `QuantityResult` object

3. Handle edge cases:
   - Very large quantities (>365 days):
     - Calculate normally
     - Log warning about large quantity
   - Fractional results:
     - Round based on unit type (see above)
   - Zero or negative inputs:
     - Validate and throw error or return null

4. Unit handling:
   - Preserve unit from `parsedSig.unit`
   - Validate unit matches expected format
   - No unit conversion (future enhancement)

5. Write unit tests:
   - Test normal calculation: (2 × 3) × 30 = 180
   - Test PRN calculation: (1 × 0) → assume 1 per day → 30
   - Test fractional dosages: (1.5 × 2) × 30 = 90
   - Test very large quantities: (1 × 1) × 365 = 365
   - Test rounding for different units
   - Test validation (null inputs, negative inputs)
   - Test edge cases

### Deliverables
- ✅ `lib/core/quantityCalculator.ts` with complete calculator implementation
- ✅ Formula correct: (dosage × frequency) × daysSupply
- ✅ Unit handling working
- ✅ Edge cases handled
- ✅ Unit tests passing with ≥90% coverage

### Acceptance Criteria
- [ ] `calculate()` function works correctly
- [ ] Formula is correct: (dosage × frequency) × daysSupply
- [ ] PRN medications handled (assume once per day)
- [ ] Rounding works correctly for different units
- [ ] Very large quantities handled (with warning)
- [ ] Validation works (rejects invalid inputs)
- [ ] Unit preserved from parsed SIG
- [ ] Unit tests pass with ≥90% coverage

---

## Task 6: NDC Selector with Ranking

**Priority:** P0 - Critical  
**Estimated Time:** 5-6 hours  
**Dependencies:** Task 5 (Quantity Calculator), Phase 2 FDA Service

### Description
Implement the NDC selector with ranking algorithm that selects optimal NDCs based on calculated quantity. This component ranks NDCs by exactness, package count, and waste minimization.

### Requirements
- Rank NDCs by match quality
- Prioritize exact matches
- Handle overfill and underfill
- Filter inactive NDCs (flag as warnings)
- Return top 3-5 results
- Support multi-pack combinations (see Task 7)

### Steps
1. Create `lib/core/ndcSelector.ts`:
   - Import `NdcInfo` type from `lib/types/ndc.ts`
   - Import `ParsedSig` type from `lib/types/sig.ts`
   - Import package parser from `lib/core/packageParser.ts` (Phase 1)
   - Import logger from `lib/utils/logger.ts`
   - Define `NdcSelection` interface:
     ```typescript
     interface NdcSelection {
       ndc: string;
       packageSize: number;
       packageCount?: number; // For multi-pack
       totalQuantity: number;
       overfill: number; // totalQuantity - targetQuantity (if positive)
       underfill: number; // targetQuantity - totalQuantity (if positive)
       matchScore: number; // 0-100
       active: boolean;
     }
     ```

2. Implement `parsePackageSize(ndcInfo: NdcInfo): number | null`:
   - Use package parser from Phase 1 to parse `ndcInfo.packageDescription`
   - Extract package size (quantity per package)
   - Return number or null if parsing fails

3. Implement `calculateMatchScore(selection: NdcSelection, targetQuantity: number): number`:
   - Exact match (packageSize = targetQuantity): score = 100
   - Near match (within 5%): score = 90-99 (proportional to closeness)
   - Overfill: score = 80-89 (penalized by overfill %)
   - Underfill: score = 70-79 (penalized by underfill %)
   - Multi-pack exact match: score = 95
   - Multi-pack near match: score = 85-94
   - Inactive NDC: score = 0 (filtered out, but flag as warning)
   - Return score (0-100)

4. Implement `generateSinglePackSelection(ndcInfo: NdcInfo, targetQuantity: number): NdcSelection | null`:
   - Parse package size from `ndcInfo`
   - If parsing fails, return null
   - Calculate:
     - `packageCount = 1`
     - `totalQuantity = packageSize`
     - `overfill = Math.max(0, totalQuantity - targetQuantity)`
     - `underfill = Math.max(0, targetQuantity - totalQuantity)`
     - `matchScore = calculateMatchScore(...)`
   - Return `NdcSelection` object

5. Implement `generateMultiPackSelection(ndcInfo: NdcInfo, targetQuantity: number): NdcSelection | null`:
   - Parse package size from `ndcInfo`
   - If parsing fails, return null
   - Calculate:
     - `packageCount = Math.ceil(targetQuantity / packageSize)`
     - `totalQuantity = packageCount × packageSize`
     - `overfill = totalQuantity - targetQuantity`
     - `underfill = 0` (multi-pack always meets or exceeds target)
     - `matchScore = calculateMatchScore(...)`
   - Return `NdcSelection` object

6. Implement `selectOptimal(ndcList: NdcInfo[], targetQuantity: number, maxResults: number = 5): NdcSelection[]`:
   - Filter out inactive NDCs (store for warnings, don't include in results)
   - For each active NDC:
     - Generate single-pack selection
     - Generate multi-pack selection
     - Add both to candidates list (if valid)
   - Rank all candidates by `matchScore` (descending)
   - Return top `maxResults` selections
   - Log selection process

7. Filtering and prioritization:
   - Filter by dosage form match (if available from parsed SIG)
   - Prioritize active NDCs
   - Prioritize exact matches
   - Prioritize fewer packages
   - Prioritize less waste (overfill)

8. Write unit tests:
   - Test exact match selection
   - Test near match selection
   - Test overfill selection
   - Test underfill selection
   - Test multi-pack selection
   - Test ranking algorithm
   - Test filtering (inactive NDCs)
   - Test with real NDC data from Phase 0

### Deliverables
- ✅ `lib/core/ndcSelector.ts` with complete selector implementation
- ✅ Ranking algorithm working
- ✅ Single-pack selection working
- ✅ Multi-pack selection working (see Task 7 for details)
- ✅ Filtering working (inactive NDCs)
- ✅ Unit tests passing with ≥90% coverage

### Acceptance Criteria
- [ ] `selectOptimal()` function works correctly
- [ ] Ranking algorithm prioritizes exact matches
- [ ] Handles overfill correctly (penalizes waste)
- [ ] Handles underfill correctly (penalizes shortage)
- [ ] Multi-pack combinations generated correctly
- [ ] Inactive NDCs filtered out (but flagged for warnings)
- [ ] Returns top 3-5 results
- [ ] Unit tests pass with ≥90% coverage

---

## Task 7: Multi-Pack Combination Generator

**Priority:** P1 - High  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 6 (NDC Selector)

### Description
Enhance the multi-pack combination generator to handle complex scenarios and integrate seamlessly with the NDC selector. This task refines the multi-pack logic from Task 6 and adds support for multiple package sizes.

### Requirements
- Generate multi-pack combinations for single package size
- Calculate package count, total quantity, overfill
- Rank multi-pack options alongside single-pack options
- Handle edge cases (very large quantities, multiple package sizes)

### Steps
1. Enhance `generateMultiPackSelection()` in `ndcSelector.ts`:
   - Already implemented in Task 6, but refine here
   - Add support for limiting package count (max 10 packages)
   - Add support for multiple package sizes (future enhancement, stub for now)

2. Implement `generateCombinations(ndcInfo: NdcInfo, targetQuantity: number, maxPackages: number = 10): NdcSelection[]`:
   - Parse package size from `ndcInfo`
   - Calculate `packageCount = Math.ceil(targetQuantity / packageSize)`
   - If `packageCount > maxPackages`, skip (too many packages)
   - Generate selection (same as Task 6)
   - Return array of selections (currently just one, but structure for future)

3. Integration with ranking:
   - Multi-pack selections are already included in ranking (from Task 6)
   - Verify they're ranked correctly alongside single-pack options
   - Multi-pack exact matches should score 95 (slightly below single-pack exact match)

4. Edge case handling:
   - Very large quantities: limit package count
   - Very small package sizes: may need many packages
   - Fractional package counts: always round up

5. Write unit tests:
   - Test multi-pack generation for various quantities
   - Test package count limits
   - Test ranking of multi-pack vs single-pack
   - Test edge cases (very large quantities, very small packages)

### Deliverables
- ✅ Multi-pack generator refined and enhanced
- ✅ Package count limits enforced
- ✅ Integration with ranking verified
- ✅ Edge cases handled
- ✅ Unit tests passing

### Acceptance Criteria
- [ ] Multi-pack combinations generated correctly
- [ ] Package count limits enforced (max 10 packages)
- [ ] Multi-pack options ranked alongside single-pack options
- [ ] Edge cases handled (very large quantities, very small packages)
- [ ] Unit tests pass with ≥90% coverage

---

## Task 8: Warning Generation Logic

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 6 (NDC Selector)

### Description
Implement warning generation logic that creates warnings for inactive NDCs, overfills, underfills, and dosage form mismatches. Warnings help users understand potential issues with recommendations.

### Requirements
- Generate warnings for all warning types
- Clear, user-friendly messages
- Appropriate severity levels (error, warning, info)
- Actionable guidance when possible

### Steps
1. Create `lib/core/warningGenerator.ts`:
   - Import `NdcSelection` from `lib/core/ndcSelector.ts`
   - Import `ParsedSig` from `lib/types/sig.ts`
   - Import `NdcInfo` from `lib/types/ndc.ts`
   - Import `Warning` type from `lib/types/warning.ts`
   - Import logger from `lib/utils/logger.ts`

2. Implement `generateInactiveNdcWarning(ndcInfo: NdcInfo): Warning`:
   - Check if `ndcInfo.active === false`
   - Create warning:
     - Type: `"inactive_ndc"`
     - Severity: `"error"`
     - Message: `"NDC {ndc} is inactive and should not be dispensed"`
   - Return warning

3. Implement `generateOverfillWarning(selection: NdcSelection, targetQuantity: number): Warning | null`:
   - Calculate overfill percentage: `(overfill / targetQuantity) × 100`
   - If overfill > 10%:
     - Create warning:
       - Type: `"overfill"`
       - Severity: `"warning"`
       - Message: `"Recommended package results in {overfill}% waste ({overfillAmount} {unit} excess)"`
     - Return warning
   - If overfill ≤ 10%, return null

4. Implement `generateUnderfillWarning(selection: NdcSelection, targetQuantity: number): Warning | null`:
   - If `totalQuantity < targetQuantity`:
     - Calculate underfill: `targetQuantity - totalQuantity`
     - Create warning:
       - Type: `"underfill"`
       - Severity: `"warning"`
       - Message: `"Recommended package is insufficient. Requires {packageCount} packages to meet quantity"`
     - Return warning
   - Return null if sufficient

5. Implement `generateDosageFormMismatchWarning(selection: NdcSelection, parsedSig: ParsedSig, ndcInfo: NdcInfo): Warning | null`:
   - Compare `parsedSig.unit` with `ndcInfo.dosageForm`
   - Map units to dosage forms:
     - "tablet", "capsule", "pill" → "TABLET", "CAPSULE"
     - "mL", "L" → "LIQUID", "SOLUTION"
     - "unit" → "INJECTION", "UNIT"
     - "actuation" → "INHALATION", "AEROSOL"
   - If mismatch detected:
     - Create warning:
       - Type: `"dosage_form_mismatch"`
       - Severity: `"warning"`
       - Message: `"SIG specifies {sigUnit} but NDC is {ndcForm}. Please verify."`
     - Return warning
   - Return null if match

6. Implement `generateWarnings(selection: NdcSelection, targetQuantity: number, parsedSig: ParsedSig, ndcInfo: NdcInfo): Warning[]`:
   - Initialize warnings array
   - Check inactive NDC: add warning if inactive
   - Check overfill: add warning if >10%
   - Check underfill: add warning if insufficient
   - Check dosage form mismatch: add warning if mismatch
   - Return warnings array

7. Message formatting:
   - Use clear, user-friendly language
   - Include relevant numbers (percentages, quantities, units)
   - Provide actionable guidance when possible
   - Keep messages concise

8. Write unit tests:
   - Test inactive NDC warning
   - Test overfill warning (>10% threshold)
   - Test underfill warning
   - Test dosage form mismatch warning
   - Test no warnings for good matches
   - Test message formatting
   - Test severity levels

### Deliverables
- ✅ `lib/core/warningGenerator.ts` with complete warning generator
- ✅ All warning types implemented
- ✅ Message formatting complete
- ✅ Severity levels correct
- ✅ Unit tests passing with ≥90% coverage

### Acceptance Criteria
- [ ] `generateWarnings()` function works correctly
- [ ] All warning types implemented (inactive, overfill, underfill, mismatch)
- [ ] Messages are clear and user-friendly
- [ ] Severity levels are appropriate (error for inactive, warning for others)
- [ ] Overfill threshold (10%) works correctly
- [ ] Dosage form matching works correctly
- [ ] Unit tests pass with ≥90% coverage

---

## Task 9: Integration Testing & Verification

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Tasks 1-8 (All business logic components)

### Description
Create comprehensive integration tests and verify all business logic components work together correctly. Test end-to-end flows, verify calculations, and ensure all edge cases are handled.

### Requirements
- Integration tests for all components
- Test end-to-end flows
- Verify calculations are correct
- Test with Phase 0 test data
- Performance verification

### Steps
1. Create integration test suite:
   - Create `tests/integration/businessLogic.test.ts`
   - Set up test environment
   - Mock Phase 2 services (cache, OpenAI) where appropriate
   - Use real parsers and calculators

2. Test SIG parsing flow:
   - Test regex parser with Phase 0 test data
   - Test OpenAI fallback with complex SIGs
   - Test orchestrator (cache → regex → OpenAI)
   - Verify ≥80% of test data parses successfully
   - Verify confidence scores are reasonable

3. Test quantity calculation flow:
   - Test with parsed SIGs from Phase 0
   - Test with various days' supply values
   - Test PRN medications
   - Test very large quantities
   - Verify calculations are correct

4. Test NDC selection flow:
   - Test with real NDC data from Phase 0
   - Test ranking algorithm
   - Test single-pack selection
   - Test multi-pack selection
   - Test filtering (inactive NDCs)
   - Verify top results are optimal

5. Test warning generation flow:
   - Test with various scenarios (inactive, overfill, underfill, mismatch)
   - Verify warnings are generated correctly
   - Verify messages are clear
   - Verify severity levels are appropriate

6. Test end-to-end flow:
   - Input: drug name, SIG, days' supply
   - Flow: normalize → parse SIG → calculate quantity → select NDCs → generate warnings
   - Verify all steps work together
   - Verify results are correct

7. Performance verification:
   - Measure SIG parsing time (regex vs AI)
   - Measure quantity calculation time
   - Measure NDC selection time
   - Verify all operations are fast (<100ms for cached, <2s for AI)

8. Manual testing checklist:
   - [ ] Test with real drug names from Phase 0
   - [ ] Test with real SIGs from Phase 0
   - [ ] Test with real NDCs from Phase 0
   - [ ] Verify calculations are correct
   - [ ] Verify warnings are helpful
   - [ ] Verify performance is acceptable

### Deliverables
- ✅ Integration test suite created
- ✅ All components tested together
- ✅ End-to-end flows tested
- ✅ Calculations verified
- ✅ Performance verified
- ✅ Manual testing completed

### Acceptance Criteria
- [ ] All integration tests pass
- [ ] SIG parsing handles ≥80% of test data
- [ ] Quantity calculations are correct
- [ ] NDC selection produces optimal results
- [ ] Warnings are generated correctly
- [ ] End-to-end flow works correctly
- [ ] Performance targets met (<100ms cached, <2s AI)
- [ ] Manual testing checklist completed

---

## Task 10: Documentation & Code Review

**Priority:** P1 - High  
**Estimated Time:** 1-2 hours  
**Dependencies:** Tasks 1-9 (All tasks complete)

### Description
Document all business logic components, update code comments, and prepare for code review. Ensure all code is well-documented and follows project patterns.

### Requirements
- Code comments for all public functions
- JSDoc comments where appropriate
- Code follows project patterns
- All types exported and documented

### Steps
1. Add code comments:
   - Add JSDoc comments to all public functions
   - Document parameters, return types, exceptions
   - Add inline comments for complex logic (ranking algorithm, confidence scoring)

2. Review code quality:
   - Ensure consistent error handling patterns
   - Ensure consistent logging patterns
   - Check for code duplication
   - Verify TypeScript strict mode compliance

3. Update type exports:
   - Ensure all types are exported from appropriate files
   - Create index files if needed for easier imports
   - Document type usage

4. Review integration:
   - Verify all components use logger
   - Verify all components use cache (where applicable)
   - Verify all components handle errors gracefully
   - Check for missing integrations

5. Review algorithms:
   - Verify ranking algorithm is correct
   - Verify confidence scoring is reasonable
   - Verify quantity calculation formula is correct
   - Review edge case handling

6. Performance review:
   - Review caching usage
   - Review algorithm efficiency
   - Verify no unnecessary computations

7. Security review:
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
- [ ] Ready for Phase 4 UI integration

---

## Summary

Phase 3 consists of 10 tasks that build the complete business logic layer:

1. **SIG Parsing (Tasks 1-4):** Pattern constants, regex parser, OpenAI parser, orchestrator
2. **Quantity Calculation (Task 5):** Quantity calculator
3. **NDC Selection (Tasks 6-7):** NDC selector with ranking, multi-pack generator
4. **Warning Generation (Task 8):** Warning generator
5. **Verification (Tasks 9-10):** Integration testing, documentation

**Total Estimated Time:** 28-36 hours (Days 5-6)

**Critical Path:**
- Tasks 1-4 must be completed first (SIG parsing)
- Task 5 depends on Task 4 (quantity calculation)
- Tasks 6-7 depend on Task 5 (NDC selection)
- Task 8 depends on Task 6 (warning generation)
- Tasks 9-10 complete the phase

**Key Success Metrics:**
- ✅ Regex parser handles ≥80% of SIG patterns
- ✅ All business logic components functional
- ✅ Unit test coverage ≥90% for all components
- ✅ Integration with Phase 2 services working
- ✅ Ready for Phase 4 UI integration

---

**Document Owner:** Development Team  
**Last Updated:** Phase 3 Task List Creation  
**Status:** Pending

