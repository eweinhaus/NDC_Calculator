/**
 * PDF generation utility for calculation results
 */

import { jsPDF } from 'jspdf';
import type { CalculationResult } from '../types/api.js';

/**
 * Helper function to sanitize text for PDF (ensure it's a string and handle special characters)
 */
function sanitizeText(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	// Convert to string and replace any problematic characters
	return String(value).replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Generate PDF and open in new tab (alternative to download)
 */
export function openPdfInNewTab(results: CalculationResult): void {
	try {
		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const margin = 12;
		let yPosition = margin;

		// Title
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('NDC Packaging & Quantity Calculator', pageWidth / 2, yPosition, {
			align: 'center',
		});
		yPosition += 8;

		// Date
		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		const dateStr = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
		doc.text(`Generated: ${dateStr}`, pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 10;

		// Drug Information Section
		doc.setFontSize(13);
		doc.setFont('helvetica', 'bold');
		doc.text('Drug Information', margin, yPosition);
		yPosition += 6;

		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text(`Drug Name: ${sanitizeText(results.drug.name)}`, margin, yPosition);
		yPosition += 5;

		if (results.drug.rxcui) {
			doc.text(`RxCUI: ${sanitizeText(results.drug.rxcui)}`, margin, yPosition);
			yPosition += 5;
		}

		if (results.drug.strength) {
			doc.text(`Strength: ${sanitizeText(results.drug.strength)}`, margin, yPosition);
			yPosition += 5;
		}

		if (results.drug.dosageForm) {
			doc.text(`Dosage Form: ${sanitizeText(results.drug.dosageForm)}`, margin, yPosition);
			yPosition += 5;
		}

		yPosition += 5;

		// Quantity Calculation Section
		doc.setFontSize(13);
		doc.setFont('helvetica', 'bold');
		doc.text('Quantity Calculation', margin, yPosition);
		yPosition += 6;

		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text(
			`Dosage: ${sanitizeText(results.quantity.calculation.dosage)} ${sanitizeText(results.quantity.unit)}`,
			margin,
			yPosition
		);
		yPosition += 5;

		doc.text(
			`Frequency: ${sanitizeText(results.quantity.calculation.frequency)} per day`,
			margin,
			yPosition
		);
		yPosition += 5;

		doc.text(
			`Days' Supply: ${sanitizeText(results.quantity.calculation.daysSupply)} days`,
			margin,
			yPosition
		);
		yPosition += 5;

		doc.setFont('helvetica', 'bold');
		doc.text(
			`Total Quantity: ${sanitizeText(results.quantity.total)} ${sanitizeText(results.quantity.unit)}`,
			margin,
			yPosition
		);
		yPosition += 8;

		// Recommended NDC Section
		doc.setFontSize(13);
		doc.setFont('helvetica', 'bold');
		doc.text('Recommended NDC', margin, yPosition);
		yPosition += 6;

		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text(`NDC Code: ${sanitizeText(results.recommendedNdc.ndc)}`, margin, yPosition);
		yPosition += 5;

		if (results.recommendedNdc.packageDescription) {
			const descText = sanitizeText(results.recommendedNdc.packageDescription);
			const desc = doc.splitTextToSize(`Package: ${descText}`, pageWidth - margin * 2);
			const descArray = Array.isArray(desc) ? desc : [desc];
			doc.text(descArray, margin, yPosition);
			yPosition += descArray.length * 5;
		}

		// Generate PDF blob and open in new tab
		console.log('[PDF Viewer] Generating PDF for new tab...');
		const pdfBlob = doc.output('blob');
		const url = URL.createObjectURL(pdfBlob);
		
		console.log('[PDF Viewer] Opening PDF in new tab...');
		const newWindow = window.open(url, '_blank');
		
		if (!newWindow) {
			throw new Error('Popup blocked. Please allow popups for this site.');
		}
		
		// Clean up URL after a delay
		setTimeout(() => {
			URL.revokeObjectURL(url);
			console.log('[PDF Viewer] Cleanup completed');
		}, 1000);
	} catch (error) {
		console.error('Error opening PDF in new tab:', error);
		throw error;
	}
}

/**
 * Helper function to draw a styled section box
 */
function drawSectionBox(
	doc: jsPDF,
	x: number,
	y: number,
	width: number,
	height: number,
	title: string,
	titleSize: number = 12
): void {
	// Draw title bar with blue background
	doc.setFillColor(59, 130, 246); // Blue background
	doc.setDrawColor(59, 130, 246);
	doc.setLineWidth(0.5);
	doc.rect(x, y, width, 8, 'FD');
	
	// Title text
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(titleSize);
	doc.setFont('helvetica', 'bold');
	doc.text(title, x + 5, y + 5.5);
	
	// Draw box with light gray background
	doc.setFillColor(245, 247, 250);
	doc.setDrawColor(220, 223, 230);
	doc.rect(x, y + 8, width, height - 8, 'FD');
	
	// Reset text color
	doc.setTextColor(0, 0, 0);
}

/**
 * Generate and download PDF from calculation results
 */
export function downloadResultsAsPdf(results: CalculationResult): void {
	try {
		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const margin = 15;
		const maxY = pageHeight - margin;
		let yPosition = margin;

		// Helper function to check if we need more space
		const checkSpace = (needed: number) => {
			if (yPosition + needed > maxY) {
				console.warn('[PDF] Content exceeds page height, truncating...');
				return false;
			}
			return true;
		};

		// Header with professional styling
		doc.setFillColor(59, 130, 246); // Blue header
		doc.rect(0, 0, pageWidth, 25, 'F');
		
		// Title - white text on blue background
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(18);
		doc.setFont('helvetica', 'bold');
		doc.text('NDC Packaging & Quantity Calculator', pageWidth / 2, 12, {
			align: 'center',
		});
		
		// Date - smaller white text
		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		const dateStr = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		doc.text(`Generated: ${dateStr}`, pageWidth / 2, 20, { align: 'center' });
		
		// Reset text color
		doc.setTextColor(0, 0, 0);
		yPosition = 35;

		// Two-column layout with styled boxes
		const boxWidth = (pageWidth - margin * 3) / 2;
		const leftCol = margin;
		const rightCol = margin * 2 + boxWidth;
		const boxHeight = 45;

		// LEFT COLUMN: Drug Information Box
		if (checkSpace(boxHeight + 5)) {
			drawSectionBox(doc, leftCol, yPosition, boxWidth, boxHeight, 'Drug Information', 11);
			
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			let contentY = yPosition + 12;
			
			doc.text(`Drug Name:`, leftCol + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(sanitizeText(results.drug.name), leftCol + 35, contentY);
			contentY += 6;
			
			if (results.drug.rxcui) {
				doc.setFont('helvetica', 'normal');
				doc.text(`RxCUI:`, leftCol + 5, contentY);
				doc.setFont('helvetica', 'bold');
				doc.text(sanitizeText(results.drug.rxcui), leftCol + 35, contentY);
				contentY += 6;
			}
			
			if (results.drug.strength) {
				doc.setFont('helvetica', 'normal');
				doc.text(`Strength:`, leftCol + 5, contentY);
				doc.setFont('helvetica', 'bold');
				doc.text(sanitizeText(results.drug.strength), leftCol + 35, contentY);
				contentY += 6;
			}
			
			if (results.drug.dosageForm) {
				doc.setFont('helvetica', 'normal');
				doc.text(`Dosage Form:`, leftCol + 5, contentY);
				doc.setFont('helvetica', 'bold');
				doc.text(sanitizeText(results.drug.dosageForm), leftCol + 35, contentY);
			}
		}

		// RIGHT COLUMN: Quantity Calculation Box
		if (checkSpace(boxHeight + 5)) {
			drawSectionBox(doc, rightCol, yPosition, boxWidth, boxHeight, 'Quantity Calculation', 11);
			
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			let contentY = yPosition + 12;
			
			doc.text(`Dosage:`, rightCol + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(`${sanitizeText(results.quantity.calculation.dosage)} ${sanitizeText(results.quantity.unit)}`, rightCol + 30, contentY);
			contentY += 6;
			
			doc.setFont('helvetica', 'normal');
			doc.text(`Frequency:`, rightCol + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(`${sanitizeText(results.quantity.calculation.frequency)} per day`, rightCol + 30, contentY);
			contentY += 6;
			
			doc.setFont('helvetica', 'normal');
			doc.text(`Days' Supply:`, rightCol + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(`${sanitizeText(results.quantity.calculation.daysSupply)} days`, rightCol + 30, contentY);
			contentY += 6;
			
			// Total quantity - highlighted
			doc.setFontSize(11);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(59, 130, 246);
			doc.text(`Total Quantity:`, rightCol + 5, contentY);
			doc.text(`${sanitizeText(results.quantity.total)} ${sanitizeText(results.quantity.unit)}`, rightCol + 40, contentY);
			doc.setTextColor(0, 0, 0);
		}
		
		yPosition += boxHeight + 10;

		// Recommended NDC Section - styled box
		const recommendedBoxHeight = 60;
		if (checkSpace(recommendedBoxHeight + 5)) {
			drawSectionBox(doc, margin, yPosition, pageWidth - margin * 2, recommendedBoxHeight, 'Recommended NDC', 12);
			
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			let contentY = yPosition + 12;
			
			// NDC Code - prominent
			doc.text(`NDC Code:`, margin + 5, contentY);
			doc.setFontSize(12);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(59, 130, 246);
			doc.text(sanitizeText(results.recommendedNdc.ndc), margin + 35, contentY);
			doc.setTextColor(0, 0, 0);
			contentY += 7;
			
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			
			if (results.recommendedNdc.packageDescription) {
				const descText = sanitizeText(results.recommendedNdc.packageDescription);
				doc.text(`Package:`, margin + 5, contentY);
				const desc = doc.splitTextToSize(descText, pageWidth - margin * 2 - 40);
				const descArray = Array.isArray(desc) ? desc : [desc];
				doc.setFont('helvetica', 'bold');
				doc.text(descArray, margin + 35, contentY);
				contentY += descArray.length * 5;
			}

			doc.setFont('helvetica', 'normal');
			doc.text(`Package Size:`, margin + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(sanitizeText(results.recommendedNdc.packageSize), margin + 40, contentY);
			
			if (results.recommendedNdc.packageCount) {
				doc.setFont('helvetica', 'normal');
				doc.text(`Packages:`, margin + 5, contentY + 6);
				doc.setFont('helvetica', 'bold');
				doc.text(`${sanitizeText(results.recommendedNdc.packageCount)}`, margin + 40, contentY + 6);
			}
			contentY += 6;

			doc.setFont('helvetica', 'normal');
			doc.text(`Total Quantity:`, margin + 5, contentY);
			doc.setFont('helvetica', 'bold');
			doc.text(`${sanitizeText(results.recommendedNdc.totalQuantity)} ${sanitizeText(results.quantity.unit)}`, margin + 40, contentY);
			contentY += 6;
			
			if (results.recommendedNdc.manufacturer) {
				doc.setFont('helvetica', 'normal');
				doc.text(`Manufacturer:`, margin + 5, contentY);
				const mfgText = sanitizeText(results.recommendedNdc.manufacturer);
				const mfg = doc.splitTextToSize(mfgText, pageWidth - margin * 2 - 50);
				const mfgArray = Array.isArray(mfg) ? mfg : [mfg];
				doc.setFont('helvetica', 'bold');
				doc.text(mfgArray, margin + 45, contentY);
				contentY += mfgArray.length * 5;
			}

			if (results.recommendedNdc.overfill > 0 || results.recommendedNdc.underfill > 0) {
				contentY += 2;
				doc.setFontSize(9);
				doc.setFont('helvetica', 'italic');
				doc.setTextColor(100, 100, 100);
				if (results.recommendedNdc.overfill > 0) {
					doc.text(`Overfill: ${sanitizeText(results.recommendedNdc.overfill)} ${sanitizeText(results.quantity.unit)}`, margin + 5, contentY);
					contentY += 4;
				}
				if (results.recommendedNdc.underfill > 0) {
					doc.text(`Underfill: ${sanitizeText(results.recommendedNdc.underfill)} ${sanitizeText(results.quantity.unit)}`, margin + 5, contentY);
				}
				doc.setTextColor(0, 0, 0);
			}

			yPosition += recommendedBoxHeight + 8;
		}

		// Alternative NDCs Section - compact styled box
		if (results.alternatives && results.alternatives.length > 0 && checkSpace(25)) {
			const spaceLeft = maxY - yPosition;
			const maxAlternatives = Math.min(results.alternatives.length, Math.floor((spaceLeft - 20) / 5), 3);
			
			if (maxAlternatives > 0) {
				const altBoxHeight = 10 + (maxAlternatives * 5);
				drawSectionBox(
					doc, 
					margin, 
					yPosition, 
					pageWidth - margin * 2, 
					altBoxHeight, 
					`Alternative NDCs${results.alternatives.length > maxAlternatives ? ` (showing ${maxAlternatives} of ${results.alternatives.length})` : ''}`, 
					10
				);

				doc.setFontSize(9);
				doc.setFont('helvetica', 'normal');
				let altY = yPosition + 12;
				
				for (let i = 0; i < maxAlternatives; i++) {
					const alt = results.alternatives[i];
					doc.text(`${i + 1}.`, margin + 5, altY);
					doc.setFont('helvetica', 'bold');
					doc.text(sanitizeText(alt.ndc), margin + 12, altY);
					doc.setFont('helvetica', 'normal');
					doc.text(`- ${sanitizeText(alt.packageSize)} (Total: ${sanitizeText(alt.totalQuantity)})`, margin + 50, altY);
					altY += 5;
				}
				
				yPosition += altBoxHeight + 5;
			}
		}

		// Warnings Section - styled box
		if (results.warnings && results.warnings.length > 0 && checkSpace(20)) {
			// Calculate box height based on warnings
			let warningHeight = 12;
			for (const warning of results.warnings) {
				const messageText = sanitizeText(warning.message);
				const message = doc.splitTextToSize(messageText, pageWidth - margin * 2 - 20);
				warningHeight += 5 + (message.length * 4);
			}
			warningHeight = Math.min(warningHeight, maxY - yPosition - 5);
			
			if (warningHeight > 12) {
				drawSectionBox(doc, margin, yPosition, pageWidth - margin * 2, warningHeight, 'Warnings', 10);

				doc.setFontSize(9);
				let warnY = yPosition + 12;
				
				for (const warning of results.warnings) {
					if (warnY > yPosition + warningHeight - 5) break;
					
					doc.setFont('helvetica', 'bold');
					doc.setTextColor(220, 38, 38); // Red for warnings
					doc.text(`${warning.severity.toUpperCase()}:`, margin + 5, warnY);
					doc.setTextColor(0, 0, 0);
					warnY += 4.5;

					const messageText = sanitizeText(warning.message);
					const message = doc.splitTextToSize(messageText, pageWidth - margin * 2 - 15);
					const messageArray = Array.isArray(message) ? message : [message];
					doc.setFont('helvetica', 'normal');
					doc.text(messageArray, margin + 5, warnY);
					warnY += messageArray.length * 4 + 2;
				}
				
				yPosition += warningHeight + 5;
			}
		}

		// Inactive NDCs Section - subtle note
		if (results.inactiveNdcs && results.inactiveNdcs.length > 0 && checkSpace(8)) {
			doc.setFontSize(8);
			doc.setFont('helvetica', 'italic');
			doc.setTextColor(120, 120, 120);
			doc.text(
				`Note: ${results.inactiveNdcs.length} inactive NDC(s) excluded from results.`,
				margin,
				yPosition
			);
			doc.setTextColor(0, 0, 0);
		}

		// Ensure we're in a browser environment
		if (typeof window === 'undefined' || typeof document === 'undefined') {
			throw new Error('PDF download is only available in a browser environment');
		}

		console.log('[PDF Download] Starting PDF generation...');

		// Generate filename - sanitize to avoid invalid characters
		const sanitizedName = results.drug.name.replace(/[^a-zA-Z0-9_-]/g, '_');
		const filename = `NDC_Calculation_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
		console.log('[PDF Download] Generated filename:', filename);

		// Generate PDF as blob with explicit MIME type
		console.log('[PDF Download] Generating PDF blob...');
		const pdfBlob = doc.output('blob');
		console.log('[PDF Download] PDF blob size:', pdfBlob.size, 'bytes');
		console.log('[PDF Download] PDF blob type:', pdfBlob.type);

		// Verify the blob is not empty
		if (!pdfBlob || pdfBlob.size === 0) {
			throw new Error('Generated PDF is empty');
		}

		// Method 1: Try using blob URL (most compatible)
		try {
			const url = URL.createObjectURL(pdfBlob);
			console.log('[PDF Download] Created blob URL:', url);

			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.style.display = 'none';
			link.type = 'application/pdf';
			
			document.body.appendChild(link);
			console.log('[PDF Download] Triggering download via blob URL...');
			link.click();
			
			// Clean up after download starts
			setTimeout(() => {
				if (document.body.contains(link)) {
					document.body.removeChild(link);
				}
				URL.revokeObjectURL(url);
				console.log('[PDF Download] Cleanup completed');
			}, 250);
			
			return; // Success
		} catch (blobError) {
			console.error('[PDF Download] Blob URL method failed:', blobError);
			console.log('[PDF Download] Trying data URL fallback...');
		}

		// Method 2: Fallback to data URL if blob URL fails
		try {
			const pdfDataUri = doc.output('dataurlstring');
			console.log('[PDF Download] Generated data URL (length:', pdfDataUri.length, ')');
			
			const link = document.createElement('a');
			link.href = pdfDataUri;
			link.download = filename;
			link.style.display = 'none';
			
			document.body.appendChild(link);
			console.log('[PDF Download] Triggering download via data URL...');
			link.click();
			
			setTimeout(() => {
				if (document.body.contains(link)) {
					document.body.removeChild(link);
				}
				console.log('[PDF Download] Data URL cleanup completed');
			}, 250);
		} catch (dataUrlError) {
			console.error('[PDF Download] Data URL method also failed:', dataUrlError);
			throw new Error('All download methods failed');
		}
	} catch (error) {
		console.error('Error generating PDF:', error);
		// Show user-friendly error message
		if (typeof window !== 'undefined') {
			alert('Failed to generate PDF. Please try again or contact support if the issue persists.');
		}
		throw error;
	}
}

