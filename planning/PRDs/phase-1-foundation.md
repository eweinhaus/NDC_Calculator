# Phase 1 PRD: Foundation & Core Utilities

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 1 - Foundation & Core Utilities  
**Duration:** Days 1-2  
**Status:** Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 1 establishes the project foundation: SvelteKit setup, TypeScript configuration, project structure, core utilities, and basic UI shell. This phase creates the scaffolding that all subsequent phases will build upon. All code must follow strict TypeScript standards and be production-ready from the start.

**Key Deliverables:**
- Fully configured SvelteKit project with TypeScript
- Tailwind CSS configured and integrated
- Complete project directory structure
- Core TypeScript types and interfaces
- NDC normalizer utility
- Package description parser
- Basic UI shell with Tailwind styling
- Health check endpoint

---

## Objectives

1. **Project Setup:** Initialize SvelteKit with TypeScript strict mode
2. **Type System:** Define all core TypeScript interfaces and types
3. **Core Utilities:** Build NDC normalizer and package parser
4. **Project Structure:** Create complete directory structure
5. **Basic UI:** Implement minimal UI shell for testing
6. **Health Check:** Create API health check endpoint

---

## Tasks

### Task 1: SvelteKit Project Setup

**Requirements:**
- Node.js ≥18.x
- TypeScript 5.x with strict mode enabled
- Tailwind CSS configured with PostCSS
- ESLint and Prettier configured
- Project structure matching PRD specification

**Setup Steps:**
1. Initialize SvelteKit project: `npm create svelte@latest`
2. Configure TypeScript (`tsconfig.json`):
   - Strict mode enabled
   - Target: ES2022
   - Module: ES2022
   - Module resolution: bundler

3. Install dependencies:
   - Core: SvelteKit, TypeScript
   - Styling: Tailwind CSS, PostCSS, Autoprefixer
   - Dev: ESLint, Prettier, Vitest, Playwright
   - Utils: date-fns (if needed)

4. Configure ESLint and Prettier:
   - Svelte-specific rules
   - TypeScript rules
   - Consistent formatting

**Deliverables:**
- Working SvelteKit project
- `tsconfig.json` with strict configuration
- `.eslintrc.cjs` and `.prettierrc`
- `package.json` with all dependencies

---

### Task 2: Project Structure Creation

**Directory Structure:**
```
src/
├── routes/
│   ├── +page.svelte              # Main UI
│   ├── api/
│   │   ├── calculate/+server.ts  # POST /api/calculate
│   │   └── health/+server.ts     # GET /api/health
├── lib/
│   ├── services/                 # External API clients
│   ├── core/                     # Business logic
│   ├── utils/                    # Helpers
│   ├── types/                    # TypeScript definitions
│   └── constants/                # Constants
└── tests/
    ├── unit/
    └── integration/
```

**File Creation:**
- Create all directory structure
- Add placeholder files with basic exports
- Ensure TypeScript paths are configured
- Add `.gitkeep` files where needed

**Deliverables:**
- Complete directory structure
- All placeholder files created
- TypeScript path aliases configured

---

### Task 3: Core TypeScript Types

**Types to Define:**

1. **API Types** (`lib/types/api.ts`):
```typescript
interface CalculationRequest {
  drugInput: string;
  sig: string;
  daysSupply: number;
}

interface CalculationResponse {
  success: boolean;
  data?: CalculationResult;
  error?: ApiError;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
}
```

2. **Drug Types** (`lib/types/drug.ts`):
```typescript
interface DrugInfo {
  name: string;
  rxcui: string;
  strength?: string;
  dosageForm?: string;
}

interface RxNormResponse {
  // Based on Phase 0 findings
}
```

3. **NDC Types** (`lib/types/ndc.ts`):
```typescript
interface NdcInfo {
  ndc: string;
  packageSize: number;
  packageDescription: string;
  manufacturer: string;
  dosageForm: string;
  active: boolean;
}

interface NdcSelection {
  ndc: string;
  packageSize: number;
  packageCount?: number;
  totalQuantity: number;
  overfill: number;
  underfill: number;
  matchScore: number;
}
```

4. **SIG Types** (`lib/types/sig.ts`):
```typescript
interface ParsedSig {
  dosage: number;
  frequency: number;
  unit: string;
  confidence: number;
}

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

5. **Warning Types** (`lib/types/warning.ts`):
```typescript
interface Warning {
  type: 'inactive_ndc' | 'overfill' | 'underfill' | 'dosage_form_mismatch';
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

**Deliverables:**
- All type files created with complete definitions
- Types exported and importable
- Type documentation comments

---

### Task 4: NDC Normalizer Utility

**File:** `lib/utils/ndcNormalizer.ts`

**Requirements:**
- Handle all NDC format variations (10-digit, 11-digit, with/without dashes)
- Normalize to 11-digit format: `XXXXX-XXXX-XX`
- Validate NDC structure (labeler-product-package)
- Handle edge cases (missing leading zeros, invalid formats)

**Functions:**
```typescript
/**
 * Normalizes NDC to 11-digit format with dashes
 * @param ndc - NDC in any format
 * @returns Normalized 11-digit NDC or null if invalid
 */
export function normalizeNdc(ndc: string): string | null;

/**
 * Converts NDC to 10-digit format (no dashes)
 * @param ndc - NDC in any format
 * @returns 10-digit NDC or null if invalid
 */
export function to10DigitNdc(ndc: string): string | null;

/**
 * Validates NDC format
 * @param ndc - NDC to validate
 * @returns true if valid NDC format
 */
export function isValidNdc(ndc: string): boolean;
```

**Test Cases:**
- `00002322730` → `00002-3227-30`
- `00002-3227-30` → `00002-3227-30` (no change)
- `2-3227-30` → `00002-3227-30` (add leading zeros)
- Invalid formats return `null`

**Deliverables:**
- Complete NDC normalizer implementation
- Unit tests with ≥90% coverage
- Edge cases handled

---

### Task 5: Package Description Parser

**File:** `lib/core/packageParser.ts`

**Requirements:**
- Parse package sizes from FDA package descriptions
- Handle multiple formats (from Phase 0 research)
- Extract: quantity, unit, package count
- Handle multi-pack formats: "3 x 30 TABLET"

**Functions:**
```typescript
interface ParsedPackage {
  quantity: number;
  unit: string;
  packageCount?: number;
  totalQuantity: number;
}

/**
 * Parses package description to extract quantity information
 * @param description - Package description from FDA API
 * @returns Parsed package info or null if parsing fails
 */
export function parsePackageDescription(description: string): ParsedPackage | null;
```

**Supported Formats:**
- "30 TABLET in 1 BOTTLE" → { quantity: 30, unit: "TABLET", totalQuantity: 30 }
- "60 CAPSULE in 1 BOTTLE" → { quantity: 60, unit: "CAPSULE", totalQuantity: 60 }
- "3 x 30 TABLET in 1 PACKAGE" → { quantity: 30, unit: "TABLET", packageCount: 3, totalQuantity: 90 }
- "100 TABLET" → { quantity: 100, unit: "TABLET", totalQuantity: 100 }

**Test Cases:**
- Use all samples from Phase 0 test data
- Test edge cases and variations
- Handle parsing failures gracefully

**Deliverables:**
- Complete package parser implementation
- Unit tests with ≥90% coverage
- Handles all formats from Phase 0 research

---

### Task 6: Basic UI Shell

**File:** `src/routes/+page.svelte`

**Requirements:**
- Clean, centered layout using Tailwind CSS
- Three input fields:
  - Drug name/NDC input
  - SIG input (textarea)
  - Days' supply input (number)
- Submit button
- Tailwind utility classes for styling (no custom CSS)
- Form validation (client-side)
- Responsive design using Tailwind breakpoints

**Features:**
- Input validation (real-time feedback)
- Disabled submit when invalid
- Basic error display
- Loading state placeholder

**Deliverables:**
- Functional UI shell
- Form validation working
- Responsive layout (basic)

---

### Task 7: Health Check Endpoint

**File:** `src/routes/api/health/+server.ts`

**Requirements:**
- `GET /api/health` endpoint
- Returns service status
- Useful for deployment monitoring

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
}
```

**Deliverables:**
- Working health check endpoint
- Returns proper status codes
- Includes basic service info

---

## Deliverables Summary

1. **Project Setup:**
   - SvelteKit project initialized
   - TypeScript strict mode configured
   - ESLint and Prettier configured

2. **Project Structure:**
   - Complete directory structure
   - All placeholder files

3. **Type System:**
   - All TypeScript types defined
   - Types exported and documented

4. **Core Utilities:**
   - NDC normalizer (with tests)
   - Package parser (with tests)

5. **Basic UI:**
   - Input form shell
   - Form validation
   - Tailwind CSS styling
   - Responsive layout

6. **API Endpoint:**
   - Health check endpoint

---

## Acceptance Criteria

**AC-1.1: Project Setup Complete**
- SvelteKit runs without errors
- TypeScript strict mode enabled
- All dependencies installed
- ESLint and Prettier configured

**AC-1.2: Project Structure Complete**
- All directories created
- File structure matches PRD specification
- TypeScript paths configured

**AC-1.3: Types Defined**
- All core types implemented
- Types properly exported
- No TypeScript errors

**AC-1.4: NDC Normalizer Working**
- Handles all format variations
- Unit tests pass (≥90% coverage)
- Edge cases handled

**AC-1.5: Package Parser Working**
- Parses all formats from Phase 0
- Unit tests pass (≥90% coverage)
- Handles edge cases gracefully

**AC-1.6: UI Shell Functional**
- Form inputs work
- Validation provides feedback
- Submit button state correct
- Basic responsive layout

**AC-1.7: Health Check Working**
- Endpoint returns 200 OK
- Response includes status info
- Ready for deployment monitoring

---

## Dependencies

**Prerequisites:**
- Phase 0 completed (API research and test data)
- Node.js ≥18.x installed
- npm or pnpm installed

**External:**
- None (this phase is self-contained)

---

## Risks & Considerations

**Risk 1: TypeScript Types Incomplete**
- **Impact:** Medium - May need updates in later phases
- **Mitigation:** Review Phase 0 findings, make types flexible
- **Contingency:** Update types as needed in later phases

**Risk 2: Package Parser Too Simple**
- **Impact:** Medium - May miss edge cases
- **Mitigation:** Use all Phase 0 test data, plan for AI fallback
- **Contingency:** Enhance parser in Phase 3 if needed

**Risk 3: Project Structure Changes**
- **Impact:** Low - Easy to refactor
- **Mitigation:** Follow PRD structure exactly
- **Contingency:** Adjust structure if needed

---

## Success Metrics

- ✅ Project builds without errors
- ✅ All utilities have ≥90% test coverage
- ✅ TypeScript strict mode passes
- ✅ UI shell is functional
- ✅ Health check endpoint works
- ✅ Ready for Phase 2

---

## Next Steps

Upon completion of Phase 1:
1. Review code quality and structure
2. Run all tests and verify coverage
3. Begin Phase 2: API Integration & Caching

---

**Document Owner:** Development Team  
**Last Updated:** Phase 1 Start  
**Status:** Development

