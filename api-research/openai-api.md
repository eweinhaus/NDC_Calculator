# OpenAI API Research & Documentation

**Base URL:** `https://api.openai.com/v1/chat/completions`  
**Model:** `gpt-4o-mini`  
**Authentication:** Required (API key in Authorization header)  
**Last Updated:** Phase 0 Research

---

## Overview

OpenAI API will be used as a fallback for SIG (prescription instructions) parsing when regex patterns fail or confidence is low (< 0.8). This minimizes costs while ensuring complex cases are handled.

**Key Finding:** OpenAI API should only be used as a fallback. Primary parsing should use regex patterns to handle 80%+ of cases without AI costs.

---

## API Setup

### Authentication

**Header Format:**
```
Authorization: Bearer {OPENAI_API_KEY}
Content-Type: application/json
```

**Environment Variable:**
- `OPENAI_API_KEY`: Required for API access
- Store in environment variables, never commit to repository

### API Key Setup

1. Obtain API key from OpenAI dashboard: https://platform.openai.com/api-keys
2. Set environment variable: `export OPENAI_API_KEY=sk-...`
3. Verify access with test request

---

## Endpoint

### Chat Completions

**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**Request Format:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a medical prescription parser. Extract dosage, frequency, and unit from prescription instructions (SIG). Return JSON format: {\"dosage\": number, \"frequency\": number, \"unit\": string, \"confidence\": number}"
    },
    {
      "role": "user",
      "content": "Parse this SIG: Take 2 tablets by mouth every 12 hours with food"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 150
}
```

**Response Format:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"dosage\": 2, \"frequency\": 2, \"unit\": \"tablet\", \"confidence\": 0.95}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 85,
    "completion_tokens": 25,
    "total_tokens": 110
  }
}
```

---

## Model Information

### gpt-4o-mini

- **Model ID:** `gpt-4o-mini`
- **Purpose:** Cost-effective model for structured parsing tasks
- **Availability:** Generally available
- **Cost:** ~$0.0001-0.0005 per request (varies by token usage)
- **Performance:** Suitable for structured extraction tasks

### Token Usage

- **Input tokens:** ~50-100 tokens per SIG (depends on length)
- **Output tokens:** ~20-50 tokens (JSON response)
- **Total:** ~70-150 tokens per request
- **Cost:** ~$0.0001-0.0005 per request (at current pricing)

---

## Usage Pattern

### Fallback Strategy

1. **Primary:** Use regex patterns to parse SIG
2. **Confidence Check:** If confidence < 0.8, use OpenAI fallback
3. **Error Handling:** If both fail, return error to user

### When to Use OpenAI

- Complex multi-dose instructions
- Ambiguous frequency patterns
- PRN medications with complex conditions
- Unusual unit conversions
- Instructions with multiple conditions

### When NOT to Use OpenAI

- Simple patterns: "Take 1 tablet twice daily"
- High regex confidence (> 0.8)
- Standard frequency patterns
- Common unit types (tablets, capsules)

---

## Error Handling

### Common Errors

1. **Invalid API Key:**
   - Response: `{"error": {"message": "Invalid API key", "type": "invalid_request_error"}}`
   - Handling: Return user-friendly error, log for debugging

2. **Rate Limit:**
   - Response: `{"error": {"message": "Rate limit exceeded", "type": "rate_limit_error"}}`
   - Handling: Implement exponential backoff retry

3. **Model Unavailable:**
   - Response: `{"error": {"message": "Model not found", "type": "invalid_request_error"}}`
   - Handling: Fallback to regex-only parsing, log error

4. **Network Errors:**
   - Handling: Retry with exponential backoff, timeout after 10 seconds

---

## Cost Estimation

### Per Request Cost

- **Input tokens:** ~75 tokens average
- **Output tokens:** ~35 tokens average
- **Total tokens:** ~110 tokens per request
- **Cost:** ~$0.00015 per request (approximate, varies by pricing)

### Monthly Cost Estimate

**Assumptions:**
- 1000 SIG parses per month
- 20% require AI fallback (80% handled by regex)
- 200 AI requests per month

**Calculation:**
- 200 requests × $0.00015 = $0.03 per month

**Conclusion:** Cost is negligible for typical usage.

---

## Response Parsing

### Expected Response Format

```json
{
  "dosage": 2,
  "frequency": 2,
  "unit": "tablet",
  "confidence": 0.95
}
```

### Parsing Steps

1. Extract `choices[0].message.content`
2. Parse JSON from content string
3. Validate required fields (dosage, frequency, unit)
4. Validate confidence (0.0-1.0)
5. Return parsed result

### Error Handling

- If JSON parsing fails, return error
- If required fields missing, return error
- If confidence < 0.5, consider result unreliable

---

## Recommended Usage Patterns

### 1. Structured Prompt

Use system message to define output format:
```
"You are a medical prescription parser. Extract dosage, frequency, and unit from prescription instructions (SIG). Return JSON format: {\"dosage\": number, \"frequency\": number, \"unit\": string, \"confidence\": number}"
```

### 2. Temperature Setting

- **Recommended:** 0.3 (lower temperature for more consistent, structured output)
- **Range:** 0.0-0.5 for parsing tasks

### 3. Max Tokens

- **Recommended:** 150 tokens (sufficient for JSON response)
- **Range:** 100-200 tokens

### 4. Retry Strategy

- **Exponential backoff:** 1s, 2s, 4s (3 attempts max)
- **Timeout:** 10 seconds per request
- **Fallback:** Return regex result if AI fails

---

## Testing

### Test Request

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a medical prescription parser. Extract dosage, frequency, and unit from prescription instructions (SIG). Return JSON format: {\"dosage\": number, \"frequency\": number, \"unit\": string, \"confidence\": number}"
      },
      {
        "role": "user",
        "content": "Parse this SIG: Take 2 tablets by mouth every 12 hours with food"
      }
    ],
    "temperature": 0.3,
    "max_tokens": 150
  }'
```

### Expected Response

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"dosage\": 2, \"frequency\": 2, \"unit\": \"tablet\", \"confidence\": 0.95}"
      }
    }
  ]
}
```

---

## Key Findings & Recommendations

### Critical Findings

1. **Cost is Negligible:** ~$0.00015 per request, ~$0.03/month for typical usage
2. **Model Availability:** gpt-4o-mini is generally available
3. **Response Format:** JSON parsing required from message content
4. **Error Handling:** Must handle API errors gracefully

### Recommendations for Implementation

1. **Fallback Only:** Use OpenAI only when regex confidence < 0.8
2. **Structured Prompts:** Use system message to ensure consistent JSON output
3. **Error Handling:** Implement retry logic and graceful degradation
4. **Cost Monitoring:** Log AI usage for cost tracking
5. **Caching:** Cache AI responses (30 days TTL as planned)

---

## Security Considerations

1. **API Key:** Store in environment variables only
2. **No PHI:** Do not send patient information in prompts
3. **Input Sanitization:** Sanitize SIG text before sending to API
4. **Error Messages:** Do not expose API keys in error messages

---

**Status:** Complete  
**Next Steps:** Implement OpenAI service in Phase 3 (fallback only)

