# Project Brief: NDC Packaging & Quantity Calculator

**Project:** NDC Packaging & Quantity Calculator  
**Organization:** Foundation Health  
**Project ID:** hnCCiUa1F2Q7UU8GBlCe_1762540939252  
**Type:** Take-home project for AI-first Software Engineer interview  
**Status:** Phase 3 Complete - Core Business Logic Implemented

---

## Core Purpose

The NDC Packaging & Quantity Calculator is an AI-accelerated web application that matches prescriptions with valid National Drug Codes (NDCs) and calculates correct dispense quantities from free-text prescription instructions (SIG). The tool identifies optimal package sizes while flagging inactive NDCs and quantity mismatches.

## Primary Goals

1. **Reduce claim rejections** due to NDC mismatches by 50%
2. **Improve accuracy** of medication normalization to 95%+
3. **Automate quantity calculation** from natural language prescription instructions
4. **Identify optimal package combinations** to minimize waste
5. **Provide real-time validation** and warnings for pharmacy staff

## Target Users

- **Primary:** Pharmacists and Pharmacy Technicians
- **Secondary:** Healthcare Administrators

## Core Requirements

### Must-Have Features (P0)
- Input drug name/NDC, SIG (prescription instructions), and days' supply
- Normalize drug to RxCUI using RxNorm API
- Retrieve valid NDCs and package sizes from FDA NDC Directory API
- Parse SIG using regex (primary) with OpenAI fallback (complex cases only)
- Calculate total quantity: (dosage × frequency) × days' supply
- Select optimal NDC(s) matching calculated quantity
- Flag inactive NDCs and highlight overfills/underfills
- Provide structured JSON output and UI display

### Success Metrics
- Normalization accuracy: ≥95%
- Response time: <2 seconds (P95)
- Error rate: <5%
- Cache hit rate: ≥60%

## Technology Stack

- **Framework:** SvelteKit (TypeScript)
- **AI:** OpenAI API (gpt-4o-mini) for SIG parsing fallback
- **APIs:** RxNorm API, FDA NDC Directory API
- **Deployment:** Render (initial), GCP (production)
- **Testing:** Vitest (unit), Playwright (E2E)

## Implementation Phases

1. **Phase 0:** API Research & Validation (Day 0) - ⚠️ CRITICAL
2. **Phase 1:** Foundation & Core Utilities (Days 1-2)
3. **Phase 2:** API Integration & Caching (Days 3-4)
4. **Phase 3:** Core Business Logic (Days 5-6)
5. **Phase 4:** UI & User Experience (Days 7-8)
6. **Phase 5:** Testing, Optimization & Deployment (Days 9-10)

## Key Constraints

- Must handle NDC format variations (10-digit, 11-digit, with/without dashes)
- Must parse diverse package description formats from FDA API
- Must optimize OpenAI API usage (regex-first approach to minimize costs)
- Must respect external API rate limits (FDA: 240 req/min)
- Must achieve <2s response time (P95)

## Out of Scope

- Integration with pharmacy management systems
- User authentication
- Real-time NDC updates
- Drug interaction checking
- Multi-drug prescriptions
- Advanced analytics

---

**Last Updated:** Phase 3 Completion (2025-11-10)  
**Next Review:** After Phase 4 completion

