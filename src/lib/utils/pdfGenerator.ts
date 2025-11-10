/**
 * PDF generation utility for calculation results
 */

import { jsPDF } from 'jspdf';
import type { CalculationResult } from '../types/api.js';

/**
 * Generate and download PDF from calculation results
 */
export function downloadResultsAsPdf(results: CalculationResult): void {
	try {
		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.getWidth();
		const margin = 20;
		let yPosition = margin;

		// Helper function to add a new page if needed
		const checkPageBreak = (requiredSpace: number) => {
			if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
				doc.addPage();
				yPosition = margin;
			}
		};

		// Title
		doc.setFontSize(20);
		doc.setFont('helvetica', 'bold');
		doc.text('NDC Packaging & Quantity Calculator', pageWidth / 2, yPosition, {
			align: 'center',
		});
		yPosition += 15;

		// Date
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		const dateStr = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		doc.text(`Generated: ${dateStr}`, pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 20;

		// Drug Information Section
		checkPageBreak(30);
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('Drug Information', margin, yPosition);
		yPosition += 10;

		doc.setFontSize(12);
		doc.setFont('helvetica', 'normal');
		doc.text(`Drug Name: ${results.drug.name}`, margin, yPosition);
		yPosition += 7;

		if (results.drug.rxcui) {
			doc.text(`RxCUI: ${results.drug.rxcui}`, margin, yPosition);
			yPosition += 7;
		}

		if (results.drug.strength) {
			doc.text(`Strength: ${results.drug.strength}`, margin, yPosition);
			yPosition += 7;
		}

		if (results.drug.dosageForm) {
			doc.text(`Dosage Form: ${results.drug.dosageForm}`, margin, yPosition);
			yPosition += 7;
		}

		yPosition += 10;

		// Quantity Calculation Section
		checkPageBreak(40);
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('Quantity Calculation', margin, yPosition);
		yPosition += 10;

		doc.setFontSize(12);
		doc.setFont('helvetica', 'normal');
		doc.text(
			`Dosage: ${results.quantity.calculation.dosage} ${results.quantity.unit}`,
			margin,
			yPosition
		);
		yPosition += 7;

		doc.text(
			`Frequency: ${results.quantity.calculation.frequency} per day`,
			margin,
			yPosition
		);
		yPosition += 7;

		doc.text(
			`Days' Supply: ${results.quantity.calculation.daysSupply} days`,
			margin,
			yPosition
		);
		yPosition += 7;

		doc.setFont('helvetica', 'bold');
		doc.text(
			`Total Quantity: ${results.quantity.total} ${results.quantity.unit}`,
			margin,
			yPosition
		);
		yPosition += 7;

		doc.setFont('helvetica', 'normal');
		const formula = `(${results.quantity.calculation.dosage} × ${results.quantity.calculation.frequency}) × ${results.quantity.calculation.daysSupply}`;
		doc.text(`Formula: ${formula}`, margin, yPosition);
		yPosition += 15;

		// Recommended NDC Section
		checkPageBreak(50);
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('Recommended NDC', margin, yPosition);
		yPosition += 10;

		doc.setFontSize(12);
		doc.setFont('helvetica', 'normal');
		doc.text(`NDC Code: ${results.recommendedNdc.ndc}`, margin, yPosition);
		yPosition += 7;

		if (results.recommendedNdc.packageDescription) {
			doc.text(`Package: ${results.recommendedNdc.packageDescription}`, margin, yPosition);
			yPosition += 7;
		}

		doc.text(`Package Size: ${results.recommendedNdc.packageSize}`, margin, yPosition);
		yPosition += 7;

		if (results.recommendedNdc.packageCount) {
			doc.text(`Package Count: ${results.recommendedNdc.packageCount}`, margin, yPosition);
			yPosition += 7;
		}

		doc.text(`Total Quantity: ${results.recommendedNdc.totalQuantity}`, margin, yPosition);
		yPosition += 7;

		if (results.recommendedNdc.manufacturer) {
			doc.text(`Manufacturer: ${results.recommendedNdc.manufacturer}`, margin, yPosition);
			yPosition += 7;
		}

		if (results.recommendedNdc.overfill > 0) {
			doc.setFont('helvetica', 'italic');
			doc.text(`Overfill: ${results.recommendedNdc.overfill} ${results.quantity.unit}`, margin, yPosition);
			doc.setFont('helvetica', 'normal');
			yPosition += 7;
		}

		if (results.recommendedNdc.underfill > 0) {
			doc.setFont('helvetica', 'italic');
			doc.text(`Underfill: ${results.recommendedNdc.underfill} ${results.quantity.unit}`, margin, yPosition);
			doc.setFont('helvetica', 'normal');
			yPosition += 7;
		}

		yPosition += 10;

		// Alternative NDCs Section
		if (results.alternatives && results.alternatives.length > 0) {
			checkPageBreak(30 + results.alternatives.length * 20);
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text(`Alternative NDCs (${results.alternatives.length})`, margin, yPosition);
			yPosition += 10;

			doc.setFontSize(11);
			doc.setFont('helvetica', 'normal');
			for (let i = 0; i < results.alternatives.length; i++) {
				const alt = results.alternatives[i];
				checkPageBreak(25);
				doc.text(`${i + 1}. NDC: ${alt.ndc}`, margin, yPosition);
				yPosition += 6;

				if (alt.packageDescription) {
					const description = doc.splitTextToSize(alt.packageDescription, pageWidth - margin * 2);
					doc.text(description, margin + 5, yPosition);
					yPosition += description.length * 6;
				}

				doc.text(
					`   Package Size: ${alt.packageSize} | Total: ${alt.totalQuantity} ${results.quantity.unit}`,
					margin + 5,
					yPosition
				);
				yPosition += 8;
			}
			yPosition += 10;
		}

		// Warnings Section
		if (results.warnings && results.warnings.length > 0) {
			checkPageBreak(30 + results.warnings.length * 15);
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('Warnings', margin, yPosition);
			yPosition += 10;

			doc.setFontSize(11);
			doc.setFont('helvetica', 'normal');
			for (const warning of results.warnings) {
				checkPageBreak(20);
				doc.setFont('helvetica', 'bold');
				doc.text(`${warning.severity.toUpperCase()}:`, margin, yPosition);
				doc.setFont('helvetica', 'normal');
				yPosition += 6;

				const message = doc.splitTextToSize(warning.message, pageWidth - margin * 2);
				doc.text(message, margin + 5, yPosition);
				yPosition += message.length * 6 + 5;
			}
			yPosition += 10;
		}

		// Inactive NDCs Section
		if (results.inactiveNdcs && results.inactiveNdcs.length > 0) {
			checkPageBreak(30);
			doc.setFontSize(14);
			doc.setFont('helvetica', 'bold');
			doc.text('Inactive NDCs', margin, yPosition);
			yPosition += 10;

			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			doc.text(
				`Note: ${results.inactiveNdcs.length} inactive NDC(s) were found but excluded from recommendations.`,
				margin,
				yPosition
			);
		}

		// Generate filename - sanitize to avoid invalid characters
		const sanitizedName = results.drug.name.replace(/[^a-zA-Z0-9_-]/g, '_');
		const filename = `NDC_Calculation_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;

		// Save the PDF
		doc.save(filename);
	} catch (error) {
		console.error('Error generating PDF:', error);
		// Show user-friendly error message
		if (typeof window !== 'undefined') {
			alert('Failed to generate PDF. Please try again or contact support if the issue persists.');
		}
		throw error;
	}
}

