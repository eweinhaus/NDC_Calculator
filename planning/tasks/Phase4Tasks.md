# Phase 4 Task List: UI & User Experience

**Project:** NDC Packaging & Quantity Calculator  
**Phase:** 4 - UI & User Experience  
**Duration:** Days 7-8  
**Status:** Pending  
**Reference:** [Phase 4 PRD](../PRDs/phase-4-ui-ux.md)

---

## Overview

This task list breaks down Phase 4 into actionable, well-defined tasks. Each task includes specific requirements, deliverables, and acceptance criteria. Tasks should be completed in order, as they build upon each other. Start with core components (Tasks 1-3), then add responsive design and accessibility (Tasks 4-5), followed by enhancements (Tasks 6-7), and finally integrate everything (Task 8).

---

## Task 1: Results Display Components

**Priority:** P0 - Critical  
**Estimated Time:** 4-5 hours  
**Dependencies:** Phase 3 must be complete (API endpoint `/api/calculate` must return results)

### Description
Create all components needed to display calculation results in a clear, organized format. Results should be broken into logical sections with collapsible areas for better UX.

### Requirements
- Drug information card component
- Quantity calculation breakdown component
- Recommended NDC component (highlighted)
- Alternative NDCs list component (collapsible)
- Warnings section component (color-coded)
- Inactive NDCs list component (collapsible)
- All components use Tailwind CSS for styling
- Proper TypeScript types for all props

### Steps
1. Create component directory structure:
   - `src/lib/components/` (if not exists)
   - `src/lib/components/results/` (for results-specific components)

2. Create `DrugInfoCard.svelte`:
   - Props: `drug: { name: string, rxcui?: string, strength?: string, dosageForm?: string }`
   - Display drug name prominently
   - Show RxCUI if available (with label)
   - Show strength if available (with label)
   - Show dosage form if available (with label)
   - Use card styling with Tailwind: `bg-white rounded-lg shadow p-4`
   - Add ARIA labels: `aria-label="Drug information"`

3. Create `QuantityBreakdown.svelte`:
   - Props: `quantity: { total: number, unit: string, calculation: { dosage: number, frequency: number, daysSupply: number } }`
   - Display formula: "(dosage × frequency) × daysSupply = total"
   - Show each component: dosage, frequency, days' supply
   - Highlight total quantity (larger font, bold)
   - Use clear visual hierarchy
   - Add ARIA labels: `aria-label="Quantity calculation breakdown"`

4. Create `RecommendedNdc.svelte`:
   - Props: `ndc: { ndc: string, packageSize: number, packageDescription: string, manufacturer: string, overfill?: number, underfill?: number }`
   - Display NDC code prominently (with copy button placeholder)
   - Show package size and description
   - Show manufacturer
   - Display overfill/underfill if present (with color coding)
   - Visual highlight: border (`border-2 border-blue-500`) and background (`bg-blue-50`)
   - Add ARIA labels: `aria-label="Recommended NDC"`

5. Create `AlternativeNdcs.svelte`:
   - Props: `alternatives: Array<{ ndc: string, packageSize: number, packageCount?: number, totalQuantity: number, overfill: number, underfill: number }>`
   - Collapsible section (default collapsed)
   - Toggle button with icon/chevron
   - List of 3-5 alternatives
   - Each alternative shows same info as recommended
   - Click to select alternative (emit event)
   - Use `transition` for smooth expand/collapse
   - Add ARIA labels: `aria-expanded`, `aria-controls`

6. Create `WarningsSection.svelte`:
   - Props: `warnings: Array<{ type: string, message: string, severity: 'error' | 'warning' | 'info' }>`
   - Color-coded by severity:
     - Error (red): `bg-red-50 border-red-200 text-red-800`
     - Warning (yellow): `bg-yellow-50 border-yellow-200 text-yellow-800`
     - Info (blue): `bg-blue-50 border-blue-200 text-blue-800`
   - Display clear, actionable messages
   - Use icons if desired (SVG, not emojis per user rules)
   - Add ARIA labels: `role="alert"` for errors, `role="status"` for warnings/info

7. Create `InactiveNdcsList.svelte`:
   - Props: `inactiveNdcs?: Array<{ ndc: string, reason?: string }>`
   - Collapsible section (default collapsed)
   - Only show if `inactiveNdcs` exists and has items
   - List inactive NDCs with reason (if available)
   - Use warning styling
   - Add ARIA labels: `aria-label="Inactive NDCs"`

8. Create `ResultsDisplay.svelte` (main container):
   - Props: `results: CalculationResponse` (from API)
   - Compose all above components
   - Layout: stacked sections with spacing
   - Add section headings with proper hierarchy (`h2`, `h3`)
   - Add skip link for accessibility
   - Handle empty/undefined optional sections gracefully

9. Write basic component tests (optional but recommended):
   - Test component rendering with sample data
   - Test collapsible sections toggle
   - Test conditional rendering

### Deliverables
- ✅ All 7 component files created
- ✅ Components render correctly with sample data
- ✅ Collapsible sections working
- ✅ Visual hierarchy clear
- ✅ TypeScript types defined for all props
- ✅ ARIA labels added

### Acceptance Criteria
- [ ] All components created and functional
- [ ] Components accept correct TypeScript types
- [ ] Visual hierarchy is clear (recommended NDC highlighted)
- [ ] Collapsible sections expand/collapse smoothly
- [ ] All sections display correct data from API response
- [ ] Components handle missing optional data gracefully
- [ ] ARIA labels present on all components

---

## Task 2: Skeleton Loader Component

**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours  
**Dependencies:** None (can be built in parallel with Task 1)

### Description
Create skeleton loader components that match the actual content layout. Skeleton loaders provide better UX than spinners by showing the structure of content that's loading.

### Requirements
- Skeleton components match actual content layout
- Animated shimmer effect
- Responsive (matches content width)
- Accessible (aria-busy, aria-label)
- Multiple skeleton types for different content sections

### Steps
1. Create `SkeletonLoader.svelte` base component:
   - Props: `type: 'form' | 'drug-info' | 'quantity' | 'ndc-list' | 'results'`
   - Base shimmer animation using CSS
   - Accessible: `aria-busy="true"`, `aria-label="Loading..."`

2. Implement shimmer animation:
   - CSS keyframes for shimmer effect
   - Gradient animation: `@keyframes shimmer`
   - Apply to skeleton elements: `animate-shimmer`
   - Use Tailwind or custom CSS

3. Create skeleton variants:
   - **Form skeleton:** Input field placeholders
   - **Drug info skeleton:** Card with placeholder lines
   - **Quantity skeleton:** Formula layout with placeholders
   - **NDC list skeleton:** List items with placeholders
   - **Results skeleton:** Full results layout

4. Match actual content dimensions:
   - Drug info: Card height matches `DrugInfoCard`
   - Quantity: Formula layout matches `QuantityBreakdown`
   - NDC list: Item height matches actual NDC items
   - Use same spacing/padding as real components

5. Create reusable skeleton elements:
   - `SkeletonLine.svelte`: Single line placeholder
   - `SkeletonCard.svelte`: Card-shaped placeholder
   - `SkeletonCircle.svelte`: Circle placeholder (if needed)
   - Props: `width?: string`, `height?: string`, `className?: string`

6. Integrate with loading states:
   - Show skeleton when `isLoading === true`
   - Replace skeleton with actual content when loaded
   - Smooth transition (fade in)

7. Test accessibility:
   - Screen reader announces "Loading..."
   - Animation doesn't cause motion sickness (respect `prefers-reduced-motion`)
   - Add `@media (prefers-reduced-motion: reduce)` to disable animation

### Deliverables
- ✅ `SkeletonLoader.svelte` component created
- ✅ Shimmer animation working
- ✅ All skeleton variants implemented
- ✅ Skeleton dimensions match actual content
- ✅ Accessible (aria-busy, prefers-reduced-motion support)
- ✅ Smooth transitions

### Acceptance Criteria
- [ ] Skeleton loaders match actual content layout
- [ ] Shimmer animation smooth and not jarring
- [ ] All skeleton types implemented
- [ ] Accessible (aria-busy, aria-label)
- [ ] Respects prefers-reduced-motion
- [ ] Smooth transition to actual content

---

## Task 3: Error Display Component

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** None (can reference API error response types)

### Description
Create comprehensive error display component that handles all error scenarios with user-friendly messages, spelling suggestions, and retry functionality.

### Requirements
- Handle all error scenarios from API
- Display spelling suggestions from RxNorm API
- Retry functionality with countdown
- Clear, actionable error messages
- Accessible error announcements

### Steps
1. Create `ErrorDisplay.svelte` component:
   - Props: `error: { code: string, message: string, details?: any }`, `suggestions?: string[]`, `onRetry?: () => void`
   - Display error message prominently
   - Show error code (for debugging, can be hidden in production)

2. Handle error scenarios:
   - **Drug Not Found:**
     - Display: "Drug not found"
     - Show spelling suggestions if available
     - Make suggestions clickable (emit event to pre-fill input)
     - Show retry button
   
   - **No NDCs Available:**
     - Display: "No active NDCs found for this drug"
     - Explanation message
     - Suggest checking drug name spelling
     - Show retry button
   
   - **SIG Parse Failure:**
     - Display: "Could not parse instructions"
     - Show format example: "Take X [unit] [frequency]"
     - Allow manual entry option (future, placeholder)
     - Show retry button
   
   - **API Errors:**
     - Display: "Service temporarily unavailable"
     - Show last error message (user-friendly)
     - Retry button with countdown (if rate limited)
     - Show retry countdown: "Retry in 5 seconds..."
   
   - **Validation Errors:**
     - Display inline with form fields (already in `+page.svelte`)
     - Real-time feedback
     - Clear error messages

3. Implement spelling suggestions:
   - Display as clickable chips/buttons
   - On click: emit event with selected suggestion
   - Parent component pre-fills input field
   - Style: `bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded`

4. Implement retry functionality:
   - Retry button: `on:click={handleRetry}`
   - If rate limited: show countdown timer
   - Countdown: use Svelte `$:` reactive statement
   - Disable button during countdown
   - Emit retry event to parent

5. Add accessibility:
   - `role="alert"` for error messages
   - `aria-live="polite"` for dynamic content
   - Focus management: focus error message on mount
   - Keyboard accessible retry button

6. Create error message mapping:
   - Map API error codes to user-friendly messages
   - File: `src/lib/utils/errorMessages.ts`
   - Function: `getErrorMessage(code: string): string`
   - Handle all error codes from API

7. Style error display:
   - Error container: `bg-red-50 border border-red-200 rounded-lg p-4`
   - Error icon (SVG, not emoji)
   - Clear typography hierarchy
   - Retry button: `bg-blue-600 hover:bg-blue-700`

### Deliverables
- ✅ `ErrorDisplay.svelte` component created
- ✅ All error scenarios handled
- ✅ Spelling suggestions displayed and clickable
- ✅ Retry functionality working
- ✅ Error message mapping utility
- ✅ Accessible error announcements
- ✅ User-friendly error messages

### Acceptance Criteria
- [ ] All error scenarios from API handled
- [ ] Spelling suggestions displayed and clickable
- [ ] Retry button functional
- [ ] Countdown timer works (if rate limited)
- [ ] Error messages user-friendly
- [ ] Accessible (role="alert", aria-live)
- [ ] Error styling clear and visible

---

## Task 4: Responsive Design Implementation

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Tasks 1-3 (components must exist)

### Description
Ensure all UI components work correctly across desktop, tablet, and mobile breakpoints using Tailwind CSS responsive utilities.

### Requirements
- Desktop layout (≥1024px): Full-width, side-by-side sections
- Tablet layout (≥768px): Touch-friendly, optimized spacing
- Mobile layout (<768px): Stacked, full-width inputs
- All breakpoints tested
- Touch interactions optimized

### Steps
1. Define breakpoint strategy:
   - Mobile-first approach (default styles for mobile)
   - Tablet: `md:` breakpoint (≥768px)
   - Desktop: `lg:` breakpoint (≥1024px)

2. Update main page layout (`+page.svelte`):
   - Mobile: Stacked layout `flex flex-col`
   - Desktop: Centered container `max-w-6xl mx-auto`
   - Responsive padding: `p-4 md:p-6 lg:p-8`

3. Update form layout:
   - Mobile: Full-width inputs `w-full`
   - Desktop: Can use grid if needed `lg:grid lg:grid-cols-2`
   - Responsive spacing: `space-y-4 md:space-y-6`

4. Update results display:
   - Mobile: Stacked sections `flex flex-col space-y-4`
   - Desktop: Side-by-side if beneficial `lg:grid lg:grid-cols-2`
   - Responsive text sizes: `text-sm md:text-base lg:text-lg`

5. Update NDC lists:
   - Mobile: Scrollable container `overflow-x-auto`
   - Desktop: Full width, no scroll needed
   - Responsive card sizing

6. Update buttons:
   - Mobile: Full-width `w-full md:w-auto`
   - Tablet: Touch-friendly `min-h-[44px]` (minimum touch target)
   - Desktop: Auto width

7. Update collapsible sections:
   - Mobile: Default to collapsed (save space)
   - Desktop: Can default to expanded
   - Responsive toggle button size

8. Test responsive behavior:
   - Use browser dev tools responsive mode
   - Test at breakpoints: 320px, 768px, 1024px, 1440px
   - Verify no horizontal scroll
   - Verify touch targets ≥44px on mobile

9. Optimize images/icons (if any):
   - Responsive sizing
   - Lazy loading if needed

10. Test on actual devices (if possible):
    - Mobile phone
    - Tablet
    - Desktop

### Deliverables
- ✅ All components responsive
- ✅ Mobile layout stacked and functional
- ✅ Tablet layout optimized
- ✅ Desktop layout full-width
- ✅ Touch targets ≥44px on mobile
- ✅ No horizontal scroll at any breakpoint
- ✅ Tested at all breakpoints

### Acceptance Criteria
- [ ] Mobile layout works correctly (<768px)
- [ ] Tablet layout optimized (≥768px)
- [ ] Desktop layout full-width (≥1024px)
- [ ] Touch targets ≥44px on mobile
- [ ] No horizontal scroll
- [ ] All components adapt to screen size
- [ ] Tested in browser dev tools

---

## Task 5: Accessibility Features

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** Tasks 1-4 (components must exist)

### Description
Implement comprehensive accessibility features to meet WCAG 2.1 AA standards, including ARIA labels, keyboard navigation, screen reader support, and visual accessibility.

### Requirements
- ARIA labels on all interactive elements
- Keyboard navigation works correctly
- Screen reader compatible
- High contrast mode supported
- Focus indicators visible
- Semantic HTML used

### Steps
1. Audit existing components for ARIA:
   - Review all components from Tasks 1-3
   - Add missing ARIA labels
   - Add `aria-describedby` for error messages
   - Add `aria-required` for required fields

2. Implement form accessibility:
   - All inputs have associated `<label>` elements
   - Labels use `for` attribute matching input `id`
   - Error messages use `aria-describedby` pointing to input
   - Required fields marked with `aria-required="true"`
   - Validation feedback announced: `role="alert"` for errors

3. Implement keyboard navigation:
   - Tab order logical (form → submit → results)
   - All interactive elements focusable
   - Skip link to main content: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`
   - Collapsible sections: Enter/Space to toggle
   - Buttons: Enter/Space to activate
   - Focus trap in modals (if any)

4. Implement screen reader support:
   - Semantic HTML: `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`
   - Headings hierarchy: `h1` → `h2` → `h3` (no skipping levels)
   - ARIA live regions for dynamic content:
     - `aria-live="polite"` for results
     - `aria-live="assertive"` for errors
   - Alt text for icons (if any): `aria-label` or `<title>` in SVG
   - Descriptive link text (no "click here")

5. Implement visual accessibility:
   - Focus indicators visible: `focus:outline-2 focus:outline-blue-500`
   - High contrast mode: Test with browser high contrast
   - Color not sole indicator: Use icons/text in addition to color
   - Text size scalable: Test up to 200% zoom
   - Sufficient color contrast: WCAG AA (4.5:1 for text)

6. Add ARIA to dynamic content:
   - Loading states: `aria-busy="true"` on container
   - Results: `aria-live="polite"` on results container
   - Errors: `role="alert"` on error container
   - Collapsible: `aria-expanded`, `aria-controls`

7. Test with screen reader (if possible):
   - Test with NVDA (Windows) or VoiceOver (Mac)
   - Verify all content announced
   - Verify form labels announced
   - Verify error messages announced

8. Create accessibility utilities:
   - `src/lib/utils/accessibility.ts` (if needed)
   - Helper functions for ARIA attributes
   - Focus management utilities

9. Document accessibility features:
   - Add comments in code for complex ARIA patterns
   - Note keyboard shortcuts (if any)

### Deliverables
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation working
- ✅ Screen reader compatible
- ✅ High contrast mode supported
- ✅ Focus indicators visible
- ✅ Semantic HTML used
- ✅ Form accessibility complete

### Acceptance Criteria
- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen reader announces all content correctly
- [ ] High contrast mode displays correctly
- [ ] Focus indicators visible on all focusable elements
- [ ] Form labels associated with inputs
- [ ] Error messages associated with fields
- [ ] Headings hierarchy correct (h1 → h2 → h3)

---

## Task 6: Copy to Clipboard Functionality

**Priority:** P1 - Important  
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1 (results components must exist)

### Description
Implement copy to clipboard functionality for NDC codes and results, with toast notifications for user feedback.

### Requirements
- Copy NDC code button next to each NDC
- Copy all results as formatted text
- Copy JSON option (developer mode)
- Toast notifications on success/error
- Error handling for clipboard API

### Steps
1. Create clipboard utility:
   - File: `src/lib/utils/clipboard.ts`
   - Function: `copyToClipboard(text: string): Promise<boolean>`
   - Use Clipboard API: `navigator.clipboard.writeText()`
   - Fallback for older browsers: `document.execCommand('copy')`
   - Return success/failure boolean

2. Create toast notification component:
   - File: `src/lib/components/Toast.svelte`
   - Props: `message: string`, `type: 'success' | 'error'`, `duration?: number`
   - Auto-dismiss after duration (default 3 seconds)
   - Slide-in animation
   - Accessible: `role="status"`, `aria-live="polite"`

3. Create toast store (Svelte store):
   - File: `src/lib/stores/toast.ts` (create `stores/` directory if needed)
   - Store: `writable<ToastState | null>(null)`
   - Functions: `showToast(message, type)`, `hideToast()`
   - Auto-hide after duration

4. Add copy buttons to NDC components:
   - Add copy button next to each NDC code
   - Icon: SVG copy icon (not emoji)
   - On click: Copy NDC code to clipboard
   - Show toast on success/error
   - Disable button during copy operation

5. Add copy all results functionality:
   - Button in results display: "Copy Results"
   - Format results as readable text:
     ```
     Drug: [name]
     Quantity: [total] [unit]
     Recommended NDC: [ndc]
     ...
     ```
   - Copy formatted text to clipboard
   - Show toast on success/error

6. Add copy JSON option (optional, developer mode):
   - Button: "Copy JSON" (can be hidden behind feature flag)
   - Copy raw API response as JSON
   - Pretty-print JSON
   - Show toast on success/error

7. Handle clipboard errors:
   - Check if Clipboard API available
   - Fallback to `document.execCommand` if not
   - Show error toast if both fail
   - Handle permission denied errors

8. Style copy buttons:
   - Icon button: `p-2 hover:bg-gray-100 rounded`
   - Accessible: `aria-label="Copy NDC code"`
   - Focus indicator visible

9. Test clipboard functionality:
   - Test in different browsers
   - Test with clipboard API
   - Test fallback method
   - Test error handling

### Deliverables
- ✅ Clipboard utility function created
- ✅ Toast notification component created
- ✅ Toast store created
- ✅ Copy buttons on NDC components
- ✅ Copy all results functionality
- ✅ Error handling complete
- ✅ Accessible (aria-labels, role="status")

### Acceptance Criteria
- [ ] Copy NDC code button works
- [ ] Copy all results works
- [ ] Toast notifications display correctly
- [ ] Error handling works (permission denied, etc.)
- [ ] Fallback method works (older browsers)
- [ ] Accessible (aria-labels, role="status")
- [ ] Copy buttons styled correctly

---

## Task 7: Performance Optimizations

**Priority:** P1 - Important  
**Estimated Time:** 2-3 hours  
**Dependencies:** Tasks 1-6 (components must exist)

### Description
Implement performance optimizations including input debouncing, lazy loading, code splitting, and memoization to ensure fast, responsive interactions.

### Requirements
- Input debouncing (300ms)
- Lazy loading for alternative NDC details
- Code splitting for large components
- Memoization of expensive calculations
- No unnecessary re-renders

### Steps
1. Implement input debouncing:
   - Create utility: `src/lib/utils/debounce.ts`
   - Function: `debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T`
   - Apply to form validation (300ms delay)
   - Prevent excessive API calls during typing

2. Implement lazy loading:
   - Lazy load alternative NDC details (if large list)
   - Use Svelte `{#await}` for async loading
   - Show skeleton while loading
   - Load on demand (when section expanded)

3. Implement code splitting:
   - Split large components if needed
   - Use dynamic imports: `import()` for heavy components
   - Lazy load results display component (if large)
   - Example: `const ResultsDisplay = lazy(() => import('./ResultsDisplay.svelte'))`

4. Implement memoization:
   - Memoize expensive calculations in components
   - Use Svelte `$:` reactive statements efficiently
   - Cache formatted display values
   - Example: `$: formattedQuantity = formatQuantity(quantity)`

5. Optimize re-renders:
   - Use Svelte `key` blocks for lists
   - Avoid unnecessary reactive statements
   - Use `$:` only when needed
   - Check component re-render frequency

6. Optimize images/icons (if any):
   - Lazy load images
   - Use appropriate image formats
   - Optimize SVG icons

7. Test performance:
   - Use browser DevTools Performance tab
   - Check for unnecessary re-renders
   - Measure interaction response time
   - Check bundle size

8. Add performance monitoring (optional):
   - Log render times in development
   - Track API call durations
   - Monitor component mount times

### Deliverables
- ✅ Input debouncing implemented
- ✅ Lazy loading implemented (if needed)
- ✅ Code splitting implemented (if needed)
- ✅ Memoization applied
- ✅ No unnecessary re-renders
- ✅ Performance optimized

### Acceptance Criteria
- [ ] Input debouncing works (300ms delay)
- [ ] Lazy loading implemented (if applicable)
- [ ] Code splitting implemented (if applicable)
- [ ] Memoization applied to expensive calculations
- [ ] No unnecessary re-renders
- [ ] Interactions feel fast and responsive
- [ ] Bundle size optimized

---

## Task 8: Main Page Integration

**Priority:** P0 - Critical  
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous tasks (1-7)

### Description
Integrate all components into the main page (`+page.svelte`), implement state management, connect to API endpoint, and ensure smooth user flow from input to results.

### Requirements
- Complete page integration
- State management (form, loading, results, error)
- API integration with `/api/calculate`
- Smooth user flow
- Error recovery working

### Steps
1. Update `+page.svelte` state management:
   - Form state: `drugInput`, `sig`, `daysSupply` (already exists)
   - Loading state: `isLoading: boolean`
   - Results state: `results: CalculationResponse | null`
   - Error state: `error: ApiError | null`
   - Loading stages: `loadingStage: 'drug' | 'ndc' | 'sig' | 'calculation' | null`

2. Implement API integration:
   - Function: `async function calculate()`
   - POST to `/api/calculate` with form data
   - Handle loading states (show appropriate skeleton)
   - Handle success response (display results)
   - Handle error response (display error with suggestions)

3. Integrate form submission:
   - Update `handleSubmit` function
   - Validate form (already exists)
   - Call `calculate()` function
   - Show loading skeleton
   - Handle results/error

4. Integrate results display:
   - Import `ResultsDisplay` component
   - Show when `results !== null`
   - Hide form when results shown (or keep visible)
   - Add "Calculate Again" button to reset

5. Integrate error display:
   - Import `ErrorDisplay` component
   - Show when `error !== null`
   - Pass spelling suggestions to error display
   - Implement retry functionality
   - Handle pre-filling input from suggestions

6. Integrate loading states:
   - Show appropriate skeleton based on `loadingStage`
   - Drug lookup: show drug info skeleton
   - NDC fetching: show NDC list skeleton
   - SIG parsing: show quantity skeleton
   - Calculation: show results skeleton

7. Implement error recovery:
   - Retry button: call `calculate()` again
   - Spelling suggestions: pre-fill input and retry
   - Clear error on new submission
   - Reset form option

8. Add "Calculate Again" functionality:
   - Button in results display
   - Reset form state
   - Clear results
   - Scroll to top
   - Focus first input

9. Implement smooth transitions:
   - Fade in results
   - Fade out loading skeleton
   - Smooth error display
   - Use Svelte transitions: `transition:fade`

10. Add keyboard shortcuts (optional):
    - Enter to submit form (already works)
    - Escape to clear/reset (optional)

11. Test complete user flow:
    - Enter inputs → Submit → Loading → Results
    - Enter inputs → Submit → Loading → Error → Retry
    - Enter inputs → Submit → Loading → Error → Select suggestion → Retry
    - Results → Calculate Again → New calculation

12. Final polish:
    - Check all states work correctly
    - Verify no console errors
    - Test error scenarios
    - Verify accessibility
    - Check responsive design

### Deliverables
- ✅ Complete page integration
- ✅ State management working
- ✅ API integration complete
- ✅ All components integrated
- ✅ Smooth user flow
- ✅ Error recovery working
- ✅ Loading states working
- ✅ All states managed correctly

### Acceptance Criteria
- [ ] Form submission works
- [ ] API integration complete
- [ ] Loading states show correct skeletons
- [ ] Results display correctly
- [ ] Error display with suggestions works
- [ ] Retry functionality works
- [ ] Spelling suggestions pre-fill input
- [ ] "Calculate Again" resets form
- [ ] Smooth transitions between states
- [ ] No console errors
- [ ] All user flows work correctly

---

## Testing Checklist

After completing all tasks, verify:

### Component Testing
- [ ] All components render correctly
- [ ] Components handle missing data gracefully
- [ ] Collapsible sections work
- [ ] Copy to clipboard works
- [ ] Toast notifications display

### Responsive Design
- [ ] Mobile layout works (<768px)
- [ ] Tablet layout works (≥768px)
- [ ] Desktop layout works (≥1024px)
- [ ] No horizontal scroll
- [ ] Touch targets ≥44px

### Accessibility
- [ ] ARIA labels on all elements
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] High contrast mode works

### Performance
- [ ] Input debouncing works
- [ ] No unnecessary re-renders
- [ ] Fast interactions
- [ ] Smooth animations

### Integration
- [ ] Complete user flow works
- [ ] Error handling complete
- [ ] Loading states work
- [ ] API integration complete

---

## Dependencies

**Prerequisites:**
- Phase 3 must be complete (API endpoint `/api/calculate` must be functional)
- Phase 2 must be complete (API services must be working)
- Phase 1 must be complete (Project structure and types must exist)

**External:**
- None (all UI work, no new external dependencies)

---

## Risks & Mitigation

**Risk 1: State Management Complexity**
- **Impact:** Medium - Can lead to bugs and poor UX
- **Mitigation:** Use Svelte stores if state becomes complex, keep state local when possible
- **Contingency:** Simplify state structure, use fewer reactive statements

**Risk 2: Accessibility Compliance Issues**
- **Impact:** Medium - May exclude some users
- **Mitigation:** Test with screen readers, follow WCAG guidelines strictly
- **Contingency:** Iterate based on accessibility testing, use accessibility audit tools

**Risk 3: Mobile Performance Issues**
- **Impact:** Low - Can optimize if needed
- **Mitigation:** Test on real devices, optimize animations, use lazy loading
- **Contingency:** Reduce animations, simplify components, disable non-essential features on mobile

**Risk 4: Component Organization**
- **Impact:** Low - Can refactor if needed
- **Mitigation:** Keep components focused, use composition
- **Contingency:** Refactor into smaller components if needed

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
**Last Updated:** Phase 4 Task List Creation  
**Status:** Pending

