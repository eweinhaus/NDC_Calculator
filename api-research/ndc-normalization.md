# NDC Format Normalization Requirements

**Last Updated:** Phase 0 Research

---

## Overview

NDC (National Drug Code) formats vary significantly in real-world usage. This document defines normalization requirements to convert all NDC formats to a standard 11-digit format with dashes (5-4-2).

**Target Format:** `XXXXX-XXXX-XX` (5 digits - 4 digits - 2 digits)

---

## Format Variations

### 1. 10-Digit Format (No Dashes)
- **Example:** `00002322730`
- **Structure:** Labeler (5) + Product (4) + Package (2) - but missing leading zero
- **Normalization:** Add leading zero, add dashes → `00002-3227-30`

### 2. 11-Digit Format (With Dashes)
- **Example:** `00002-3227-30`
- **Structure:** Labeler (5) + Product (4) + Package (2)
- **Normalization:** Already in correct format → `00002-3227-30`

### 3. 10-Digit Format (With Dashes)
- **Example:** `0002-3227-30`
- **Structure:** Labeler (4) + Product (4) + Package (2) - missing leading zero in labeler
- **Normalization:** Add leading zero → `00002-3227-30`

### 4. 11-Digit Format (No Dashes)
- **Example:** `00002322730`
- **Structure:** Labeler (5) + Product (4) + Package (2)
- **Normalization:** Add dashes → `00002-3227-30`

### 5. Incomplete Package Code
- **Example:** `76420-345-0` or `76420-345-00`
- **Structure:** Package code may be 1 or 2 digits
- **Normalization:** Pad package code to 2 digits → `76420-345-00`

### 6. Incomplete Product Code
- **Example:** `7642-345-30` (4-digit labeler)
- **Structure:** Labeler may be 4 or 5 digits
- **Normalization:** Pad labeler to 5 digits → `07642-0345-30`

---

## Normalization Algorithm

### Step 1: Remove All Non-Numeric Characters
- Remove dashes, spaces, and other separators
- Keep only digits

### Step 2: Determine Format
- Count total digits
- 10 digits: Missing leading zero or dashes
- 11 digits: Complete, may need dashes

### Step 3: Pad to 11 Digits
- If 10 digits: Add leading zero (assumes missing labeler leading zero)
- If 11 digits: Already correct length

### Step 4: Split into Components
- Labeler: First 5 digits
- Product: Next 4 digits
- Package: Last 2 digits

### Step 5: Format with Dashes
- Format as: `XXXXX-XXXX-XX`

### Step 6: Validate
- Check that all components are numeric
- Check that labeler is 5 digits
- Check that product is 4 digits
- Check that package is 2 digits

---

## Conversion Examples

| Input | Normalized Output | Notes |
|-------|------------------|-------|
| `00002322730` | `00002-3227-30` | 10-digit, add leading zero and dashes |
| `00002-3227-30` | `00002-3227-30` | Already normalized |
| `0002-3227-30` | `00002-3227-30` | Add leading zero to labeler |
| `76420-345-30` | `76420-345-30` | Already normalized |
| `7642034530` | `76420-345-30` | 10-digit, add dashes |
| `7642-345-30` | `07642-0345-30` | Pad labeler and product |
| `76420-345-0` | `76420-345-00` | Pad package code |
| `76420-345-00` | `76420-345-00` | Already normalized |

---

## Edge Cases

### 1. Invalid Formats
- **Input:** `123` (too short)
- **Handling:** Return error or null
- **Validation:** Must be 10 or 11 digits after removing non-numeric

### 2. Non-Numeric Characters
- **Input:** `abc-123-def`
- **Handling:** Extract digits only, then normalize
- **Result:** `00001-2345-67` (if 10 digits) or error if insufficient digits

### 3. Extra Digits
- **Input:** `000023227301` (12 digits)
- **Handling:** Take first 11 digits or return error
- **Validation:** Must be exactly 10 or 11 digits

### 4. Missing Package Code
- **Input:** `76420-345` (product NDC only)
- **Handling:** Cannot normalize without package code
- **Result:** Return error or null

---

## Validation Rules

### Required Checks

1. **Length Check:**
   - After removing non-numeric: Must be 10 or 11 digits

2. **Component Check:**
   - Labeler: 5 digits (may need padding)
   - Product: 4 digits (may need padding)
   - Package: 2 digits (may need padding)

3. **Numeric Check:**
   - All characters must be digits after normalization

4. **Format Check:**
   - Final format must match: `XXXXX-XXXX-XX`

---

## Implementation Recommendations

### Algorithm Pseudocode

```
function normalizeNDC(input):
  // Step 1: Remove non-numeric characters
  digits = input.replace(/[^0-9]/g, '')
  
  // Step 2: Validate length
  if digits.length < 10 or digits.length > 11:
    return error("Invalid NDC length")
  
  // Step 3: Pad to 11 digits if needed
  if digits.length == 10:
    digits = "0" + digits
  
  // Step 4: Split into components
  labeler = digits.substring(0, 5)
  product = digits.substring(5, 9)
  package = digits.substring(9, 11)
  
  // Step 5: Format with dashes
  return `${labeler}-${product}-${package}`
```

### Error Handling

- Return `null` or throw error for invalid formats
- Log invalid inputs for debugging
- Provide user-friendly error messages

### Testing

See `test-data/ndc-normalization-test-cases.json` for comprehensive test cases.

---

## Test Cases

See `test-data/ndc-normalization-test-cases.json` for detailed test cases covering all format variations and edge cases.

---

**Status:** Complete  
**Next Steps:** Implement NDC normalizer utility in Phase 1

