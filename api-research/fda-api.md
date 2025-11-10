# FDA NDC Directory API Research & Documentation

**Base URL:** `https://api.fda.gov/drug/ndc.json`  
**Format:** JSON only  
**Authentication:** None required (public API)  
**Rate Limit:** 240 requests/minute (documented)  
**Last Updated:** Phase 0 Research

---

## Overview

FDA NDC Directory API provides comprehensive drug and package information including NDC codes, package descriptions, active status, manufacturer information, and RxCUI mappings.

**Key Finding:** FDA API is the primary source for NDC package details. RxNorm's `allndcs` endpoint is unreliable, so use FDA API with `openfda.rxcui` search instead.

---

## Endpoints

### 1. Single NDC Lookup

**Endpoint:** `GET /drug/ndc.json?search=product_ndc:{ndc}`

**Description:** Retrieves product information for a specific NDC.

**Example Request:**
```bash
curl "https://api.fda.gov/drug/ndc.json?search=product_ndc:76420-345&limit=5"
```

**Success Response Structure:**
```json
{
  "meta": {
    "disclaimer": "...",
    "terms": "https://open.fda.gov/terms/",
    "license": "https://open.fda.gov/license/",
    "last_updated": "2025-11-07",
    "results": {
      "skip": 0,
      "limit": 5,
      "total": 1
    }
  },
  "results": [
    {
      "product_ndc": "76420-345",
      "generic_name": "Lisinopril",
      "labeler_name": "Asclemed USA, Inc.",
      "brand_name": "LISINOPRIL",
      "active_ingredients": [
        {
          "name": "LISINOPRIL",
          "strength": "40 mg/1"
        }
      ],
      "finished": true,
      "packaging": [
        {
          "package_ndc": "76420-345-00",
          "description": "1000 TABLET in 1 BOTTLE (76420-345-00)",
          "marketing_start_date": "20250502",
          "sample": false
        }
      ],
      "listing_expiration_date": "20261231",
      "openfda": {
        "rxcui": ["197884", "205326", "311353", "311354", "314076", "314077"],
        "manufacturer_name": ["Asclemed USA, Inc."]
      },
      "dosage_form": "TABLET",
      "product_type": "HUMAN PRESCRIPTION DRUG"
    }
  ]
}
```

**Key Fields:**
- `product_ndc`: Product-level NDC (without package code)
- `package_ndc`: Full package NDC (with package code)
- `description`: Package description (format varies - see below)
- `listing_expiration_date`: Used to determine active status (YYYYMMDD format)
- `openfda.rxcui`: Array of RxCUI identifiers (critical for linking to RxNorm)
- `dosage_form`: Dosage form (TABLET, CAPSULE, etc.)
- `active_ingredients[].strength`: Strength information

**NDC Format Handling:**
- Accepts NDC with or without dashes: "76420-345" or "76420345"
- Product NDC: "76420-345" (5-4 format)
- Package NDC: "76420-345-00" (5-4-2 format)

**Error Response:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No matches found!"
  }
}
```

---

### 2. Multiple Packages for NDC

**Endpoint:** `GET /drug/ndc.json?search=product_ndc:{ndc}&limit=100`

**Description:** Retrieves all package variations for a product NDC.

**Example Request:**
```bash
curl "https://api.fda.gov/drug/ndc.json?search=product_ndc:76420-345&limit=100"
```

**Response:** Same structure as single lookup, but `packaging` array contains multiple entries.

**Test Cases:**
- Product with single package: Returns 1 packaging entry
- Product with multiple packages: Returns multiple packaging entries (30, 60, 90, 100 tablets, etc.)
- Different dosage forms: Some products have tablets, capsules, liquids

**Finding:** Most prescription drugs have multiple package sizes (30, 60, 90, 100 tablets are common).

---

### 3. Search by RxCUI

**Endpoint:** `GET /drug/ndc.json?search=openfda.rxcui:{rxcui}&limit=100`

**Description:** Retrieves all NDCs associated with a given RxCUI.

**Example Request:**
```bash
curl "https://api.fda.gov/drug/ndc.json?search=openfda.rxcui:29046&limit=100"
```

**Finding:** This is the recommended approach for retrieving NDCs from RxCUI, as RxNorm's `allndcs` endpoint is unreliable.

**Response:** Same structure as other endpoints, but may return multiple products with different strengths or manufacturers.

---

### 4. Search by Generic Name

**Endpoint:** `GET /drug/ndc.json?search=generic_name:{name}&limit=100`

**Description:** Searches for products by generic drug name.

**Example Request:**
```bash
curl "https://api.fda.gov/drug/ndc.json?search=generic_name:LISINOPRIL&limit=5"
```

**Use Case:** Alternative approach to find drugs when RxNorm lookup fails or to discover all variations.

---

## Package Description Formats

**Critical Finding:** Package descriptions have significant format variations. Parser must handle all of these.

### Format Variations Found

1. **Simple Format:**
   - `"30 TABLET in 1 BOTTLE (76420-345-30)"`
   - `"100 TABLET in 1 BOTTLE (76420-345-01)"`
   - `"90 TABLET in 1 BOTTLE (76420-345-90)"`

2. **With Dosage Form Details:**
   - `"30 TABLET, EXTENDED RELEASE in 1 BOTTLE (65162-179-03)"`
   - `"100 TABLET, FILM COATED in 1 BOTTLE (65862-010-01)"`
   - `"30 TABLET, COATED in 1 BOTTLE (71335-1303-1)"`

3. **Multi-Pack Format:**
   - `"1 BLISTER PACK in 1 CARTON (80425-0231-1)  / 21 TABLET in 1 BLISTER PACK"`
   - `"25 VIAL in 1 CARTON (80327-013-00)  / 5 mL in 1 VIAL"`

4. **Liquid/Volume Format:**
   - `"87.1 g in 1 PACKAGE (79804-618-03)"`
   - `"35.5 mL in 1 BOTTLE"`
   - `"5 mL in 1 VIAL, MULTI-DOSE (76420-007-05)"`

5. **Spray/Actuation Format:**
   - `"1 BOTTLE, SPRAY in 1 CARTON (79903-295-72)  / 72 SPRAY, METERED in 1 BOTTLE, SPRAY"`

6. **Large Quantities:**
   - `"1000 TABLET in 1 BOTTLE (76420-345-00)"`
   - `"500 TABLET in 1 BOTTLE (76282-707-05)"`
   - `"2000 TABLET in 1 BOTTLE (65862-010-46)"`

7. **Special Formats:**
   - `"21 TABLET in 1 BOTTLE, PLASTIC (80425-0484-1)"`
   - `"28 TABLET in 1 BOTTLE (63629-1761-6)"`
   - `"56 TABLET in 1 BOTTLE (71335-1303-7)"`

### Parsing Challenges

1. **Quantity Extraction:** Must extract numeric quantity from various positions
2. **Unit Normalization:** Handle TABLET, CAPSULE, mL, g, SPRAY, etc.
3. **Multi-Pack Parsing:** Handle "X in Y / Z in X" format
4. **Dosage Form Variations:** "TABLET, EXTENDED RELEASE" vs "TABLET, FILM COATED"
5. **Decimal Quantities:** "87.1 g" requires decimal handling

**Recommendation:** Use regex patterns for common formats, with AI fallback for complex multi-pack formats.

---

## Active/Inactive Status

**Field:** `listing_expiration_date`

**Format:** YYYYMMDD (e.g., "20261231")

**Determining Active Status:**
- **Active:** `listing_expiration_date` is in the future (or null)
- **Inactive/Discontinued:** `listing_expiration_date` is in the past

**Test Cases:**
- Active NDC: `"listing_expiration_date": "20261231"` (future date)
- Inactive NDC: `"listing_expiration_date": "20200101"` (past date)

**Finding:** Most results have future expiration dates. Inactive NDCs are less common in search results but may appear.

**Recommendation:** 
- Filter by `listing_expiration_date > current_date` to get active NDCs
- Flag NDCs with past expiration dates as inactive

---

## Rate Limits

### Documented Rate Limit

**Rate Limit:** 240 requests/minute

**Testing:**
- Made sequential requests without hitting rate limit
- No rate limit errors encountered during normal testing
- Rate limit likely enforced at 240 req/min as documented

### Rate Limit Error Response

**Expected Format (not tested, but documented):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 240 requests per minute."
  }
}
```

### Recommended Retry Strategy

1. **Exponential Backoff:** 1s, 2s, 4s (3 attempts max)
2. **Request Throttling:** Implement 250ms delay between requests (240 req/min = 4 req/sec)
3. **Timeout:** 10 seconds per request
4. **Error Handling:** Retry on rate limit errors, fail on other errors

### Performance

- **Average Response Time:** ~300-800ms per request
- **P95 Response Time:** ~1-2 seconds
- **Timeout:** 10 seconds recommended

---

## Key Fields Reference

### Product-Level Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `product_ndc` | string | Product NDC (5-4 format) | "76420-345" |
| `generic_name` | string | Generic drug name | "Lisinopril" |
| `brand_name` | string | Brand name | "LISINOPRIL" |
| `labeler_name` | string | Manufacturer | "Asclemed USA, Inc." |
| `dosage_form` | string | Dosage form | "TABLET" |
| `product_type` | string | Product type | "HUMAN PRESCRIPTION DRUG" |
| `listing_expiration_date` | string | Expiration date (YYYYMMDD) | "20261231" |
| `active_ingredients` | array | Active ingredients with strength | `[{"name": "LISINOPRIL", "strength": "40 mg/1"}]` |

### Package-Level Fields (in `packaging` array)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `package_ndc` | string | Full package NDC (5-4-2) | "76420-345-00" |
| `description` | string | Package description | "1000 TABLET in 1 BOTTLE (76420-345-00)" |
| `marketing_start_date` | string | Marketing start (YYYYMMDD) | "20250502" |
| `sample` | boolean | Is sample package | false |

### OpenFDA Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `openfda.rxcui` | array | RxCUI identifiers | `["197884", "205326"]` |
| `openfda.manufacturer_name` | array | Manufacturer names | `["Asclemed USA, Inc."]` |

---

## Error Handling

### Common Error Scenarios

1. **NDC Not Found:**
   - Response: `{"error": {"code": "NOT_FOUND", "message": "No matches found!"}}`
   - Handling: Return user-friendly error, suggest checking NDC format

2. **Invalid NDC Format:**
   - Response: `{"error": {"code": "INVALID_INPUT", "message": "..."}}`
   - Handling: Normalize NDC format and retry

3. **Rate Limit Exceeded:**
   - Response: Rate limit error (see above)
   - Handling: Implement exponential backoff retry

4. **Network Errors:**
   - Handling: Retry with exponential backoff, timeout after 10 seconds

---

## Key Findings & Recommendations

### Critical Findings

1. **NDC Retrieval:** FDA API is the primary source for NDC package details. Use `search=openfda.rxcui:{rxcui}` to get NDCs from RxCUI.

2. **Package Descriptions:** Format variations are extensive. Parser must handle:
   - Simple formats: "30 TABLET in 1 BOTTLE"
   - Multi-pack: "1 BLISTER PACK in 1 CARTON / 21 TABLET in 1 BLISTER PACK"
   - Liquids: "87.1 g in 1 PACKAGE"
   - Special formats: sprays, vials, etc.

3. **Active Status:** Use `listing_expiration_date` field. Compare with current date to determine active status.

4. **RxCUI Mapping:** `openfda.rxcui` array provides link between FDA and RxNorm data.

### Recommendations for Implementation

1. **Primary Flow:**
   - Use RxNorm for drug name → RxCUI
   - Use FDA API with `search=openfda.rxcui:{rxcui}` for RxCUI → NDCs
   - Use FDA API for package details (already retrieved in step 2)

2. **Package Parser:**
   - Start with regex patterns for common formats
   - Use AI fallback for complex multi-pack formats
   - Handle decimal quantities (87.1 g)
   - Normalize units (TABLET, CAPSULE, mL, g, SPRAY)

3. **Caching:**
   - Cache FDA responses (24 hours TTL as planned)
   - Cache by product_ndc and package_ndc
   - Invalidate cache if listing_expiration_date changes

4. **Rate Limiting:**
   - Implement 250ms delay between requests (240 req/min)
   - Use exponential backoff for retries
   - Consider request queuing for high-volume scenarios

---

## Sample Data Collected

See `test-data/package-descriptions.json` for 30+ package description examples.

---

**Status:** Complete  
**Next Steps:** Use findings to implement FDA service in Phase 2

