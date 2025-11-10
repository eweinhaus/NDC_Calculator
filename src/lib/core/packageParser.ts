/**
 * Package Description Parser
 * Parses FDA package descriptions to extract quantity information
 */

/**
 * Parsed package description
 */
export interface ParsedPackage {
	quantity: number;
	unit: string;
	packageCount?: number;
	totalQuantity: number;
}

/**
 * Parses package description to extract quantity information
 * @param description - Package description from FDA API
 * @returns Parsed package info or null if parsing fails
 * @example
 * parsePackageDescription('30 TABLET in 1 BOTTLE')
 * // Returns { quantity: 30, unit: 'TABLET', totalQuantity: 30 }
 * 
 * parsePackageDescription('3 x 30 TABLET in 1 PACKAGE')
 * // Returns { quantity: 30, unit: 'TABLET', packageCount: 3, totalQuantity: 90 }
 */
export function parsePackageDescription(description: string): ParsedPackage | null {
	if (!description || typeof description !== 'string') {
		return null;
	}

	const trimmed = description.trim();
	if (!trimmed) {
		return null;
	}

	// Handle multi-pack format: "1 BLISTER PACK in 1 CARTON ... / 21 TABLET in 1 BLISTER PACK"
	// Extract the part after the "/" which contains the actual quantity
	if (trimmed.includes(' / ')) {
		const parts = trimmed.split(' / ');
		if (parts.length >= 2) {
			// Parse the second part (after /) which has the actual quantity
			const innerPart = parts[1].trim();
			const innerResult = parseSimpleFormat(innerPart);
			if (innerResult) {
				// Try to extract package count from first part
				const outerPart = parts[0].trim();
				const packageCountMatch = outerPart.match(/(\d+)\s+(?:BLISTER PACK|CARTON|VIAL|BOTTLE)/i);
				if (packageCountMatch) {
					const packageCount = parseInt(packageCountMatch[1], 10);
					// Only add packageCount if it's > 1 (actual multi-pack)
					if (packageCount > 1) {
						return {
							quantity: innerResult.quantity,
							unit: innerResult.unit,
							packageCount,
							totalQuantity: innerResult.quantity * packageCount
						};
					}
				}
				return innerResult;
			}
		}
	}

	// Handle simple formats
	return parseSimpleFormat(trimmed);
}

/**
 * Parses simple package description formats
 */
function parseSimpleFormat(description: string): ParsedPackage | null {
	// Remove NDC codes in parentheses at the end: "30 TABLET in 1 BOTTLE (76420-345-30)"
	const cleaned = description.replace(/\s*\([^)]+\)\s*$/, '').trim();

	// Check for multi-pack format FIRST: "3 x 30 TABLET"
	const multiPackMatch = cleaned.match(/(\d+)\s+x\s+(\d+(?:\.\d+)?)\s+([A-Z]+(?:\s+[A-Z]+)*?)/i);
	if (multiPackMatch) {
		const packageCount = parseInt(multiPackMatch[1], 10);
		const perPackageQuantity = parseFloat(multiPackMatch[2]);
		const unit = multiPackMatch[3].trim().toUpperCase();
		return {
			quantity: perPackageQuantity,
			unit,
			packageCount,
			totalQuantity: perPackageQuantity * packageCount
		};
	}

	// Pattern 1: "X UNIT in 1 CONTAINER" or "X UNIT"
	// Examples: "30 TABLET in 1 BOTTLE", "100 TABLET", "87.1 g in 1 PACKAGE"
	const pattern1 = /^(\d+(?:\.\d+)?)\s+([A-Z]+(?:\s+[A-Z]+)*?)(?:\s+in\s+\d+\s+[A-Z]+(?:\s+[A-Z,]+)*)?$/i;
	const match1 = cleaned.match(pattern1);
	if (match1) {
		const quantity = parseFloat(match1[1]);
		const unit = match1[2].trim().toUpperCase();

		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	// Pattern 2: Handle formats with extra descriptors like "30 TABLET, EXTENDED RELEASE in 1 BOTTLE"
	// Extract quantity and unit, ignoring descriptors
	const pattern2 = /^(\d+(?:\.\d+)?)\s+([A-Z]+)(?:\s*,\s*[A-Z\s]+)?(?:\s+in\s+\d+\s+[A-Z]+(?:\s+[A-Z,]+)*)?$/i;
	const match2 = cleaned.match(pattern2);
	if (match2) {
		const quantity = parseFloat(match2[1]);
		const unit = match2[2].trim().toUpperCase();
		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	// Pattern 3: Handle "X UNIT, DESCRIPTOR in 1 CONTAINER"
	// More flexible pattern that handles commas and various descriptors
	const pattern3 = /^(\d+(?:\.\d+)?)\s+([A-Z]+)/i;
	const match3 = cleaned.match(pattern3);
	if (match3) {
		const quantity = parseFloat(match3[1]);
		const unit = match3[2].trim().toUpperCase();
		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	return null;
}

