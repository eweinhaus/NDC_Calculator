# Product Context: NDC Packaging & Quantity Calculator

## Why This Project Exists

Pharmacy systems frequently encounter challenges in accurately matching prescriptions to valid NDCs and determining correct dispense quantities. These issues lead to:
- **Claim rejections** due to NDC mismatches
- **Operational delays** from manual quantity calculations
- **Patient frustration** from fulfillment errors
- **Financial losses** from wasted medication and rework

## Problems It Solves

### 1. NDC Matching Errors
Pharmacists struggle to match prescriptions to correct NDCs, leading to claim rejections. The system normalizes drug names to RxCUI and retrieves all valid NDCs, filtering out inactive ones.

### 2. Quantity Calculation Complexity
Manual calculation from free-text SIG (prescription instructions) is error-prone and time-consuming. The system parses natural language instructions and calculates quantities automatically.

### 3. Package Size Optimization
Difficulty selecting optimal package sizes results in overfills/underfills. The system recommends best-matching NDCs and calculates waste percentages.

### 4. Inactive NDC Detection
Using inactive NDCs causes claim rejections. The system flags inactive NDCs before they're used.

### 5. Dosage Form Mismatches
Mismatched dosage forms (tablets vs capsules) lead to fulfillment errors. The system validates and warns about mismatches.

## How It Should Work

### User Workflow
1. User enters drug name (or NDC), SIG text, and days' supply
2. System normalizes drug to RxCUI via RxNorm API
3. System retrieves all NDCs for that RxCUI
4. System fetches package details from FDA API (parallel with SIG parsing)
5. System parses SIG to extract dosage, frequency, and unit
6. System calculates total quantity needed
7. System matches package sizes to quantity and ranks recommendations
8. System displays results with warnings for inactive NDCs, overfills, underfills

### Key Behaviors
- **Regex-first SIG parsing:** Handles 80%+ of cases without AI costs
- **AI fallback:** Only used when regex confidence < 0.8
- **Aggressive caching:** Reduces API calls and improves performance
- **Parallel processing:** NDC fetching and SIG parsing run concurrently
- **Request deduplication:** Coalesces identical concurrent requests

## User Experience Goals

### Primary Goals
- **Speed:** Complete calculation in <2 seconds
- **Accuracy:** 95%+ normalization accuracy
- **Clarity:** Clear warnings and recommendations
- **Reliability:** Graceful error handling with helpful messages

### UI Principles
- Clean, centered layout
- Real-time validation feedback
- Clear error messages with suggestions
- Collapsible results sections
- Color-coded warnings (error/warning/info)
- Responsive design (desktop/tablet/mobile)
- Accessibility (ARIA labels, keyboard navigation)

## Value Propositions

1. **Reduces claim rejections** by 50% through accurate NDC matching
2. **Saves time** by automating quantity calculations (50% reduction in processing time)
3. **Minimizes waste** by recommending optimal package combinations
4. **Prevents errors** by flagging inactive NDCs and mismatches before fulfillment
5. **Improves satisfaction** through faster, more accurate prescription processing

---

**Last Updated:** Memory Bank Initialization

