# Technical Context: NDC Packaging & Quantity Calculator

## Technology Stack

### Core Framework
- **SvelteKit:** Full-stack framework for TypeScript
- **TypeScript 5.x:** Strict mode enabled for type safety
- **Node.js:** ≥18.x required
- **Styling:** Tailwind CSS with PostCSS and Autoprefixer

### External APIs
- **RxNorm API:** `https://rxnav.nlm.nih.gov/REST`
  - Free, no API key required
  - Endpoints:
    - `/rxcui?name={drugName}` - Drug name to RxCUI
    - `/rxcui/{rxcui}/allndcs` - RxCUI to NDC list
    - `/rxcui/{rxcui}/property?propName=AVAILABLE_STRENGTH` - Strength info
    - `/spellingsuggestions?name={drugName}` - Spelling suggestions
  - Rate limits: Reasonable for demo (to be validated in Phase 0)

- **FDA NDC Directory API:** `https://api.fda.gov/drug/ndc.json`
  - Free, no API key required
  - Rate limit: 240 requests/minute
  - Endpoints:
    - `?search=product_ndc:{ndc}` - Single NDC lookup
    - `?search=product_ndc:{ndc}&limit=100` - All packages for NDC

- **OpenAI API:** `https://api.openai.com/v1/chat/completions`
  - Model: `gpt-4o-mini`
  - Requires API key (environment variable)
  - Cost: ~$0.0001-0.0005 per SIG parse
  - Used sparingly (fallback only when regex confidence < 0.8)

### Testing
- **Vitest:** Unit testing framework
- **Playwright:** End-to-end testing
- Target coverage: ≥80% for unit tests

### Development Tools
- **ESLint:** Code linting with Svelte-specific rules
- **Prettier:** Code formatting
- **Package Manager:** npm or pnpm

### Deployment
- **Initial:** Render (Node.js environment) - ✅ **LIVE**
  - Service URL: https://ndc-calculator.onrender.com
  - Dashboard: https://dashboard.render.com/web/srv-d494eia4d50c7394ejk0
  - Build Command: `npm install && npm run build` (working with .npmrc fix)
  - Start Command: `node build`
  - Status: Live and accessible
- **Production:** GCP (Cloud Run/App Engine) - Future consideration
- **Caching:** In-memory (dev), Redis (production) - Ready for Redis upgrade
- **Adapter:** `@sveltejs/adapter-node` for Render deployment
- **Build Fix:** `.npmrc` file with `production=false` ensures devDependencies install

## Development Setup

### Prerequisites
- Node.js ≥18.x
- npm or pnpm
- OpenAI API key (for SIG parsing fallback)

### Environment Variables
```bash
OPENAI_API_KEY=sk-...          # Required for AI fallback (✅ validated)
RXNORM_API_KEY=...             # Not required (public API, ✅ validated)
FDA_API_KEY=...                # Not required (public API, ✅ validated)
NODE_ENV=production            # For production deployment
LOG_LEVEL=info                  # Optional: debug, info, warn, error (default: info in prod, debug in dev)
REDIS_URL=...                  # Optional: For Redis cache in production
```

### Build Commands
- Development: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- E2E: `npm run test:e2e`

### Tailwind CSS Configuration
- Config file: `tailwind.config.js`
- Content paths: `['./src/**/*.{html,js,svelte,ts}']`
- CSS entry: `src/app.css` with `@tailwind` directives
- Import in: `src/routes/+layout.svelte` or `src/app.html`

## Technical Constraints

### Performance Requirements
- Total request time: <2 seconds (P95)
- Cache hit response: <100ms
- External API calls: <1s each
- Target cache hit rate: ≥60%

### API Constraints
- FDA API: 240 requests/minute rate limit
- RxNorm API: Rate limits to be validated in Phase 0
- OpenAI API: Cost considerations (use sparingly)

### Data Format Constraints
- NDC formats: Must handle 10-digit, 11-digit, with/without dashes
- Package descriptions: Must parse diverse formats from FDA API
- SIG text: Must handle natural language variations

## TypeScript Configuration

### Strict Mode
- Enabled for maximum type safety
- Target: ES2022
- Module: ES2022
- Module resolution: bundler

### Type Definitions
All types defined in `lib/types/`:
- `api.ts`: API request/response types
- `drug.ts`: Drug-related types (DrugInfo, RxNormResponse)
- `ndc.ts`: NDC-related types (NdcInfo, NdcSelection)
- `sig.ts`: SIG parsing types (ParsedSig, QuantityResult)
- `warning.ts`: Warning types

## Caching Implementation (✅ Implemented)

### Development
- In-memory Map with LRU eviction (✅ `InMemoryCache` class)
- Max 1000 entries (configurable)
- TTL-based expiration (automatic cleanup on get/set)
- Cache key generation via `cacheKeys.ts` functions

### Production
- Redis (Render free tier or upgrade) - stub interface ready
- Same TTL values as development
- Cache key format: Normalized inputs via helper functions

### Cache TTLs (✅ Defined in `cacheTtl.ts`)
- RxNorm (drug → RxCUI): 7 days (604800 seconds)
- RxNorm (RxCUI → NDCs): 24 hours (86400 seconds)
- FDA (NDC details): 24 hours (86400 seconds)
- SIG Parsing: 30 days (2592000 seconds)

## API Error Handling (✅ Implemented)

### Retry Strategy (✅ `retry.ts`)
- Exponential backoff: 1s, 2s, 4s (configurable multiplier)
- Maximum 3 attempts (configurable, OpenAI uses 2)
- Timeout: 10 seconds per call
- Error classification: `shouldRetry()` function determines retryability
- Retries on: Network errors, timeouts, 500-599, 429
- Doesn't retry on: 400-499 (except 429), invalid responses

### Error Codes
- `INVALID_INPUT`: Client validation failed
- `DRUG_NOT_FOUND`: Drug not found (with suggestions)
- `NO_NDCS_FOUND`: No active NDCs
- `SIG_PARSE_FAILED`: Parsing failed
- `API_ERROR`: External API error
- `CALCULATION_ERROR`: Business logic error

## Security Considerations

- API keys in environment variables only
- Input validation and sanitization
- No internal error details exposed
- Rate limiting considerations
- No PHI storage

## Dependencies

### Core Dependencies
- SvelteKit
- TypeScript 5.x
- Tailwind CSS
- PostCSS
- Autoprefixer
- jsPDF (^3.0.3) - PDF generation library

### Development Dependencies
- ESLint
- Prettier
- Vitest
- Playwright
- @sveltejs/adapter-node (for Render deployment)

### Optional Dependencies
- date-fns (if needed for date handling)
- Redis client (for production caching)

## PDF Generation Feature

### Implementation
- **Library:** jsPDF (^3.0.3)
- **Utility:** `src/lib/utils/pdfGenerator.ts`
- **Functions:**
  - `openPdfInNewTab(results)` - Generates PDF and opens in new browser tab
  - `downloadResultsAsPdf(results)` - Generates PDF and triggers download
- **Features:**
  - Professional styled PDF with blue header
  - Two-column layout for drug info and quantity calculation
  - Styled section boxes with blue title bars
  - Includes all calculation results (drug info, quantity, recommended NDC, alternatives, warnings)
  - Handles text wrapping and page overflow
  - Sanitizes text for PDF compatibility
  - Multiple download methods (blob URL with data URL fallback)
- **Integration:**
  - "View PDF" button in main results page
  - Opens PDF in new tab for viewing
  - Toast notifications for success/error states
- **Test Pages:**
  - `/test-pdf` - Test page for PDF generation functionality
  - `/test-rewrite` - Test page for SIG rewrite functionality
  - `/api/test-rewrite` - API endpoint for testing SIG rewrite

---

**Last Updated:** Phase 5 Complete & Deployed (2025-01-27) - Service Live ✅

