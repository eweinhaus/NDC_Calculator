# NDC Packaging & Quantity Calculator

An AI-accelerated web application that matches prescriptions with valid National Drug Codes (NDCs) and calculates correct dispense quantities from free-text prescription instructions (SIG). The tool identifies optimal package sizes while flagging inactive NDCs and quantity mismatches.

## Features

- **Drug Normalization:** Convert drug names or NDCs to RxCUI using RxNorm API
- **NDC Retrieval:** Fetch valid NDCs and package details from FDA API
- **SIG Parsing:** Parse prescription instructions using regex (primary) with OpenAI fallback
- **Quantity Calculation:** Calculate total quantity needed: (dosage × frequency) × days' supply
- **NDC Selection:** Recommend optimal NDCs with multi-pack support
- **Warnings:** Flag inactive NDCs, overfills, underfills, and dosage form mismatches
- **Responsive Design:** Works on desktop, tablet, and mobile devices
- **Accessibility:** Full keyboard navigation, ARIA labels, screen reader support

## Technology Stack

- **Framework:** SvelteKit (TypeScript)
- **Styling:** Tailwind CSS
- **AI:** OpenAI API (gpt-4o-mini) for SIG parsing fallback
- **APIs:** RxNorm API, FDA NDC Directory API
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Deployment:** Render (initial), GCP (production)

## Prerequisites

- Node.js ≥18.x
- npm or pnpm
- OpenAI API key (for SIG parsing fallback)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NDC_Calculator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

Required environment variables:
- `OPENAI_API_KEY` - OpenAI API key (required for AI fallback)
- `NODE_ENV` - Set to `production` for production builds

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Run Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires dev server running)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run check
```

## Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte UI components
│   │   ├── results/       # Results display components
│   │   └── ...            # Other components
│   ├── constants/         # Constants (patterns, cache keys, TTLs)
│   ├── core/              # Business logic (parsing, calculation, selection)
│   ├── services/          # External API clients (RxNorm, FDA, OpenAI)
│   ├── stores/            # Svelte stores (toast notifications)
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions (normalization, retry, etc.)
├── routes/
│   ├── api/               # API endpoints
│   │   ├── calculate/     # POST /api/calculate
│   │   └── health/        # GET /api/health
│   └── +page.svelte       # Main page
└── tests/
    ├── e2e/               # Playwright E2E tests
    ├── integration/       # Integration tests
    └── unit/              # Unit tests
```

## API Documentation

### POST /api/calculate

Calculate NDC recommendations for a prescription.

**Request:**
```json
{
  "drugInput": "Lisinopril",
  "sig": "Take 1 tablet by mouth twice daily",
  "daysSupply": 30
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "drug": {
      "name": "Lisinopril",
      "rxcui": "2903",
      "strength": "10 MG",
      "dosageForm": "TABLET"
    },
    "quantity": {
      "total": 60,
      "unit": "tablet",
      "calculation": {
        "dosage": 1,
        "frequency": 2,
        "daysSupply": 30
      }
    },
    "recommendedNdc": {
      "ndc": "68180-123-01",
      "packageSize": 60,
      "packageDescription": "60 TABLET in 1 BOTTLE",
      "manufacturer": "Manufacturer Name",
      "overfill": 0,
      "underfill": 0
    },
    "alternatives": [...],
    "warnings": [...],
    "inactiveNdcs": [...]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "DRUG_NOT_FOUND",
    "message": "Drug not found. Did you mean: Lisinopril, Losartan?",
    "details": {
      "suggestions": ["Lisinopril", "Losartan"]
    }
  }
}
```

**Error Codes:**
- `INVALID_INPUT` - Validation error
- `DRUG_NOT_FOUND` - Drug not found (with suggestions)
- `NO_NDCS_FOUND` - No active NDCs found
- `SIG_PARSE_FAILED` - Could not parse SIG
- `API_ERROR` - External API error
- `CALCULATION_ERROR` - Business logic error

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T14:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

## Testing

### Unit Tests

Unit tests use Vitest and cover:
- Core utilities (NDC normalization, package parsing)
- Business logic (SIG parsing, quantity calculation, NDC selection)
- Services (API clients, cache, retry logic)
- Utilities (logger, debounce, clipboard)

**Coverage Target:** ≥80% overall, ≥90% for critical components

### Integration Tests

Integration tests cover:
- API endpoint flows
- Service integration
- Error handling
- Cache integration

### E2E Tests

E2E tests use Playwright and cover:
- Happy path user flow
- Error handling scenarios
- Loading states
- Responsive design
- Accessibility

**Browsers Tested:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

## Deployment

### Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Name:** `ndc-calculator`
   - **Runtime:** Node.js
   - **Build Command:** `npm run build`
   - **Start Command:** `node build` (or `npm start` depending on adapter)
   - **Region:** Choose closest to users

4. Set environment variables:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `NODE_ENV=production`

5. Configure health check:
   - **Path:** `/api/health`
   - **Expected Status:** 200

6. Deploy and verify:
   - Check deployment logs
   - Test `/api/health` endpoint
   - Test `/api/calculate` endpoint
   - Test UI in browser

### Production Considerations

- Use Redis for caching (instead of in-memory)
- Set up monitoring and alerts
- Configure CDN for static assets
- Set up error tracking (e.g., Sentry)
- Monitor API usage and costs
- Set up rate limiting if needed

## Performance

**Targets:**
- Response time: <2s (P95)
- Cache hit rate: ≥60%
- External APIs: <1s each

**Optimizations:**
- Aggressive caching with appropriate TTLs
- Parallel API calls (NDC fetch + SIG parse)
- Request deduplication
- Frontend debouncing

## Documentation

- [DECISIONS.md](./DECISIONS.md) - Technical decisions and rationale
- [LIMITATIONS.md](./LIMITATIONS.md) - Known limitations and edge cases
- [Planning Documents](./planning/) - PRDs, architecture, task lists

## Contributing

This is a take-home project for Foundation Health interview. For questions or issues, please contact the development team.

## License

[Add license information if applicable]

---

**Project:** NDC Packaging & Quantity Calculator  
**Organization:** Foundation Health  
**Status:** Production Ready

