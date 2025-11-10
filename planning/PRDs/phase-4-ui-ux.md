# Phase 4 PRD: UI & User Experience

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 4 - UI & User Experience  
**Duration:** Days 7-8  
**Status:** Development  
**Reference:** See main [PRD.md](../PRD.md) for full project context

---

## Executive Summary

Phase 4 implements the complete user interface, integrating all business logic from Phase 3 with a polished, accessible, and responsive design using Tailwind CSS. This phase focuses on user experience, error handling, loading states, and accessibility. The UI must be intuitive, fast, and provide clear feedback at every step.

**Key Deliverables:**
- Complete results display with collapsible sections
- Loading states (skeletons, not just spinners)
- Error states with spelling suggestions
- Responsive design (desktop/tablet/mobile)
- Accessibility features (ARIA, keyboard navigation)
- Copy to clipboard functionality
- Performance optimizations

---

## Objectives

1. **Results Display:** Show calculation results in clear, organized format
2. **Loading States:** Implement skeleton loaders for better UX
3. **Error Handling:** Display user-friendly error messages with suggestions
4. **Responsive Design:** Ensure UI works on all device sizes
5. **Accessibility:** Meet WCAG 2.1 AA standards
6. **Performance:** Optimize rendering and interactions

---

## Tasks

### Task 1: Results Display Component

**File:** `src/routes/+page.svelte` (or separate components)

**Sections to Display:**

1. **Drug Information Card:**
   - Drug name
   - RxCUI (if available)
   - Strength (if available)
   - Dosage form (if available)

2. **Quantity Calculation Breakdown:**
   - Dosage amount
   - Frequency (per day)
   - Days' supply
   - Total quantity (highlighted)
   - Formula display: "(dosage × frequency) × daysSupply = total"

3. **Recommended NDC (Highlighted):**
   - NDC code
   - Package size
   - Package description
   - Manufacturer
   - Overfill/underfill amounts
   - Visual highlight (border, background)

4. **Alternative NDCs (Expandable):**
   - Collapsible section
   - List of 3-5 alternatives
   - Same information as recommended
   - Click to select alternative

5. **Warnings Section (Color-Coded):**
   - Error (red): Inactive NDCs, critical issues
   - Warning (yellow): Overfills >10%, underfills
   - Info (blue): Dosage form mismatches, general info
   - Clear, actionable messages

6. **Inactive NDCs List (if any):**
   - Collapsible section
   - List of inactive NDCs found
   - Reason for inactivity (if available)

**Components:** ResultsDisplay, DrugInfoCard, QuantityBreakdown, RecommendedNdc, AlternativeNdcs, WarningsSection, InactiveNdcsList

**Deliverables:**
- Complete results display component
- All sections implemented
- Collapsible sections working
- Visual hierarchy clear

---

### Task 2: Loading States (Skeleton Loaders)

**File:** `src/lib/components/SkeletonLoader.svelte`

**Purpose:** Show skeleton placeholders during API calls instead of spinners

**Skeleton Components:**
1. **Input Form Skeleton:** While validating/processing
2. **Results Skeleton:** While fetching data
   - Drug info skeleton
   - Quantity breakdown skeleton
   - NDC list skeleton

**Usage:** `<SkeletonLoader type="results" />`

**Requirements:**
- Match actual content layout
- Animated shimmer effect
- Responsive (matches content width)
- Accessible (aria-busy, aria-label)

**Loading States:**
1. **Initial Load:** Form skeleton (if needed)
2. **Drug Lookup:** Drug info skeleton
3. **NDC Fetching:** NDC list skeleton
4. **SIG Parsing:** Quantity skeleton (if parsing takes time)

**Deliverables:**
- Skeleton loader component
- Integrated with all loading states
- Smooth animations
- Accessible

---

### Task 3: Error States with Suggestions

**File:** `src/lib/components/ErrorDisplay.svelte`

**Error Scenarios:**

1. **Drug Not Found:**
   - Display: "Drug not found"
   - Show spelling suggestions from RxNorm API
   - Clickable suggestions (pre-fill input)
   - Retry button

2. **No NDCs Available:**
   - Display: "No active NDCs found for this drug"
   - Explanation message
   - Suggest checking drug name spelling

3. **SIG Parse Failure:**
   - Display: "Could not parse instructions"
   - Show format example: "Take X [unit] [frequency]"
   - Allow manual entry option (future)

4. **API Errors:**
   - Display: "Service temporarily unavailable"
   - Retry button with countdown
   - Show last error message (user-friendly)

5. **Validation Errors:**
   - Real-time feedback on input fields
   - Clear error messages
   - Highlight invalid fields

**Usage:** `<ErrorDisplay error={error} suggestions={suggestions} onRetry={handleRetry} />`

**Deliverables:**
- Error display component
- All error scenarios handled
- Spelling suggestions integrated
- Retry functionality working

---

### Task 4: Responsive Design

**Breakpoints (Tailwind CSS):**
- Desktop: `lg:` breakpoint (≥1024px) - full-width layout
- Tablet: `md:` breakpoint (≥768px) - optimized for touch
- Mobile: default (mobile-first) - stacked layout

**Layout Adjustments (using Tailwind CSS):**

1. **Desktop (`lg:` breakpoint):**
   - Centered container: `max-w-6xl mx-auto`
   - Side-by-side results sections: `lg:grid lg:grid-cols-2`
   - Full feature set visible

2. **Tablet (`md:` breakpoint):**
   - Touch-friendly buttons: `min-h-[44px]`
   - Optimized spacing: `md:px-6 md:py-4`
   - Collapsible sections default to collapsed

3. **Mobile (default):**
   - Stacked layout: `flex flex-col`
   - Full-width inputs: `w-full`
   - Collapsible sections
   - Bottom navigation for actions

**Responsive Components:**
- Input form (stacked on mobile)
- Results display (stacked on mobile)
- NDC lists (scrollable on mobile)
- Warnings (compact on mobile)

**Testing:**
- Test on actual devices (if possible)
- Browser dev tools responsive mode
- Test touch interactions on tablet/mobile

**Deliverables:**
- Responsive layout working
- All breakpoints tested
- Touch interactions optimized
- Mobile-friendly design

---

### Task 5: Accessibility Features

**WCAG 2.1 AA Compliance:**

1. **ARIA Labels:**
   - All interactive elements labeled
   - Form inputs have labels
   - Buttons have descriptive labels
   - Results sections have headings

2. **Keyboard Navigation:**
   - Tab order logical
   - All interactive elements focusable
   - Skip links for main content
   - Keyboard shortcuts (if applicable)

3. **Screen Reader Support:**
   - Semantic HTML (headings, lists, etc.)
   - ARIA live regions for dynamic content
   - Alt text for icons (if any)
   - Descriptive link text

4. **Visual Accessibility:**
   - High contrast mode support
   - Focus indicators visible
   - Color not sole indicator (use icons/text)
   - Text size scalable (up to 200%)

5. **Form Accessibility:**
   - Labels associated with inputs
   - Error messages associated with fields
   - Required fields indicated
   - Validation feedback announced

**Example:** Label associated with input, aria-describedby for errors, role="alert" for error messages

**Deliverables:**
- ARIA labels on all interactive elements
- Keyboard navigation working
- Screen reader tested (if possible)
- High contrast mode supported
- Focus indicators visible

---

### Task 6: Copy to Clipboard Functionality

**File:** `src/lib/utils/clipboard.ts`

**Purpose:** Allow users to copy NDC codes and results

**Copy Options:**
1. **Copy NDC Code:** Click button next to NDC
2. **Copy All Results:** Copy formatted results as text
3. **Copy JSON:** Copy raw JSON response (developer mode)

**Function:** `copyToClipboard(text: string): Promise<boolean>` - Copy text to clipboard

**UI:**
- Copy button next to each NDC
- Toast notification on success
- Error handling if clipboard API unavailable

**Deliverables:**
- Clipboard utility function
- Copy buttons in UI
- Toast notifications
- Error handling

---

### Task 7: Performance Optimizations

**Optimizations:**

1. **Frontend Debouncing:**
   - Debounce input validation (300ms)
   - Prevent excessive API calls during typing

2. **Lazy Loading:**
   - Lazy load alternative NDC details
   - Load images/icons on demand (if any)

3. **Code Splitting:**
   - Split large components
   - Lazy load results display component

4. **Memoization:**
   - Memoize expensive calculations
   - Cache formatted display values

5. **Virtual Scrolling:**
   - If NDC lists become very long (>50 items)
   - Use virtual scrolling for performance

**Usage:** Import debounce utility, wrap validation function with 300ms delay

**Deliverables:**
- Input debouncing implemented
- Lazy loading where beneficial
- Performance optimizations applied
- No unnecessary re-renders

---

### Task 8: Main Page Integration

**File:** `src/routes/+page.svelte`

**Complete Integration:**
- Input form (from Phase 1, enhanced)
- Loading states
- Results display
- Error handling
- All components working together

**State Management:**
- Form state
- Loading state
- Results state
- Error state

**Flow:**
1. User enters inputs
2. Form validates
3. Submit triggers API call
4. Loading skeleton shown
5. Results displayed (or error shown)
6. User can retry or modify inputs

**Deliverables:**
- Complete page integration
- All states managed correctly
- Smooth user flow
- Error recovery working

---

## Deliverables Summary

1. **UI Components:**
   - Results display (complete)
   - Loading skeletons
   - Error display
   - Copy to clipboard

2. **Design:**
   - Responsive layout
   - Accessible components
   - Performance optimized

3. **Integration:**
   - All components working together
   - State management correct
   - Error handling complete

---

## Acceptance Criteria

**AC-4.1: Results Display Complete**
- All sections displayed correctly
- Collapsible sections working
- Visual hierarchy clear
- Information accurate

**AC-4.2: Loading States Working**
- Skeleton loaders shown during API calls
- Smooth animations
- Accessible (aria-busy)
- Matches content layout

**AC-4.3: Error States Working**
- All error scenarios handled
- Spelling suggestions displayed
- Retry functionality working
- User-friendly messages

**AC-4.4: Responsive Design Working**
- Desktop layout correct
- Tablet layout optimized
- Mobile layout stacked
- Touch interactions work

**AC-4.5: Accessibility Complete**
- ARIA labels on all elements
- Keyboard navigation works
- Screen reader compatible
- High contrast mode supported
- Focus indicators visible

**AC-4.6: Copy to Clipboard Working**
- Copy buttons functional
- Toast notifications shown
- Error handling complete

**AC-4.7: Performance Optimized**
- Input debouncing working
- No unnecessary re-renders
- Lazy loading implemented
- Fast interactions

**AC-4.8: Integration Complete**
- All components work together
- State management correct
- User flow smooth
- Error recovery working

---

## Dependencies

**Prerequisites:**
- Phase 3 completed (business logic)
- Phase 2 completed (API services)
- Phase 1 completed (project structure)

**External:**
- None (all UI work)

---

## Risks & Considerations

**Risk 1: Accessibility Compliance Issues**
- **Impact:** Medium - May exclude some users
- **Mitigation:** Test with screen readers, follow WCAG guidelines
- **Contingency:** Iterate based on accessibility testing

**Risk 2: Mobile Performance Issues**
- **Impact:** Low - Can optimize if needed
- **Mitigation:** Test on real devices, optimize rendering
- **Contingency:** Reduce animations, simplify components

**Risk 3: Complex State Management**
- **Impact:** Low - SvelteKit handles state well
- **Mitigation:** Use Svelte stores if needed
- **Contingency:** Simplify state structure

**Risk 4: Loading States Too Slow**
- **Impact:** Low - Can adjust skeleton timing
- **Mitigation:** Show skeletons immediately
- **Contingency:** Add progress indicators

---

## Success Metrics

- ✅ All UI components functional
- ✅ Responsive design works on all devices
- ✅ Accessibility features implemented
- ✅ Loading states provide good UX
- ✅ Error handling user-friendly
- ✅ Performance optimized
- ✅ Ready for Phase 5 testing

---

## Next Steps

Upon completion of Phase 4:
1. Test UI on multiple devices
2. Verify accessibility compliance
3. Review user flow for improvements
4. Begin Phase 5: Testing, Optimization & Deployment

---

**Document Owner:** Development Team  
**Last Updated:** Phase 4 Start  
**Status:** Development

