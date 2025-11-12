# Autocomplete Preload Implementation Plan

## Overview

Implement a hybrid autocomplete system that preloads common drug names and NDC codes on page load, enabling instant client-side filtering with zero latency for most use cases, while maintaining API fallback for uncommon entries.

**Key Requirement:** Page must load for user first, then load API data in the background (non-blocking).

## Goals

1. **Zero latency** for common drugs/NDCs (most use cases)
2. **Non-blocking page load** - user sees page immediately, data loads in background
3. **Reduced API calls** - only fetch when preloaded data doesn't match
4. **Graceful fallback** - API still works for uncommon entries
5. **Client-side caching** - localStorage to avoid re-fetching on subsequent visits

## Architecture

### Data Flow

```
Page Load → Render UI Immediately
         ↓
    Background: Check localStorage cache
         ↓
    If cached & fresh → Use cached data
    If expired/missing → Fetch from /api/autocomplete/preload
         ↓
    Store in localStorage with TTL
         ↓
Autocomplete Component:
    User types → Filter preloaded data (instant)
         ↓
    If matches found → Show immediately (no API call)
    If no matches → Fallback to API call
```

### Component Structure

1. **Preload Endpoint** (`/api/autocomplete/preload/+server.ts`)
   - Returns curated list of ~500-1000 common drugs and NDCs
   - Can be generated from test data or curated list
   - Returns JSON: `{ drugs: string[], ndcs: string[] }`

2. **Client-Side Cache Utility** (`src/lib/utils/localStorageCache.ts`)
   - localStorage wrapper with TTL support
   - Handles serialization/deserialization
   - Automatic expiration checking

3. **Preload Store** (`src/lib/stores/autocompletePreload.ts`)
   - Svelte store for preloaded data
   - Handles loading state
   - Provides reactive access to data

4. **Updated Autocomplete Component** (`src/lib/components/Autocomplete.svelte`)
   - Accepts `preloadedData` prop
   - Filters preloaded data first (client-side, instant)
   - Falls back to API if no matches

5. **Updated Main Page** (`src/routes/+page.svelte`)
   - Loads preload data in background after page render
   - Passes preloaded data to Autocomplete component

## Implementation Steps

### Step 1: Create Preload Endpoint

**File:** `src/routes/api/autocomplete/preload/+server.ts`

**Purpose:** Return curated list of common drugs and NDCs

**Implementation:**
- Read from test data files or generate curated list
- Return structure: `{ drugs: string[], ndcs: string[] }`
- Can be static data (no external API calls needed)
- Consider generating from existing test data:
  - `test-data/drug-samples.json` - extract drug names
  - `test-data/ndc-samples.json` - extract NDC codes
- Add more common drugs/NDCs as needed (target: ~500-1000 each)

**Success Criteria:**
- Endpoint returns JSON with drugs and ndcs arrays
- Response size < 200KB (acceptable for initial load)
- Response time < 100ms (static data)

### Step 2: Create localStorage Cache Utility

**File:** `src/lib/utils/localStorageCache.ts`

**Purpose:** Client-side caching with TTL support

**Implementation:**
- `get<T>(key: string): T | null` - Get cached value if not expired
- `set<T>(key: string, value: T, ttlHours: number): void` - Set with TTL
- `remove(key: string): void` - Remove cached value
- `clear(): void` - Clear all cache entries
- Handle JSON serialization/deserialization
- Store expiration timestamps
- Handle localStorage quota errors gracefully

**Cache Key:** `autocomplete:preload:v1`
**TTL:** 24 hours (configurable)

**Success Criteria:**
- Can store and retrieve data with TTL
- Automatically expires old data
- Handles localStorage errors gracefully
- Type-safe with TypeScript generics

### Step 3: Create Preload Store

**File:** `src/lib/stores/autocompletePreload.ts`

**Purpose:** Svelte store for preloaded autocomplete data

**Implementation:**
- Writable store: `{ drugs: string[], ndcs: string[], loaded: boolean, loading: boolean }`
- `loadPreloadData()` function:
  - Check localStorage cache first
  - If cached and fresh → use cached data
  - If expired/missing → fetch from `/api/autocomplete/preload`
  - Update store with data
  - Save to localStorage
- Handle errors gracefully (fallback to empty arrays)

**Success Criteria:**
- Store provides reactive access to preloaded data
- Loading state tracked
- Handles errors without breaking app
- Works with Svelte reactivity

### Step 4: Update Main Page

**File:** `src/routes/+page.svelte`

**Purpose:** Load preload data in background after page render

**Implementation:**
- Import preload store
- Use `onMount()` to trigger background load
- **Critical:** Don't block page render - load happens after mount
- Pass preloaded data to Autocomplete component via prop
- Show page immediately, data loads asynchronously

**Code Pattern:**
```typescript
import { onMount } from 'svelte';
import { autocompletePreload, loadPreloadData } from '$lib/stores/autocompletePreload';

onMount(() => {
  // Load in background - non-blocking
  loadPreloadData();
});

// Access preloaded data reactively
$: preloadedData = $autocompletePreload;
```

**Success Criteria:**
- Page renders immediately (no delay)
- Preload data loads in background
- Autocomplete component receives data when available
- No blocking of UI

### Step 5: Update Autocomplete Component

**File:** `src/lib/components/Autocomplete.svelte`

**Purpose:** Use preloaded data first, fallback to API

**Implementation:**
- Accept `preloadedData` prop: `{ drugs: string[], ndcs: string[] } | null`
- Modify `debouncedFetchSuggestions`:
  1. First, filter preloaded data locally (case-insensitive prefix match)
  2. If matches found → show immediately (set `isLoading = false`)
  3. If no matches OR query length >= threshold → fallback to API
- Client-side filtering function:
  - For drug names: filter `preloadedData.drugs` array
  - For NDC codes: filter `preloadedData.ndcs` array
  - Case-insensitive prefix matching
  - Limit to `maxSuggestions` (20)

**Filtering Logic:**
```typescript
function filterPreloadedData(query: string, type: 'drug' | 'ndc'): string[] {
  if (!preloadedData) return [];
  
  const source = type === 'drug' ? preloadedData.drugs : preloadedData.ndcs;
  const queryLower = query.toLowerCase();
  
  return source
    .filter(item => item.toLowerCase().startsWith(queryLower))
    .slice(0, maxSuggestions);
}
```

**Success Criteria:**
- Filters preloaded data instantly (no API call)
- Shows results immediately when matches found
- Falls back to API when no matches or for longer queries
- Maintains existing API functionality
- No breaking changes to component API

### Step 6: Generate Preload Data

**File:** `src/routes/api/autocomplete/preload/+server.ts`

**Purpose:** Generate curated list from test data + common drugs

**Implementation:**
- Read from `test-data/drug-samples.json` - extract all drug names
- Read from `test-data/ndc-samples.json` - extract all NDC codes
- Add common drugs list (top 500-1000 most prescribed drugs)
- Add common NDC codes (top 500-1000 most used NDCs)
- Return combined, deduplicated lists

**Data Sources:**
- Existing test data files
- Can add static curated list of common drugs/NDCs
- Consider fetching from APIs once and caching (future enhancement)

**Success Criteria:**
- Returns comprehensive list of common drugs and NDCs
- Data is deduplicated
- Response is reasonably sized (< 200KB)
- Fast response time (static data)

## Testing Strategy

### Unit Tests

1. **localStorageCache utility**
   - Test get/set with TTL
   - Test expiration handling
   - Test error handling (quota exceeded)

2. **Preload store**
   - Test loading from cache
   - Test fetching from API
   - Test error handling

3. **Autocomplete component**
   - Test filtering preloaded data
   - Test API fallback
   - Test hybrid behavior

### Integration Tests

1. **Preload endpoint**
   - Test returns correct structure
   - Test response size
   - Test response time

2. **End-to-end flow**
   - Test page loads immediately
   - Test preload data loads in background
   - Test autocomplete works with preloaded data
   - Test API fallback works

### Manual Testing

1. **Page load performance**
   - Verify page renders immediately
   - Verify no blocking on preload fetch
   - Check network tab for background request

2. **Autocomplete behavior**
   - Type common drug → instant results (no loading spinner)
   - Type uncommon drug → API call triggered
   - Type NDC code → instant results for common NDCs
   - Verify localStorage cache works on page refresh

## Potential Pitfalls

### 1. **Data Size**
- **Risk:** Preload data too large (> 500KB)
- **Mitigation:** Limit to top 500-1000 most common entries
- **Fallback:** Use compression or lazy loading

### 2. **localStorage Quota**
- **Risk:** localStorage quota exceeded (typically 5-10MB)
- **Mitigation:** 
  - Limit preload data size
  - Handle quota errors gracefully
  - Fallback to API if cache fails

### 3. **Data Freshness**
- **Risk:** Preloaded data becomes stale
- **Mitigation:** 
  - 24-hour TTL on cache
  - Background refresh on page load
  - API fallback ensures fresh data when needed

### 4. **Race Conditions**
- **Risk:** User types before preload data loads
- **Mitigation:** 
  - API fallback handles this case
  - Show loading state if data not ready
  - Component works with or without preloaded data

### 5. **Browser Compatibility**
- **Risk:** localStorage not available (private browsing, etc.)
- **Mitigation:** 
  - Check for localStorage availability
  - Fallback to API if not available
  - Graceful degradation

## Success Criteria

### Performance
- ✅ Page loads immediately (no blocking)
- ✅ Preload data loads in background (< 2s)
- ✅ Autocomplete shows results instantly for common drugs/NDCs
- ✅ API fallback works for uncommon entries

### User Experience
- ✅ No loading spinner for common drugs/NDCs
- ✅ Smooth, responsive autocomplete
- ✅ Works offline with cached data (for 24 hours)

### Technical
- ✅ localStorage caching functional
- ✅ TTL expiration working
- ✅ API fallback working
- ✅ No breaking changes to existing functionality
- ✅ All tests passing

## Implementation Order

1. **Step 1:** Create preload endpoint (foundation)
2. **Step 2:** Create localStorage cache utility (infrastructure)
3. **Step 3:** Create preload store (state management)
4. **Step 4:** Update main page (integration)
5. **Step 5:** Update Autocomplete component (core functionality)
6. **Step 6:** Generate/curate preload data (data source)

## Files to Create/Modify

### New Files
- `src/routes/api/autocomplete/preload/+server.ts` - Preload endpoint
- `src/lib/utils/localStorageCache.ts` - localStorage cache utility
- `src/lib/stores/autocompletePreload.ts` - Preload store

### Modified Files
- `src/routes/+page.svelte` - Add background preload
- `src/lib/components/Autocomplete.svelte` - Hybrid filtering

### Test Files
- `src/tests/unit/localStorageCache.test.ts`
- `src/tests/unit/autocompletePreload.test.ts`
- `src/tests/integration/autocomplete-preload.test.ts`

## Notes

- Preload data can be static initially (from test data)
- Can enhance later to fetch from APIs and cache server-side
- localStorage TTL of 24 hours balances freshness and performance
- Component maintains backward compatibility (works without preloaded data)
- API fallback ensures full coverage for all drugs/NDCs

---

**Last Updated:** 2025-01-27
**Status:** Planning Complete - Ready for Implementation

