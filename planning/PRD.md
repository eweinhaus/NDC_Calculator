# Product Requirements Document (PRD)
## NDC Packaging & Quantity Calculator

**Project:** NDC Packaging & Quantity Calculator  
**Organization:** Foundation Health  
**Project ID:** hnCCiUa1F2Q7UU8GBlCe_1762540939252  
**Version:** 1.0  
**Status:** Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Technical Requirements](#7-technical-requirements)
8. [System Architecture](#8-system-architecture)
9. [API Specifications](#9-api-specifications)
10. [Data Models](#10-data-models)
11. [UI Requirements](#11-ui-requirements)
12. [Error Handling](#12-error-handling)
13. [Performance & Security](#13-performance--security)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment](#15-deployment)
16. [Implementation Phases](#16-implementation-phases)
17. [Acceptance Criteria](#17-acceptance-criteria)

---

## 1. Executive Summary

The **NDC Packaging & Quantity Calculator** is an AI-accelerated web application that matches prescriptions with valid National Drug Codes (NDCs) and calculates correct dispense quantities from free-text prescription instructions (SIG). The tool identifies optimal package sizes while flagging inactive NDCs and quantity mismatches.

**Key Value Propositions:**
- Reduces claim rejections due to NDC mismatches
- Automates quantity calculation from natural language instructions
- Identifies optimal package combinations to minimize waste
- Provides real-time validation and warnings

**Technology Stack:**
- **Framework:** SvelteKit (TypeScript)
- **Styling:** Tailwind CSS
- **AI:** OpenAI API for SIG parsing
- **APIs:** RxNorm API, FDA NDC Directory API
- **Deployment:** Render (initial), GCP (production)
- **Testing:** Vitest, Playwright

---

## 2. Problem Statement

### Current Pain Points

1. **NDC Matching Errors:** Pharmacists struggle to match prescriptions to correct NDCs, leading to claim rejections
2. **Quantity Calculation:** Manual calculation from free-text SIG is error-prone and time-consuming
3. **Package Size Mismatches:** Difficulty selecting optimal package sizes results in overfills/underfills
4. **Inactive NDCs:** Using inactive NDCs causes claim rejections and operational delays
5. **Dosage Form Confusion:** Mismatched dosage forms (tablets vs capsules) lead to fulfillment errors

### Impact

- **Operational:** Increased processing time, higher error rates
- **Financial:** Claim rejections, wasted medication, rework costs
- **Patient Experience:** Delays in medication fulfillment, frustration

---

## 3. Goals & Success Metrics

### Primary Goals

1. **Accuracy:** Achieve 95%+ medication normalization accuracy
2. **Efficiency:** Reduce prescription processing time by 50%
3. **Error Reduction:** Decrease NDC-related claim rejections by 50%
4. **User Satisfaction:** Attain 4.5/5 user satisfaction rating

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Normalization Accuracy | ≥95% | Correct RxCUI matches / Total queries |
| Response Time | <2 seconds | P95 response time |
| Error Rate | <5% | Failed calculations / Total queries |
| Cache Hit Rate | ≥60% | Cached responses / Total responses |

---

## 4. Target Users

### Primary Users

**Pharmacists:** Require accurate NDC matching and quick quantity calculation to fulfill prescriptions efficiently.

**Pharmacy Technicians:** Need streamlined tools to assist in prescription processing and reduce manual errors.

### Secondary Users

**Healthcare Administrators:** Interested in reducing operational inefficiencies and improving patient satisfaction.

---

## 5. User Stories

### P0 User Stories

1. **As a Pharmacist**, I want to input a drug name or NDC and receive the correct RxCUI and associated NDCs
2. **As a Pharmacy Technician**, I want to enter a SIG and days' supply so the system calculates the total quantity needed
3. **As a Pharmacist**, I want to see recommended NDCs that match my quantity so I can select the best package size(s)
4. **As a Pharmacy Technician**, I want to be warned about inactive NDCs so I avoid using them in prescriptions
5. **As a Pharmacist**, I want to see warnings about quantity mismatches so I can make informed decisions

---

## 6. Functional Requirements

### P0: Must-Have Features

**FR-1: Input Collection**
- Accept drug name (free text) or NDC (11-digit format)
- Accept SIG (free text, natural language)
- Accept days' supply (positive integer, 1-365)
- Client-side validation with real-time feedback

**FR-2: Drug Normalization**
- Convert drug name to RxCUI using RxNorm API (`/rxcui?name={drugName}`)
- Handle NDC input (normalize format, lookup via RxNorm)
- Handle multiple matches (brand vs generic, present options)
- Get spelling suggestions for unrecognized drugs
- Cache RxNorm results (TTL: 7 days)

**FR-3: NDC Retrieval**
- Fetch all NDCs for given RxCUI from RxNorm API (`/rxcui/{rxcui}/allndcs`)
- For each NDC, fetch package details from FDA API
- Filter out inactive NDCs (check FDA status field)
- Parse package sizes from package descriptions (handle multi-pack formats)
- Normalize NDC formats (10-digit ↔ 11-digit conversion)
- Cache NDC lists (TTL: 24 hours), package details (TTL: 24 hours)

**FR-4: SIG Parsing**
- **Primary:** Parse free-text SIG using regex patterns (handles 80%+ of cases)
- **Fallback:** Use OpenAI API only when regex confidence < 0.8
- Extract: dosage amount, frequency, unit, confidence score
- Handle common patterns: "Take X [unit] [route] [frequency] [timing]"
- Validate parsed output (dosage > 0, frequency > 0)
- Cache parsed SIG (TTL: 30 days, keyed by normalized SIG text)

**FR-5: Quantity Calculation**
- Calculate: (dosage × frequency) × days' supply
- Handle unit normalization (tablets, capsules, mL, units)
- Return total quantity with unit

**FR-6: Optimal NDC Selection**
- Match package sizes to calculated quantity
- Prioritize exact matches
- Generate multi-pack combinations
- Rank by: exactness → package count → overfill amount
- Return top 3-5 recommendations
- Calculate overfill/underfill amounts

**FR-7: Warnings & Flags**
- Flag inactive NDCs (if any found)
- Highlight overfills (>10% waste)
- Highlight underfills (insufficient quantity)
- Warn about dosage form mismatches
- Display warnings in UI with clear messaging

**FR-8: Response Format**
- Return structured JSON response
- Include all calculation details
- Include warnings and flags
- Display formatted results in UI

### P1: Should-Have Features

- Enhanced notifications (toast messages, visual indicators)
- Support for special dosage forms (liquids, insulin, inhalers)
- Unit conversions for complex scenarios

### P2: Nice-to-Have Features

- Calculation history (localStorage)
- Export results (JSON/CSV)
- Basic analytics dashboard

---

## 7. Technical Requirements

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | SvelteKit | Full-stack framework |
| Language | TypeScript 5.x | Type safety |
| Styling | Tailwind CSS | Utility-first CSS framework |
| AI Service | OpenAI API | SIG parsing |
| Drug API | RxNorm API | Drug normalization |
| NDC API | FDA NDC Directory | NDC data |
| Testing | Vitest, Playwright | Unit & E2E tests |
| Deployment | Render → GCP | Hosting |

### Development Requirements

- **Node.js:** ≥18.x
- **Package Manager:** npm or pnpm
- **Code Quality:** ESLint, Prettier
- **Type Safety:** Strict TypeScript configuration
- **Styling:** Tailwind CSS with PostCSS

### API Requirements

- **Error Handling:** Retry logic with exponential backoff
- **Timeouts:** 10 seconds per external API call
- **Rate Limiting:** Respect external API limits
- **Caching:** In-memory cache with TTLs

---

## 8. System Architecture

### Architecture Overview

See `architecture.mmd` for detailed diagrams.

### Component Structure

```
src/
├── routes/
│   ├── +page.svelte              # Main UI
│   ├── api/
│   │   ├── calculate/+server.ts  # POST /api/calculate
│   │   └── health/+server.ts     # GET /api/health (health check)
├── lib/
│   ├── services/                 # External API clients
│   │   ├── rxnorm.ts             # RxNorm API wrapper
│   │   ├── fda.ts                # FDA NDC API wrapper
│   │   ├── openai.ts             # OpenAI API wrapper (fallback only)
│   │   └── cache.ts              # Cache service (Map/Redis)
│   ├── core/                     # Business logic
│   │   ├── sigParser.ts          # Regex + AI SIG parser
│   │   ├── regexSigParser.ts     # Primary regex-based parser
│   │   ├── quantityCalculator.ts # Quantity calculation logic
│   │   ├── ndcSelector.ts        # NDC ranking & selection
│   │   ├── packageParser.ts      # Parse package descriptions
│   │   └── validator.ts          # Input validation
│   ├── utils/                    # Helpers
│   │   ├── ndcNormalizer.ts      # NDC format normalization
│   │   ├── unitConverter.ts      # Unit conversions
│   │   ├── requestDeduplicator.ts # Deduplicate concurrent requests
│   │   └── logger.ts             # Structured logging
│   ├── types/                    # TypeScript definitions
│   │   ├── api.ts                # API request/response types
│   │   ├── drug.ts               # Drug-related types
│   │   └── ndc.ts                # NDC-related types
│   └── constants/                # Constants
│       └── sigPatterns.ts        # Regex patterns for SIG parsing
└── tests/
    ├── unit/
    │   ├── sigParser.test.ts
    │   ├── packageParser.test.ts
    │   ├── ndcSelector.test.ts
    │   └── ndcNormalizer.test.ts
    └── integration/
        └── calculate.test.ts
```

### Data Flow

User input → Validation → Cache check → API calls (if needed) → Parse SIG → Calculate quantity → Select NDCs → Format response → Display results

### Caching Strategy

| Cache Type | TTL | Rationale |
|------------|-----|-----------|
| RxNorm (drug → RxCUI) | 7 days | Drug names rarely change |
| RxNorm (RxCUI → NDCs) | 24 hours | NDC lists can be updated |
| FDA (NDC details) | 24 hours | Active status can change |
| SIG Parsing | 30 days | Patterns are consistent |

**Implementation:**
- **Development:** In-memory Map with LRU eviction (max 1000 entries)
- **Production:** Redis (Render free tier or upgrade)
- **Cache Keys:** Hashed normalized inputs
- **Request Deduplication:** Coalesce concurrent identical requests

---

## 9. API Specifications

### Internal API: `/api/calculate`

**Endpoint:** `POST /api/calculate`

**Request:**
```typescript
{
  drugInput: string;      // Drug name or NDC
  sig: string;            // Prescription instructions
  daysSupply: number;     // Days of supply (1-365)
}
```

**Response (Success):**
```typescript
{
  success: true;
  data: {
    drug: { name, rxcui, strength?, dosageForm? };
    quantity: { total, unit, calculation: { dosage, frequency, daysSupply } };
    recommendedNdc: { ndc, packageSize, packageDescription, manufacturer, overfill, underfill };
    alternatives: Array<{ ndc, packageSize, packageCount?, totalQuantity, overfill, underfill }>;
    warnings: Array<{ type, message, severity }>;
    inactiveNdcs?: Array<{ ndc, reason }>;
  };
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: { code: string, message: string, details?: any };
}
```

**Error Codes:** `INVALID_INPUT`, `DRUG_NOT_FOUND`, `NO_NDCS_FOUND`, `SIG_PARSE_FAILED`, `API_ERROR`, `CALCULATION_ERROR`

### External APIs

**RxNorm API:** `https://rxnav.nlm.nih.gov/REST`
- `/rxcui?name={drugName}` - Search by name, get RxCUI
- `/rxcui/{rxcui}/allndcs` - Get all NDCs for a given RxCUI
- `/rxcui/{rxcui}/property?propName=AVAILABLE_STRENGTH` - Get strength info
- `/spellingsuggestions?name={drugName}` - Get spelling suggestions for errors

**FDA NDC Directory API:** `https://api.fda.gov/drug/ndc.json`
- `?search=product_ndc:{ndc}` - Get package details for specific NDC
- `?search=product_ndc:{ndc}&limit=100` - Get all packages for NDC
- Returns: package descriptions, active status, manufacturer, dosage form

**OpenAI API:** `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o-mini` - Parse complex SIG patterns (fallback only)
- Used only when regex parser confidence < 0.8

---

## 10. Data Models

### Core Types

```typescript
interface CalculationRequest { drugInput: string; sig: string; daysSupply: number; }
interface DrugInfo { name: string; rxcui: string; strength?: string; dosageForm?: string; }
interface NdcInfo { ndc: string; packageSize: number; packageDescription: string; manufacturer: string; dosageForm: string; active: boolean; }
interface ParsedSig { dosage: number; frequency: number; unit: string; confidence: number; }
interface QuantityResult { total: number; unit: string; calculation: { dosage: number; frequency: number; daysSupply: number; }; }
interface NdcSelection { ndc: string; packageSize: number; packageCount?: number; totalQuantity: number; overfill: number; underfill: number; matchScore: number; }
interface Warning { type: 'inactive_ndc' | 'overfill' | 'underfill' | 'dosage_form_mismatch'; message: string; severity: 'error' | 'warning' | 'info'; }
```

---

## 11. UI Requirements

### Layout & Design

**Input Form:**
- Clean, centered layout using Tailwind CSS
- Three input fields with labels
- Real-time validation feedback
- Submit button (disabled when invalid)
- Loading state during calculation
- Tailwind utility classes for responsive design

**Results Display:**
- Collapsible results section
- Drug information card
- Quantity calculation breakdown
- Recommended NDC (highlighted)
- Alternative options (expandable)
- Warnings section (color-coded)
- Inactive NDCs list (if any)

**Error States:**
- Clear error messages
- Suggestions for corrections
- Retry functionality

**Responsive Design:**
- Desktop: Full-width layout (Tailwind: `lg:` breakpoints)
- Tablet: Optimized for touch (Tailwind: `md:` breakpoints)
- Mobile: Stacked layout (Tailwind: default mobile-first)

**Accessibility:**
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

---

## 12. Error Handling

### Error Scenarios

| Scenario | Handling | UI Message |
|----------|----------|------------|
| Drug Not Found | Use RxNorm spelling suggestions API | "Drug not found. Did you mean: [Lisinopril, Losartan, Lipitor]?" |
| No NDCs Available | Return error with explanation | "No active NDCs found for this drug" |
| SIG Parse Failure (Regex) | Try OpenAI fallback | "Parsing with AI..." |
| SIG Parse Failure (Both) | Return error, ask user to clarify | "Could not parse instructions. Please use format: 'Take X [unit] [frequency]'" |
| API Timeout | Retry with exponential backoff (3 attempts, 1s/2s/4s) | "Service temporarily unavailable. Retrying..." |
| Invalid Days Supply | Client-side validation | "Days supply must be between 1 and 365" |
| Invalid NDC Format | Normalize automatically | Accept all formats: 10-digit, 11-digit, with/without dashes |
| Package Size Parse Failure | Flag for manual review | Warning "Could not parse package size from: [description]" |
| Unit Mismatch | Flag as warning, still calculate | Warning "Dosage form mismatch: SIG says 'tablets' but NDC is 'capsules'" |
| Multiple RxCUI Matches | Present options to user | "Multiple matches found: [Brand Name (RxCUI), Generic Name (RxCUI)]" |

### Edge Cases

| Edge Case | Handling Strategy |
|-----------|-------------------|
| PRN medications | Frequency = 0, calculate based on max daily dose if provided |
| Complex SIG (multiple dosages) | Parse primary dosage, flag complexity warning |
| Brand vs Generic | Present both options, let user select |
| Special units (insulin units, mL, actuations) | Unit-specific converters, validate against dosage form |
| Multi-pack formats | Parse "3 x 30 tablets" → 90 total, recommend as single option |
| Very large quantities (>365 days) | Warn about practicality, suggest review |
| NDC format variations | Normalize: "0002-3227-30" → "00002322730" |
| Liquid volumes | Handle mL, L conversions; match against package volumes |
| Inhalers | Parse actuations from package description |
| Compound medications | Flag as unsupported, suggest manual entry |

---

## 13. Performance & Security

**Performance Targets:** Total request <2s (P95), Cache hit <100ms, External APIs <1s each

**Optimization:** 
- Aggressive caching with appropriate TTLs
- **Parallel API calls** (NDC fetch + SIG parse can run concurrently)
- Request deduplication (coalesce identical in-flight requests)
- Frontend debouncing (300ms on input fields)
- Lazy loading for alternative NDC options

**Security:** API keys in env vars only, input validation/sanitization, no internal error exposure, rate limiting, no PHI storage

---

## 14. Testing Strategy

**Unit Tests (≥80% coverage):** SIG Parser, Quantity Calculator, NDC Selector, Validators, Unit Converters

**Integration Tests:** End-to-end calculation flow, API routes with mocked services, error handling, cache scenarios

**E2E Tests (Playwright):** Complete user flow, error handling UI, loading states, responsive design

---

## 15. Deployment

### Deployment

**Render (Initial):** Node.js environment, env vars configured, health check `/api/health`, build: `npm run build`, start: `node build`

**Environment Variables:** `OPENAI_API_KEY`, `RXNORM_API_KEY` (if required), `FDA_API_KEY` (if required), `NODE_ENV=production`

**GCP (Production):** Cloud Run/App Engine, Cloud SQL (if needed), Redis for caching, monitoring/logging

---

## 16. Implementation Phases

**Phase 0 (Day 0): API Research & Validation** ⚠️ **CRITICAL**
- Test RxNorm API endpoints with real queries (Postman/curl)
- Test FDA NDC API with sample NDCs
- Verify API response formats and rate limits
- Document actual API behavior vs assumptions
- Test NDC format variations
- Collect sample package descriptions for parser testing

**Phase 1 (Days 1-2): Foundation & Core Utilities**
- SvelteKit setup with TypeScript strict mode
- Tailwind CSS configuration and setup
- Project structure (see updated structure above)
- Core TypeScript types and interfaces
- NDC normalizer utility (handle all format variations)
- Package description parser (with extensive test cases)
- Basic UI shell with Tailwind styling
- Health check endpoint

**Phase 2 (Days 3-4): API Integration & Caching**
- RxNorm service (correct endpoints: `/rxcui`, `/allndcs`, `/spellingsuggestions`)
- FDA service (correct flow: RxNorm NDCs → FDA details)
- Cache service (in-memory Map with LRU, Redis-ready)
- Request deduplicator
- Error handling with retry logic
- Structured logging

**Phase 3 (Days 5-6): Core Business Logic**
- Regex-based SIG parser (primary, handles common patterns)
- OpenAI SIG parser (fallback for complex cases)
- SIG parser orchestrator (try regex first, AI if confidence < 0.8)
- Quantity calculator with unit handling
- NDC selector with ranking algorithm
- Multi-pack support
- Warning generation logic

**Phase 4 (Days 7-8): UI & User Experience**
- Results display with collapsible sections
- Loading states (skeletons, not just spinners)
- Error states with spelling suggestions
- Responsive design (desktop/tablet/mobile)
- Accessibility (ARIA labels, keyboard navigation)
- Copy to clipboard functionality
- Performance metrics display (optional)

**Phase 5 (Days 9-10): Testing, Optimization & Deployment**
- Unit tests (focus on: package parser, NDC selector, SIG parser, NDC normalizer)
- Integration tests with mocked API responses
- E2E tests for happy path
- Performance testing (parallel API calls, cache hit rates)
- Deploy to Render with environment variables
- Create DECISIONS.md documenting key technical choices
- Document known limitations and production improvements

---

## 17. Acceptance Criteria

### P0 Acceptance Criteria

**AC-1: Drug Normalization** - Enter drug/NDC → Get RxCUI → Handle not found (with suggestions) → Handle multiple matches → Cache 7d  
**AC-2: NDC Retrieval** - Get NDCs from RxNorm → Fetch details from FDA → Filter inactive → Parse package sizes → Normalize formats → Cache 24h  
**AC-3: SIG Parsing** - Regex parser (primary) → Confidence check → AI parsing (if needed) → Validate → Cache 30d  
**AC-4: Quantity Calculation** - Calculate correctly → Handle units → Formula: (dosage × frequency) × daysSupply  
**AC-5: NDC Selection** - Recommend optimal → Prioritize exact → Multi-pack options → Calculate overfill/underfill → Top 3-5  
**AC-6: Warnings** - Flag inactive NDCs → Highlight overfills (>10%) → Highlight underfills → Warn dosage form mismatches  
**AC-7: Response Format** - Structured JSON → All fields present → UI displays correctly → Consistent errors  
**AC-8: Performance** - Response <2s (P95) → Cache hit ≥60% → No memory leaks → Concurrent requests  
**AC-9: Error Handling** - All scenarios handled → User-friendly messages → No crashes → Graceful degradation  
**AC-10: Testing** - Unit coverage ≥80% → Integration tests pass → E2E tests pass → All AC tested

---

## Dependencies & Assumptions

**External Dependencies:** 
- RxNorm API (free, no key required, rate limits: reasonable for demo)
- FDA NDC Directory API (free, no key required, rate limits: 240 requests/minute)
- OpenAI API (requires key, costs ~$0.0001-0.0005 per SIG parse, used sparingly)

**Assumptions:** 
- Users have basic technical proficiency and understand prescription terminology
- RxNorm provides NDC lists for most common drugs
- FDA API provides package details for most NDCs (some may be missing)
- Package descriptions follow common formats (but parser must handle variations)
- Regex can handle 80%+ of SIG patterns, reducing OpenAI costs
- Caching significantly reduces external API load
- NDC active status in FDA data is current (may have lag)

## Out of Scope

Integration with pharmacy systems, advanced analytics, multi-drug prescriptions, user authentication, real-time NDC updates, drug interaction checking

---

**Document Status:** Draft  
**Next Review:** After Phase 1 completion  
**Owner:** Development Team  
**Stakeholders:** Foundation Health Interview Panel
