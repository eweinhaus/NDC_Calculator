# RxNorm API Research & Documentation

**Base URL:** `https://rxnav.nlm.nih.gov/REST`  
**Format:** Supports both XML (default) and JSON (add `.json` extension)  
**Authentication:** None required (public API)  
**Last Updated:** Phase 0 Research

---

## Overview

RxNorm API provides drug name normalization to RxCUI (RxNorm Concept Unique Identifier) and NDC lookups. The API supports both XML and JSON formats.

**Key Finding:** API returns XML by default, but JSON format is available by appending `.json` to the endpoint URL.

---

## Endpoints

### 1. Drug Name to RxCUI Lookup

**Endpoint:** `GET /rxcui.json?name={drugName}`

**Description:** Converts a drug name to RxCUI identifier(s).

**Example Request:**
```bash
curl "https://rxnav.nlm.nih.gov/REST/rxcui.json?name=Lisinopril"
```

**Success Response:**
```json
{
  "idGroup": {
    "rxnormId": ["29046"]
  }
}
```

**Response Structure:**
- `idGroup.rxnormId`: Array of RxCUI identifiers (usually single value for exact matches)

**Test Cases:**

| Drug Name | RxCUI | Notes |
|-----------|-------|-------|
| Lisinopril | 29046 | Generic drug |
| Metformin | 6809 | Generic drug |
| Lipitor | 153165 | Brand name |
| Atorvastatin | 83367 | Generic equivalent of Lipitor |

**Edge Cases:**
- **Multiple Matches:** Some drugs may return multiple RxCUIs (brand vs generic)
- **No Matches:** Returns empty `idGroup` or `{}`
- **With Strength:** "Lisinopril 10mg" returns same RxCUI as "Lisinopril" (strength not used in lookup)

**Error Handling:**
- Invalid drug names return empty `idGroup`
- API does not return explicit error messages for not found

---

### 2. RxCUI to NDC List Retrieval

**Endpoint:** `GET /rxcui/{rxcui}/allndcs.json`

**Description:** Retrieves all NDCs associated with a given RxCUI.

**Example Request:**
```bash
curl "https://rxnav.nlm.nih.gov/REST/rxcui/29046/allndcs.json"
```

**Response:**
```json
{}
```

**Finding:** This endpoint often returns empty results. The RxNorm API may not maintain comprehensive NDC lists, or NDCs may be retrieved through a different mechanism.

**Alternative Approach:** FDA API provides `openfda.rxcui` field, allowing reverse lookup from RxCUI to NDCs via FDA API.

**Test Cases:**
- RxCUI 29046 (Lisinopril): Returns `{}`
- RxCUI 6809 (Metformin): Returns `{}`
- RxCUI 83367 (Atorvastatin): Returns `{}`

**Recommendation:** Use FDA API with `search=openfda.rxcui:{rxcui}` to retrieve NDCs instead of relying on RxNorm's allndcs endpoint.

---

### 3. Strength Information Retrieval

**Endpoint:** `GET /rxcui/{rxcui}/property.json?propName=AVAILABLE_STRENGTH`

**Description:** Retrieves available strength information for a given RxCUI.

**Example Request:**
```bash
curl "https://rxnav.nlm.nih.gov/REST/rxcui/29046/property.json?propName=AVAILABLE_STRENGTH"
```

**Response:**
```json
{}
```

**Finding:** This endpoint often returns empty results. Strength information may not be available for all RxCUIs or may require different property names.

**Test Cases:**
- RxCUI 29046: Returns `{}`
- RxCUI 6809: Returns `{}`

**Recommendation:** Use FDA API's `active_ingredients[].strength` field for strength information instead.

---

### 4. Spelling Suggestions

**Endpoint:** `GET /spellingsuggestions.json?name={drugName}`

**Description:** Provides spelling suggestions for misspelled drug names.

**Example Request:**
```bash
curl "https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=Lisnopril"
```

**Success Response:**
```json
{
  "suggestionGroup": {
    "name": "",
    "suggestionList": {
      "suggestion": ["lisinopril"]
    }
  }
}
```

**Response Structure:**
- `suggestionGroup.suggestionList.suggestion`: Array of suggested drug names

**Test Cases:**
- "Lisnopril" → ["lisinopril"]
- "Metforman" → May return suggestions or empty

**Error Handling:**
- No suggestions available returns empty `suggestionList` or `{}`

---

## NDC Format Handling

**Finding:** RxNorm API's `allndcs` endpoint does not reliably return NDC lists. NDCs are better retrieved via FDA API using RxCUI.

**NDC Format Variations:**
- FDA API uses various NDC formats in responses
- Product NDC: "79804-618" (without package code)
- Package NDC: "79804-618-03" (with package code)
- Format normalization will be required (see NDC normalization documentation)

---

## Rate Limits & Performance

### Performance Testing

**Test Method:** Sequential requests with timing

**Findings:**
- Average response time: ~200-500ms per request
- No explicit rate limits observed in testing
- API appears to handle requests reasonably well

**Rate Limit Information:**
- **No documented rate limits found**
- No rate limit errors encountered during testing
- Recommended: Implement reasonable delays between requests (100-200ms)

**Timeout Behavior:**
- Default timeout: ~10 seconds
- No timeout errors encountered

**Recommended Retry Strategy:**
- Exponential backoff: 1s, 2s, 4s (3 attempts max)
- Timeout: 10 seconds per request
- Handle empty responses gracefully (may indicate no data, not an error)

---

## Error Handling

### Common Error Scenarios

1. **Drug Not Found:**
   - Response: `{"idGroup": {"rxnormId": []}}` or `{}`
   - Handling: Check if `rxnormId` array is empty
   - Fallback: Use spelling suggestions API

2. **Invalid RxCUI:**
   - Response: `{}` (empty object)
   - Handling: Treat as "no data available"

3. **Network Errors:**
   - Implement retry logic with exponential backoff
   - Timeout after 10 seconds

---

## Key Findings & Recommendations

### Critical Findings

1. **NDC Retrieval:** RxNorm's `allndcs` endpoint is unreliable. Use FDA API with `search=openfda.rxcui:{rxcui}` instead.

2. **Response Format:** API supports JSON by appending `.json` extension (preferred for this project).

3. **Strength Information:** `AVAILABLE_STRENGTH` property often returns empty. Use FDA API for strength data.

### Recommendations for Implementation

1. **Primary Flow:**
   - Use RxNorm for drug name → RxCUI lookup
   - Use FDA API for RxCUI → NDCs lookup (via `openfda.rxcui` search)
   - Use FDA API for package details and strength information

2. **Error Handling:**
   - Handle empty responses gracefully
   - Implement spelling suggestions for "drug not found" scenarios
   - Cache RxCUI lookups (7 days TTL as planned)

3. **Performance:**
   - No rate limits observed, but implement reasonable delays
   - Cache aggressively (drug names rarely change)
   - Consider parallel requests for multiple drug lookups

---

## Sample Data Collected

### RxCUI Values for Testing

| Drug Name | RxCUI | Type |
|-----------|-------|------|
| Lisinopril | 29046 | Generic |
| Metformin | 6809 | Generic |
| Lipitor | 153165 | Brand |
| Atorvastatin | 83367 | Generic |

---

**Status:** Complete  
**Next Steps:** Use findings to implement RxNorm service in Phase 2

